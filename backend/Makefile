.PHONY: test coverage local-scrape

test:
	@echo "Running all Go tests..."
	@go test ./...

coverage:
	@echo "Running tests with coverage report..."
	@mkdir -p coverage  # Ensure the coverage folder exists
	@go test ./... -coverprofile=coverage/coverage.out
	@go tool cover -html=coverage/coverage.out -o coverage/coverage.html
	@echo "Opening coverage report..."
	@open coverage/coverage.html  # On macOS

clean:
	@echo "Cleaning up..."
	@rm -rf coverage
	@echo "Done."

local-scrape:
	@echo "Running local scraper sync into configured POSTGRES_URL..."
	@go run ./cmd/local_scrape
