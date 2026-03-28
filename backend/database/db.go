package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"

	"magazin-backend/models"
)

var DB *sql.DB

// InitDB initializes the SQLite database
func InitDB(dbPath string) {
	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	createTables()
	seedAdmin()
	log.Println("Database initialized successfully with security constraints")
}

func createTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			price REAL NOT NULL DEFAULT 0,
			image_url TEXT DEFAULT '',
			category TEXT DEFAULT '',
			in_stock BOOLEAN DEFAULT 1,
			quantity INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS admins (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			is_admin INTEGER DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS auth_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			admin_id INTEGER NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			ip_address TEXT DEFAULT '',
			user_agent TEXT DEFAULT '',
			FOREIGN KEY (admin_id) REFERENCES admins(id)
		)`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			admin_id INTEGER NOT NULL,
			action TEXT NOT NULL,
			details TEXT DEFAULT '',
			ip_address TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			first_name TEXT NOT NULL DEFAULT '',
			last_name TEXT NOT NULL DEFAULT '',
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT DEFAULT '',
			phone TEXT DEFAULT '',
			provider TEXT DEFAULT 'email',
			provider_id TEXT DEFAULT '',
			is_verified INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS email_verifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS user_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			ip_address TEXT DEFAULT '',
			user_agent TEXT DEFAULT '',
			FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}

	// Migration: Add is_admin column to admins if it doesn't exist
	_, _ = DB.Exec("ALTER TABLE admins ADD COLUMN is_admin INTEGER DEFAULT 0")
}

func seedAdmin() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM admins").Scan(&count)
	if count == 0 {
		// Default admin logic: admin / admin123
		hash, err := HashPassword("admin123")
		if err != nil {
			log.Fatal("Failed to hash default password")
		}

		_, err = DB.Exec("INSERT INTO admins (username, password_hash, is_admin) VALUES (?, ?, ?)", "admin", hash, 1)
		if err != nil {
			log.Fatal("Failed to seed admin:", err)
		}
		log.Println("Default admin created: admin / admin123 (CHANGE IN PRODUCTION!)")
	}
}

// Security & Password Handling
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12) // Cost 12 is secure yet fast enough
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Authentication Methods
func AuthenticateAdmin(username, password string) (*models.Admin, error) {
	var admin models.Admin
	err := DB.QueryRow("SELECT id, username, password_hash, is_admin FROM admins WHERE username = ?", username).
		Scan(&admin.ID, &admin.Username, &admin.PasswordHash, &admin.IsAdmin)

	if err != nil {
		// Prevent timing attacks by faking a hash check even if user doesn't exist
		CheckPasswordHash(password, "$2a$12$DUMMYHASHTHELENGTHWILLBETWENTYNINECHARACTERSMAXIMU")
		return nil, fmt.Errorf("invalid credentials")
	}

	if !CheckPasswordHash(password, admin.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	return &admin, nil
}

// Token Management
func SaveAuthToken(token *models.AuthToken) error {
	_, err := DB.Exec(
		"INSERT INTO auth_tokens (admin_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
		token.AdminID, token.Token, token.ExpiresAt, token.IPAddress, token.UserAgent,
	)
	return err
}

func ValidateToken(tokenStr string) (*models.Admin, error) {
	var admin models.Admin
	var expiresAt time.Time

	err := DB.QueryRow(`
		SELECT a.id, a.username, a.is_admin, t.expires_at 
		FROM auth_tokens t 
		JOIN admins a ON t.admin_id = a.id 
		WHERE t.token = ?`, tokenStr).
		Scan(&admin.ID, &admin.Username, &admin.IsAdmin, &expiresAt)

	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}

	if time.Now().After(expiresAt) {
		// Remove expired token
		DB.Exec("DELETE FROM auth_tokens WHERE token = ?", tokenStr)
		return nil, fmt.Errorf("token expired")
	}

	return &admin, nil
}

func RevokeToken(tokenStr string) error {
	_, err := DB.Exec("DELETE FROM auth_tokens WHERE token = ?", tokenStr)
	return err
}

// Audit Logging
func LogAction(adminID int, action, details, ip string) {
	_, err := DB.Exec(
		"INSERT INTO audit_logs (admin_id, action, details, ip_address) VALUES (?, ?, ?, ?)",
		adminID, action, details, ip,
	)
	if err != nil {
		log.Printf("Failed to log audit action: %v", err)
	}
}

// Product Operations (Unchanged query structure, but sanitized inputs handled by handlers)

func GetAllProducts() ([]models.Product, error) {
	rows, err := DB.Query("SELECT id, name, description, price, image_url, category, in_stock, quantity, created_at, updated_at FROM products ORDER BY id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.InStock, &p.Quantity, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

func GetProductByID(id int) (*models.Product, error) {
	var p models.Product
	err := DB.QueryRow("SELECT id, name, description, price, image_url, category, in_stock, quantity, created_at, updated_at FROM products WHERE id = ?", id).
		Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.InStock, &p.Quantity, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func CreateProduct(p *models.Product) (int64, error) {
	result, err := DB.Exec(
		"INSERT INTO products (name, description, price, image_url, category, in_stock, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
		p.Name, p.Description, p.Price, p.ImageURL, p.Category, p.InStock, p.Quantity,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func UpdateProduct(p *models.Product) error {
	_, err := DB.Exec(
		"UPDATE products SET name=?, description=?, price=?, image_url=?, category=?, in_stock=?, quantity=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
		p.Name, p.Description, p.Price, p.ImageURL, p.Category, p.InStock, p.Quantity, p.ID,
	)
	return err
}

func DeleteProduct(id int) error {
	_, err := DB.Exec("DELETE FROM products WHERE id = ?", id)
	return err
}

func GetProductsByCategory(category string) ([]models.Product, error) {
	rows, err := DB.Query("SELECT id, name, description, price, image_url, category, in_stock, quantity, created_at, updated_at FROM products WHERE category = ? ORDER BY id DESC", category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.InStock, &p.Quantity, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

func SearchProducts(query string) ([]models.Product, error) {
	rows, err := DB.Query("SELECT id, name, description, price, image_url, category, in_stock, quantity, created_at, updated_at FROM products WHERE name LIKE ? OR description LIKE ? ORDER BY id DESC", "%"+query+"%", "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.InStock, &p.Quantity, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

// ==================== USER OPERATIONS ====================

func CreateUser(user *models.User) (int64, error) {
	hash, err := HashPassword(user.PasswordHash)
	if err != nil && user.Provider == "email" {
		return 0, err
	}
	if user.Provider != "email" {
		hash = "SOCIAL_" + user.Provider
	}

	result, err := DB.Exec(
		`INSERT INTO users (first_name, last_name, email, password_hash, phone, provider, provider_id, is_verified) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.FirstName, user.LastName, user.Email, hash, user.Phone, user.Provider, user.ProviderID,
		user.IsVerified,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetUserByEmail(email string) (*models.User, error) {
	var u models.User
	var isVerified int
	err := DB.QueryRow(
		`SELECT id, first_name, last_name, email, password_hash, phone, provider, provider_id, is_verified, created_at 
		 FROM users WHERE email = ?`, email,
	).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.PasswordHash, &u.Phone, &u.Provider, &u.ProviderID, &isVerified, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsVerified = isVerified == 1
	return &u, nil
}

func GetUserByID(id int) (*models.User, error) {
	var u models.User
	var isVerified int
	err := DB.QueryRow(
		`SELECT id, first_name, last_name, email, password_hash, phone, provider, provider_id, is_verified, created_at 
		 FROM users WHERE id = ?`, id,
	).Scan(&u.ID, &u.FirstName, &u.LastName, &u.Email, &u.PasswordHash, &u.Phone, &u.Provider, &u.ProviderID, &isVerified, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	u.IsVerified = isVerified == 1
	return &u, nil
}

func VerifyUserEmail(email string) error {
	_, err := DB.Exec("UPDATE users SET is_verified = 1 WHERE email = ?", email)
	return err
}

func SaveVerificationCode(email, code string) error {
	// Remove old codes for this email
	DB.Exec("DELETE FROM email_verifications WHERE email = ?", email)
	_, err := DB.Exec(
		"INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)",
		email, code, time.Now().Add(10*time.Minute),
	)
	return err
}

func CheckVerificationCode(email, code string) bool {
	var storedCode string
	var expiresAt time.Time
	err := DB.QueryRow(
		"SELECT code, expires_at FROM email_verifications WHERE email = ? ORDER BY id DESC LIMIT 1",
		email,
	).Scan(&storedCode, &expiresAt)
	if err != nil {
		return false
	}
	if time.Now().After(expiresAt) {
		DB.Exec("DELETE FROM email_verifications WHERE email = ?", email)
		return false
	}
	if storedCode != code {
		return false
	}
	// Code matches, delete it
	DB.Exec("DELETE FROM email_verifications WHERE email = ?", email)
	return true
}

// User token management
func SaveUserToken(userID int, token string, expiresAt time.Time, ip, userAgent string) error {
	_, err := DB.Exec(
		"INSERT INTO user_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
		userID, token, expiresAt, ip, userAgent,
	)
	return err
}

func ValidateUserToken(tokenStr string) (*models.User, error) {
	var userID int
	var expiresAt time.Time

	err := DB.QueryRow(
		"SELECT user_id, expires_at FROM user_tokens WHERE token = ?", tokenStr,
	).Scan(&userID, &expiresAt)
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}
	if time.Now().After(expiresAt) {
		DB.Exec("DELETE FROM user_tokens WHERE token = ?", tokenStr)
		return nil, fmt.Errorf("token expired")
	}
	return GetUserByID(userID)
}
