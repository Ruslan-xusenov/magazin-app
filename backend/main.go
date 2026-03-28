package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"magazin-backend/bot"
	"magazin-backend/database"
	"magazin-backend/handlers"
	"magazin-backend/middleware"
)

func main() {
	loadEnv(".env")

	port := getEnv("PORT", "8080")
	dbPath := getEnv("DB_PATH", "./magazin.db")
	botToken := getEnv("TELEGRAM_BOT_TOKEN", "")
	adminIDStr := getEnv("TELEGRAM_ADMIN_ID", "0")

	// Initialize secure database (hashes passwords, creates audit logs, checks expired tokens)
	database.InitDB(dbPath)

	if botToken != "" {
		adminID, _ := strconv.ParseInt(adminIDStr, 10, 64)
		telegramBot := bot.NewBot(botToken, adminID)
		go telegramBot.Start()
		log.Println("✅ Telegram bot ishga tushdi")
	} else {
		log.Println("⚠️  TELEGRAM_BOT_TOKEN sozlanmagan, bot ishga tushmadi")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.GetProducts(w, r)
		case "POST":
			middleware.AuthMiddleware(handlers.CreateProduct)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/products/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			handlers.GetProduct(w, r)
		case "PUT":
			middleware.AuthMiddleware(handlers.UpdateProduct)(w, r)
		case "DELETE":
			middleware.AuthMiddleware(handlers.DeleteProduct)(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.Login(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/check", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			middleware.AuthMiddleware(handlers.CheckAuth)(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/send-code", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.SendCode(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/verify-code", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.VerifyCode(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// User auth routes
	mux.HandleFunc("/api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.RegisterUser(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/verify-email", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.VerifyEmail(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/user-login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.UserLogin(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/social", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handlers.SocialAuth(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/auth/profile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			handlers.GetUserProfile(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"secure_ok","message":"Magazin API ishlamoqda"}`))
	})

	// 🔒 ULTIMATE SECURITY PIPELINE
	// Options execute progressively checking threats outside-in:
	// 1. Block too large payloads (DDoS)
	// 2. Reject fast spam requests (Brute force setup)
	// 3. Setup Secure headers (XSS/MIME/HSTS protection)
	// 4. Secure CORS configuration
	// 5. Force JSON format headers
	secureHandler := middleware.RequestSizeLimiter(
		middleware.RateLimitMiddleware(
			middleware.SecurityHeadersMiddleware(
				middleware.CORSMiddleware(
					middleware.JSONMiddleware(mux),
				),
			),
		),
	)

	fmt.Println(strings.Repeat("=", 50))
	fmt.Println("🏪 MAGAZIN BACKEND SERVER - SECURE MODE")
	fmt.Println(strings.Repeat("=", 50))
	fmt.Printf("🌐 Server: http://localhost:%s\n", port)
	fmt.Printf("📦 API: http://localhost:%s/api/products\n", port)
	fmt.Printf("🔐 Login: http://localhost:%s/api/auth/login\n", port)
	fmt.Printf("💾 Database: %s\n", dbPath)
	if botToken != "" {
		fmt.Println("🤖 Telegram Bot: Ishlamoqda")
	}
	fmt.Println("🛡️  Xavfsizlik yoqilgan: HSTS, CORS, Rate Limit, Password Hash (bcrypt), Audit")
	fmt.Println(strings.Repeat("=", 50))

	// In production, consider using http.ListenAndServeTLS if not behind Nginx
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      secureHandler,
		ReadTimeout:  10 * time.Second, // Drop slowloris attacks
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Fatal(server.ListenAndServe())
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func loadEnv(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if os.Getenv(key) == "" && value != "" {
			os.Setenv(key, value)
		}
	}
}
