package push

import (
	"backend/internal/auth"
	"context"
	"errors"
	"fmt"

	"firebase.google.com/go/v4/messaging"
)

// multicastLimit is the maximum number of tokens FCM accepts in a single
// SendEachForMulticast call. Larger token lists are chunked.
const multicastLimit = 500

var messagingClient *messaging.Client

// Init creates the FCM messaging client from the already-initialized Firebase
// app in the auth package. It must run after auth.InitFirebase.
func Init(ctx context.Context) error {
	app := auth.App()
	if app == nil {
		return errors.New("firebase app not initialized")
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return fmt.Errorf("error initializing FCM messaging client: %w", err)
	}
	messagingClient = client
	return nil
}

// Send pushes a notification with the given title and body to every token,
// chunking large token lists to stay within FCM's multicast limit. It returns
// the tokens FCM reported as unregistered or invalid so the caller can prune
// them from the database.
func Send(ctx context.Context, tokens []string, title, body string) (invalidTokens []string, err error) {
	if messagingClient == nil {
		return nil, errors.New("FCM messaging client not initialized")
	}
	if len(tokens) == 0 {
		return nil, nil
	}

	for start := 0; start < len(tokens); start += multicastLimit {
		end := min(start+multicastLimit, len(tokens))
		chunk := tokens[start:end]

		resp, sendErr := messagingClient.SendEachForMulticast(ctx, &messaging.MulticastMessage{
			Tokens: chunk,
			Notification: &messaging.Notification{
				Title: title,
				Body:  body,
			},
		})
		if sendErr != nil {
			return invalidTokens, fmt.Errorf("error sending multicast push: %w", sendErr)
		}

		for i, r := range resp.Responses {
			if r.Success || r.Error == nil {
				continue
			}
			if messaging.IsUnregistered(r.Error) || messaging.IsInvalidArgument(r.Error) {
				invalidTokens = append(invalidTokens, chunk[i])
			}
		}
	}

	return invalidTokens, nil
}
