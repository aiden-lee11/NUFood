// Package push builds and delivers meal-time favorite notifications over FCM.
package push

import (
	"backend/internal/models"
	"fmt"
	"sort"
	"strings"
)

// bodyHardMax is the absolute ceiling on a notification body. Bodies are built
// to read well under this; it exists as a final guard so an unexpectedly long
// location name can never produce an oversized payload.
const bodyHardMax = 178

// bodyFallbackThreshold is the length past which the grouped 3+ body is dropped
// in favor of the terse "coming up at" fallback.
const bodyFallbackThreshold = 150

// locationGroup holds the deduped favorite names available at one location,
// used to rank locations by how many favorites they carry.
type locationGroup struct {
	location string
	count    int
}

// BuildNotification renders the notification title and body for a meal from the
// user's matching favorite items. It dedupes items that repeat across stations
// and scales the phrasing to the number of distinct favorites. It returns empty
// strings when there are no items so callers skip the send.
func BuildNotification(meal string, items []models.DailyItem) (title, body string) {
	deduped := dedupeItems(items)
	if len(deduped) == 0 {
		return "", ""
	}

	title = fmt.Sprintf("%s favorites", meal)
	mealLower := strings.ToLower(meal)

	switch len(deduped) {
	case 1:
		body = fmt.Sprintf("%s is at %s for %s.", deduped[0].Name, deduped[0].Location, mealLower)
	case 2:
		first, second := deduped[0], deduped[1]
		if strings.EqualFold(first.Location, second.Location) {
			body = fmt.Sprintf("%s and %s at %s for %s.", first.Name, second.Name, first.Location, mealLower)
		} else {
			body = fmt.Sprintf("%s at %s and %s at %s for %s.", first.Name, first.Location, second.Name, second.Location, mealLower)
		}
	default:
		body = buildGroupedBody(deduped, mealLower)
	}

	if len(body) > bodyHardMax {
		body = strings.TrimSpace(body[:bodyHardMax])
	}
	return title, body
}

// dedupeItems drops repeats keyed on (case-insensitive name, case-insensitive
// location) so the same dish at several stations counts once, while preserving
// first-seen order for stable output.
func dedupeItems(items []models.DailyItem) []models.DailyItem {
	seen := make(map[string]struct{}, len(items))
	deduped := make([]models.DailyItem, 0, len(items))
	for _, item := range items {
		key := strings.ToLower(item.Name) + "\x00" + strings.ToLower(item.Location)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		deduped = append(deduped, item)
	}
	return deduped
}

// buildGroupedBody renders the 3+ favorites case: lead with the location that
// carries the most favorites, summarize the rest, and fall back to a terse
// listing if the full sentence runs long.
func buildGroupedBody(items []models.DailyItem, mealLower string) string {
	groups := groupByLocation(items)

	if len(groups) == 1 {
		return fmt.Sprintf("%d favorites at %s for %s — open NUFood to see them.",
			groups[0].count, groups[0].location, mealLower)
	}

	top := groups[0]
	others := groups[1:]
	var otherTotal int
	otherLocations := make([]string, 0, len(others))
	for _, g := range others {
		otherTotal += g.count
		otherLocations = append(otherLocations, g.location)
	}

	body := fmt.Sprintf("%d favorites at %s, plus %d more at %s — open NUFood to see them.",
		top.count, top.location, otherTotal, strings.Join(otherLocations, " & "))

	if len(body) <= bodyFallbackThreshold {
		return body
	}

	allLocations := make([]string, 0, len(groups))
	for _, g := range groups {
		allLocations = append(allLocations, g.location)
	}
	return fmt.Sprintf("%d favorites coming up at %s.", len(items), joinLocations(allLocations))
}

// groupByLocation collapses items to per-location counts sorted by count
// descending, breaking ties alphabetically for deterministic output.
func groupByLocation(items []models.DailyItem) []locationGroup {
	counts := make(map[string]int)
	order := make([]string, 0)
	for _, item := range items {
		if _, exists := counts[item.Location]; !exists {
			order = append(order, item.Location)
		}
		counts[item.Location]++
	}

	groups := make([]locationGroup, 0, len(order))
	for _, loc := range order {
		groups = append(groups, locationGroup{location: loc, count: counts[loc]})
	}

	sort.SliceStable(groups, func(i, j int) bool {
		if groups[i].count != groups[j].count {
			return groups[i].count > groups[j].count
		}
		return groups[i].location < groups[j].location
	})
	return groups
}

// joinLocations renders a human list: "A", "A & B", or "A, B & C".
func joinLocations(locations []string) string {
	switch len(locations) {
	case 0:
		return ""
	case 1:
		return locations[0]
	case 2:
		return locations[0] + " & " + locations[1]
	default:
		return strings.Join(locations[:len(locations)-1], ", ") + " & " + locations[len(locations)-1]
	}
}
