import Foundation

/// Open/closed status for a location on a given day (SPEC §2.1.4, §3.7).
/// Shared by Daily Items (status line, open-count subline) and Operation Hours.
enum OperatingHoursLogic {

    struct LocationStatus {
        enum Kind {
            case open      // green
            case closed    // red
        }
        let kind: Kind
        /// Rendered as "Status -- {text}" on Daily Items cards.
        let text: String

        var isOpen: Bool { kind == .open }
    }

    /// Intervals for `location` on `dateString` ("yyyy-MM-dd"), nil when closed/no data.
    static func intervals(
        in operatingTimes: [LocationOperatingTimes],
        location: DiningLocation,
        dateString: String
    ) -> [HourlyTimes]? {
        var record: LocationOperatingTimes?
        for alias in location.operatingTimesAliases {
            if let match = operatingTimes.first(where: { $0.name == alias }) {
                record = match
                break
            }
        }
        guard let record else { return nil }
        return intervals(inWeek: record.week, dateString: dateString)
    }

    /// Day resolution: match Date string first, fall back to weekday index (SPEC §2.3).
    static func intervals(inWeek week: [DailyOperatingTimes], dateString: String) -> [HourlyTimes]? {
        var day = week.first { $0.date == dateString }
        if day == nil, let date = CentralTime.date(from: dateString) {
            let weekday = CentralTime.calendar.component(.weekday, from: date) - 1  // 0=Sun
            day = week.first { $0.day == weekday }
        }
        guard let day, day.status.lowercased() != "closed", let hours = day.hours, !hours.isEmpty else {
            return nil
        }
        return hours
    }

    /// Live status text per SPEC §2.1.4. `dateString` is the day the intervals belong to.
    static func status(
        intervals: [HourlyTimes]?,
        dateString: String,
        now: Date = Date()
    ) -> LocationStatus {
        guard let intervals, !intervals.isEmpty,
              let dayStart = CentralTime.date(from: dateString) else {
            return LocationStatus(kind: .closed, text: "Closed")
        }

        var currentlyOpen = false
        var nextClose: Date?
        var nextOpen: Date?

        for interval in intervals {
            guard let start = CentralTime.calendar.date(
                bySettingHour: interval.startHour, minute: interval.startMinutes, second: 0, of: dayStart
            ), var end = CentralTime.calendar.date(
                bySettingHour: interval.endHour, minute: interval.endMinutes, second: 0, of: dayStart
            ) else { continue }
            if end <= start {
                end = CentralTime.calendar.date(byAdding: .day, value: 1, to: end) ?? end
            }
            if start <= now, now < end {
                currentlyOpen = true
                if nextClose == nil || end < nextClose! { nextClose = end }
            } else if now < start {
                if nextOpen == nil || start < nextOpen! { nextOpen = start }
            }
        }

        if currentlyOpen, let nextClose {
            let diffMins = Int(nextClose.timeIntervalSince(now) / 60)
            if diffMins < 60 {
                return LocationStatus(kind: .open, text: "Closes in \(diffMins) \(minuteWord(diffMins))")
            }
            return LocationStatus(kind: .open, text: "Open until \(timeString(nextClose))")
        }
        if let nextOpen {
            let diffMins = Int(nextOpen.timeIntervalSince(now) / 60)
            if diffMins < 60 {
                return LocationStatus(kind: .closed, text: "Opens in \(diffMins) \(minuteWord(diffMins))")
            }
            return LocationStatus(kind: .closed, text: "Closed until \(timeString(nextOpen))")
        }
        return LocationStatus(kind: .closed, text: "Closed")
    }

    /// Short names of dining commons currently open (drives "(N locations open)").
    static func openLocations(
        in operatingTimes: [LocationOperatingTimes],
        dateString: String,
        now: Date = Date()
    ) -> [String] {
        DiningLocation.allCases.compactMap { location in
            let ivals = intervals(in: operatingTimes, location: location, dateString: dateString)
            return status(intervals: ivals, dateString: dateString, now: now).isOpen
                ? location.rawValue
                : nil
        }
    }

    // MARK: - Formatting

    /// "h:mm AM/PM", no leading zero (e.g. "8:05 PM").
    static func timeString(_ date: Date) -> String {
        let df = DateFormatter()
        df.dateFormat = "h:mm a"
        df.timeZone = CentralTime.timeZone
        df.locale = Locale(identifier: "en_US_POSIX")
        return df.string(from: date)
    }

    /// "h:mmAM – h:mmPM" (no space before AM/PM) for the Hours screen's stacked cards.
    static func intervalString(_ interval: HourlyTimes) -> String {
        func fmt(_ hour: Int, _ minutes: Int) -> String {
            let suffix = hour >= 12 ? "PM" : "AM"
            var h = hour % 12
            if h == 0 { h = 12 }
            return String(format: "%d:%02d%@", h, minutes, suffix)
        }
        return "\(fmt(interval.startHour, interval.startMinutes)) – \(fmt(interval.endHour, interval.endMinutes))"
    }

    private static func minuteWord(_ count: Int) -> String {
        count == 1 ? "minute" : "minutes"
    }
}
