package auth

import (
	"context"
	"encoding/json"
	"errors"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"fmt"
	"google.golang.org/api/option"
	"log"
	"os"
	"strings"
)

var firebaseAuth *auth.Client

// FirebaseConfig represents the structure of the Firebase configuration JSON.
type FirebaseConfig struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
	universe_domain         string `json:universe_domain`
}

// CreateFirebaseConfig creates and writes a Firebase JSON configuration file
func CreateFirebaseConfig(filename string) error {
	config := FirebaseConfig{
		Type:                    os.Getenv("FIREBASE_TYPE"),
		ProjectID:               os.Getenv("FIREBASE_PROJECT_ID"),
		PrivateKeyID:            os.Getenv("FIREBASE_PRIVATE_KEY_ID"),
		PrivateKey:              os.Getenv("FIREBASE_PRIVATE_KEY"),
		ClientEmail:             os.Getenv("FIREBASE_CLIENT_EMAIL"),
		ClientID:                os.Getenv("FIREBASE_CLIENT_ID"),
		AuthURI:                 os.Getenv("FIREBASE_AUTH_URI"),
		TokenURI:                os.Getenv("FIREBASE_TOKEN_URI"),
		AuthProviderX509CertURL: os.Getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
		ClientX509CertURL:       os.Getenv("FIREBASE_CLIENT_X509_CERT_URL"),
		universe_domain:         os.Getenv("FIREBASE_UNIVERSE_DOMAIN"),
	}

	// Marshal the config struct to JSON format
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshalling Firebase config to JSON: %v", err)
	}

	// Write the JSON data to the file
	err = os.WriteFile(filename, data, 0644)
	if err != nil {
		return fmt.Errorf("error writing Firebase config to file: %v", err)
	}

	log.Printf("Firebase configuration written to %s", filename)
	return nil
}

// Initialize Firebase SDK with credentials
func InitFirebase() error {
	credentials := "firebase_keys.json" // Replace this with the relative path to your key file

	if os.Getenv("RAILWAY") == "true" {
		err := CreateFirebaseConfig(credentials)
		if err != nil {
			return fmt.Errorf("error creating Firebase config: %v", err)
		}
	}

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
