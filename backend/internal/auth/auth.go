package auth

import (
	"context"
	"errors"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"fmt"
	"google.golang.org/api/option"
	"strings"
)

var firebaseAuth *auth.Client

// Initialize Firebase SDK with credentials
func InitFirebase() error {
	credentials := "firebase_keys.json" // Replace this with the relative path to your key file
	opt := option.WithCredentialsFile(credentials)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing Firebase app: %v", err)
	}

	// Get an auth client from the Firebase app
	firebaseAuth, err = app.Auth(context.Background())
	if err != nil {
		return fmt.Errorf("error getting Firebase auth client: %v", err)
	}

	return nil
}

// VerifyIDToken verifies a Firebase ID token and returns the decoded token.
func VerifyIDToken(authHeader string) (*auth.Token, error) {
	if authHeader == "" {
		return nil, errors.New("missing Authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return nil, errors.New("invalid Authorization header format")
	}

	idToken := parts[1]
	token, err := firebaseAuth.VerifyIDToken(context.Background(), idToken)
	if err != nil {
		fmt.Println("Error verifying ID token:", err)
		return nil, errors.New("invalid token")
	}
	return token, nil
}
