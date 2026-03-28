package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"golang.org/x/time/rate"

	"magazin-backend/database"
)

// SecurityHeadersMiddleware adds essential HTTP security headers
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strict-Transport-Security (HSTS) - enforce HTTPS
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Prevent MIME-sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Clickjacking protection
		w.Header().Set("X-Frame-Options", "DENY")

		// Cross-Site Scripting (XSS) Filter wrapper
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Content Security Policy
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'")

		// Referrer Policy
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		next.ServeHTTP(w, r)
	})
}

// CORSMiddleware handles CORS headers safely
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In production, you should set this to your exact frontend domain
		// Example: w.Header().Set("Access-Control-Allow-Origin", "https://your-domain.com")
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Max-Age", "86400") // Cache preflight requests for 24h

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Rate Limiting variables
var (
	clients = make(map[string]*rate.Limiter)
	mu      sync.Mutex
)

// getVisitorLimiter generates a token bucket rate limiter per IP address
func getVisitorLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := clients[ip]
	if !exists {
		// 5 requests per second max, burst of 10
		limiter = rate.NewLimiter(5, 10)
		clients[ip] = limiter
	}
	return limiter
}

// RateLimitMiddleware blocks too frequent requests (DDoS / Brute force protection)
func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := strings.Split(r.RemoteAddr, ":")[0]
		limiter := getVisitorLimiter(ip)

		if !limiter.Allow() {
			http.Error(w, `{"success":false,"message":"Too Many Requests"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequestSizeLimiter blocks massive payloads
func RequestSizeLimiter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Limit to 50 MB payload maximum
		var maxBytes int64 = 50 * 1024 * 1024
		r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
		next.ServeHTTP(w, r)
	})
}

// AuthMiddleware checks for a valid secure token and tracks sessions
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"success":false,"message":"Authorization header required"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, `{"success":false,"message":"Invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		token := parts[1]

		// Validate secure token in DB
		admin, err := database.ValidateToken(token)
		if err != nil {
			http.Error(w, `{"success":false,"message":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Strictly check for admin role
		if !admin.IsAdmin {
			http.Error(w, `{"success":false,"message":"Hizmatga faqat adminlar kirishi mumkin"}`, http.StatusForbidden)
			return
		}

		// Prevent token hijacking via IP mismatch checking (Optional but strict)
		// currentIP := strings.Split(r.RemoteAddr, ":")[0]
		// In a production scenario, you could verify currentIP against the token's original IP

		// Provide admin identity to context via headers (Internal use only, masked from outside)
		r.Header.Set("X-Internal-Admin-ID", strconv.Itoa(admin.ID))
		r.Header.Set("X-Internal-Admin-Username", admin.Username)

		next.ServeHTTP(w, r)
	}
}

// JSONMiddleware sets content type
func JSONMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

// Helper for cryptographic secure tokens
func GenerateSecureToken() (string, error) {
	b := make([]byte, 32) // 256-bit token
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
