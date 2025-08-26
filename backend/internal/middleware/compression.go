package middleware

import (
	"compress/gzip"
	"io"
	"log"
	"net/http"
	"strings"
)

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
	headerWritten bool
}

func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.headerWritten {
		// Set the encoding header just before writing
		w.Header().Set("Content-Encoding", "gzip")
		w.headerWritten = true
	}
	return w.Writer.Write(b)
}

func (w *gzipResponseWriter) WriteHeader(statusCode int) {
	if !w.headerWritten {
		w.Header().Set("Content-Encoding", "gzip")
		w.headerWritten = true
	}
	w.ResponseWriter.WriteHeader(statusCode)
}

func CompressionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if client accepts gzip
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Create gzip writer
		gz := gzip.NewWriter(w)
		defer func() {
			if err := gz.Close(); err != nil {
				log.Printf("Error closing gzip writer: %v", err)
			}
		}()

		// Create our custom response writer
		gzipWriter := &gzipResponseWriter{
			Writer:         gz,
			ResponseWriter: w,
		}

		log.Printf("Applying gzip compression for %s", r.URL.Path)
		next.ServeHTTP(gzipWriter, r)
	})
}
