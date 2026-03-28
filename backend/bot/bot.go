package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"magazin-backend/database"
	"magazin-backend/models"
)

// TelegramBot manages the Telegram bot
type TelegramBot struct {
	Token   string
	AdminID int64 // Telegram user ID of the admin
	BaseURL string
}

// Update represents a Telegram update
type Update struct {
	UpdateID int      `json:"update_id"`
	Message  *Message `json:"message"`
	CallbackQuery *CallbackQuery `json:"callback_query"`
}

// Message represents a Telegram message
type Message struct {
	MessageID int    `json:"message_id"`
	From      *User  `json:"from"`
	Chat      *Chat  `json:"chat"`
	Text      string `json:"text"`
	Photo     []PhotoSize `json:"photo"`
	Caption   string `json:"caption"`
}

// CallbackQuery represents a callback query
type CallbackQuery struct {
	ID      string   `json:"id"`
	From    *User    `json:"from"`
	Message *Message `json:"message"`
	Data    string   `json:"data"`
}

// User represents a Telegram user
type User struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}

// Chat represents a Telegram chat
type Chat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

// PhotoSize represents a Telegram photo
type PhotoSize struct {
	FileID   string `json:"file_id"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileSize int    `json:"file_size"`
}

// State management for multi-step product creation
var userStates = make(map[int64]*ProductCreationState)

type ProductCreationState struct {
	Step        string
	Product     models.Product
	WaitingFor  string
}

// NewBot creates a new Telegram bot
func NewBot(token string, adminID int64) *TelegramBot {
	return &TelegramBot{
		Token:   token,
		AdminID: adminID,
		BaseURL: fmt.Sprintf("https://api.telegram.org/bot%s", token),
	}
}

// Start begins polling for updates
func (b *TelegramBot) Start() {
	log.Println("🤖 Telegram bot started...")
	offset := 0

	for {
		updates, err := b.getUpdates(offset)
		if err != nil {
			log.Printf("Error getting updates: %v", err)
			time.Sleep(3 * time.Second)
			continue
		}

		for _, update := range updates {
			offset = update.UpdateID + 1
			go b.handleUpdate(update)
		}

		time.Sleep(1 * time.Second)
	}
}

func (b *TelegramBot) getUpdates(offset int) ([]Update, error) {
	resp, err := http.Get(fmt.Sprintf("%s/getUpdates?offset=%d&timeout=30", b.BaseURL, offset))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool     `json:"ok"`
		Result []Update `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Result, nil
}

func (b *TelegramBot) handleUpdate(update Update) {
	if update.CallbackQuery != nil {
		b.handleCallback(update.CallbackQuery)
		return
	}

	if update.Message == nil {
		return
	}

	chatID := update.Message.Chat.ID
	userID := update.Message.From.ID

	// Check if user is admin
	if userID != b.AdminID {
		b.sendMessage(chatID, "⛔ Siz admin emassiz. Bu bot faqat admin uchun ishlaydi.")
		return
	}

	// Check if we're in a multi-step state
	if state, ok := userStates[userID]; ok {
		b.handleStateInput(chatID, userID, update.Message, state)
		return
	}

	text := update.Message.Text

	switch {
	case text == "/start":
		b.sendMainMenu(chatID)
	case text == "/help":
		b.sendHelp(chatID)
	case text == "/products" || text == "📦 Mahsulotlar":
		b.sendProductList(chatID)
	case text == "/add" || text == "➕ Yangi mahsulot":
		b.startAddProduct(chatID, userID)
	case text == "🏠 Bosh sahifa":
		b.sendMainMenu(chatID)
	case strings.HasPrefix(text, "/delete_"):
		b.handleDelete(chatID, text)
	case strings.HasPrefix(text, "/view_"):
		b.handleView(chatID, text)
	default:
		b.sendMessage(chatID, "❓ Noma'lum buyruq. /help ni bosing.")
	}
}

func (b *TelegramBot) sendMainMenu(chatID int64) {
	keyboard := map[string]interface{}{
		"keyboard": [][]map[string]string{
			{{"text": "📦 Mahsulotlar"}, {"text": "➕ Yangi mahsulot"}},
			{{"text": "📊 Statistika"}, {"text": "❓ Yordam"}},
		},
		"resize_keyboard": true,
	}

	b.sendMessageWithKeyboard(chatID, "🏪 *Magazin Bot - Bosh Sahifa*\n\nQuyidagi tugmalardan birini tanlang:", keyboard)
}

func (b *TelegramBot) sendHelp(chatID int64) {
	help := `🤖 *Magazin Bot Buyruqlari*

📦 /products - Barcha mahsulotlar ro'yxati
➕ /add - Yangi mahsulot qo'shish
🗑 /delete\_ID - Mahsulotni o'chirish (masalan: /delete_1)
👁 /view\_ID - Mahsulot tafsilotlari (masalan: /view_1)

📝 *Mahsulot qo'shish tartibi:*
1. /add buyrug'ini yuboring
2. Mahsulot nomini kiriting
3. Tavsifni kiriting
4. Narxni kiriting
5. Kategoriyani kiriting
6. Miqdorni kiriting
7. (Ixtiyoriy) Rasm yuboring`

	b.sendMessage(chatID, help)
}

func (b *TelegramBot) sendProductList(chatID int64) {
	products, err := database.GetAllProducts()
	if err != nil {
		b.sendMessage(chatID, "❌ Mahsulotlarni olishda xatolik yuz berdi")
		return
	}

	if len(products) == 0 {
		b.sendMessage(chatID, "📭 Hozircha mahsulotlar yo'q. /add buyrug'i bilan qo'shing.")
		return
	}

	msg := "📦 *Mahsulotlar ro'yxati:*\n\n"
	for _, p := range products {
		stock := "✅"
		if !p.InStock {
			stock = "❌"
		}
		msg += fmt.Sprintf("%s *%s*\n💰 %.2f so'm | 📁 %s | 📦 %d ta\n👁 /view\\_%d | 🗑 /delete\\_%d\n\n",
			stock, escapeMarkdown(p.Name), p.Price, p.Category, p.Quantity, p.ID, p.ID)
	}

	b.sendMessage(chatID, msg)
}

func (b *TelegramBot) startAddProduct(chatID int64, userID int64) {
	userStates[userID] = &ProductCreationState{
		Step:       "name",
		WaitingFor: "name",
		Product:    models.Product{InStock: true},
	}
	b.sendMessage(chatID, "➕ *Yangi mahsulot qo'shish*\n\n📝 Mahsulot nomini kiriting:")
}

func (b *TelegramBot) handleStateInput(chatID int64, userID int64, msg *Message, state *ProductCreationState) {
	text := msg.Text

	// Allow cancellation at any step
	if text == "/cancel" || text == "❌ Bekor qilish" {
		delete(userStates, userID)
		b.sendMessage(chatID, "❌ Mahsulot qo'shish bekor qilindi.")
		b.sendMainMenu(chatID)
		return
	}

	switch state.WaitingFor {
	case "name":
		state.Product.Name = text
		state.WaitingFor = "description"
		b.sendMessage(chatID, "📝 Mahsulot tavsifini kiriting (yoki /skip):")

	case "description":
		if text != "/skip" {
			state.Product.Description = text
		}
		state.WaitingFor = "price"
		b.sendMessage(chatID, "💰 Narxni kiriting (so'mda):")

	case "price":
		price, err := strconv.ParseFloat(text, 64)
		if err != nil {
			b.sendMessage(chatID, "❌ Noto'g'ri narx formati. Raqam kiriting:")
			return
		}
		state.Product.Price = price
		state.WaitingFor = "category"
		b.sendMessage(chatID, "📁 Kategoriyani kiriting (masalan: Elektronika, Kiyim, Oziq-ovqat):")

	case "category":
		state.Product.Category = text
		state.WaitingFor = "quantity"
		b.sendMessage(chatID, "📦 Miqdorni kiriting:")

	case "quantity":
		qty, err := strconv.Atoi(text)
		if err != nil {
			b.sendMessage(chatID, "❌ Noto'g'ri miqdor. Raqam kiriting:")
			return
		}
		state.Product.Quantity = qty
		state.WaitingFor = "image"
		b.sendMessage(chatID, "🖼 Rasm yuboring (yoki /skip):")

	case "image":
		if text == "/skip" {
			// Save product without image
			b.saveProduct(chatID, userID, state)
			return
		}

		// Check if message has a photo
		if len(msg.Photo) > 0 {
			// Download the photo
			photoID := msg.Photo[len(msg.Photo)-1].FileID
			imageURL, err := b.downloadPhoto(photoID)
			if err != nil {
				log.Printf("Error downloading photo: %v", err)
				b.sendMessage(chatID, "⚠️ Rasmni yuklab olishda xatolik. /skip bosing.")
				return
			}
			state.Product.ImageURL = imageURL
		}

		b.saveProduct(chatID, userID, state)
		return
	}
}

func (b *TelegramBot) saveProduct(chatID int64, userID int64, state *ProductCreationState) {
	id, err := database.CreateProduct(&state.Product)
	if err != nil {
		b.sendMessage(chatID, "❌ Mahsulotni saqlashda xatolik yuz berdi")
		delete(userStates, userID)
		return
	}

	delete(userStates, userID)

	msg := fmt.Sprintf("✅ *Mahsulot muvaffaqiyatli qo'shildi!*\n\n"+
		"🆔 ID: %d\n"+
		"📝 Nomi: %s\n"+
		"💰 Narxi: %.2f so'm\n"+
		"📁 Kategoriya: %s\n"+
		"📦 Miqdor: %d ta",
		id, escapeMarkdown(state.Product.Name), state.Product.Price,
		state.Product.Category, state.Product.Quantity)

	b.sendMessage(chatID, msg)
	b.sendMainMenu(chatID)
}

func (b *TelegramBot) handleDelete(chatID int64, text string) {
	idStr := strings.TrimPrefix(text, "/delete_")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		b.sendMessage(chatID, "❌ Noto'g'ri ID formati")
		return
	}

	product, err := database.GetProductByID(id)
	if err != nil {
		b.sendMessage(chatID, "❌ Mahsulot topilmadi")
		return
	}

	if err := database.DeleteProduct(id); err != nil {
		b.sendMessage(chatID, "❌ Mahsulotni o'chirishda xatolik")
		return
	}

	b.sendMessage(chatID, fmt.Sprintf("🗑 *%s* muvaffaqiyatli o'chirildi!", escapeMarkdown(product.Name)))
}

func (b *TelegramBot) handleView(chatID int64, text string) {
	idStr := strings.TrimPrefix(text, "/view_")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		b.sendMessage(chatID, "❌ Noto'g'ri ID formati")
		return
	}

	product, err := database.GetProductByID(id)
	if err != nil {
		b.sendMessage(chatID, "❌ Mahsulot topilmadi")
		return
	}

	stock := "✅ Mavjud"
	if !product.InStock {
		stock = "❌ Mavjud emas"
	}

	msg := fmt.Sprintf("📋 *Mahsulot tafsilotlari*\n\n"+
		"🆔 ID: %d\n"+
		"📝 Nomi: %s\n"+
		"📄 Tavsif: %s\n"+
		"💰 Narxi: %.2f so'm\n"+
		"📁 Kategoriya: %s\n"+
		"📦 Miqdor: %d ta\n"+
		"📊 Holati: %s\n"+
		"📅 Yaratilgan: %s\n\n"+
		"🗑 O'chirish: /delete\\_%d",
		product.ID, escapeMarkdown(product.Name), escapeMarkdown(product.Description),
		product.Price, product.Category, product.Quantity, stock,
		product.CreatedAt.Format("2006-01-02 15:04"), product.ID)

	b.sendMessage(chatID, msg)
}

func (b *TelegramBot) handleCallback(cb *CallbackQuery) {
	// Answer the callback query
	b.answerCallbackQuery(cb.ID)

	// Handle callback data
	chatID := cb.Message.Chat.ID
	data := cb.Data

	switch {
	case strings.HasPrefix(data, "delete_"):
		b.handleDelete(chatID, "/"+data)
	case strings.HasPrefix(data, "view_"):
		b.handleView(chatID, "/"+data)
	}
}

// Telegram API helpers

func (b *TelegramBot) sendMessage(chatID int64, text string) {
	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	}

	b.makeRequest("sendMessage", payload)
}

func (b *TelegramBot) sendMessageWithKeyboard(chatID int64, text string, keyboard interface{}) {
	payload := map[string]interface{}{
		"chat_id":      chatID,
		"text":         text,
		"parse_mode":   "Markdown",
		"reply_markup": keyboard,
	}

	b.makeRequest("sendMessage", payload)
}

func (b *TelegramBot) answerCallbackQuery(queryID string) {
	payload := map[string]interface{}{
		"callback_query_id": queryID,
	}
	b.makeRequest("answerCallbackQuery", payload)
}

func (b *TelegramBot) downloadPhoto(fileID string) (string, error) {
	// Get file path
	resp, err := http.Get(fmt.Sprintf("%s/getFile?file_id=%s", b.BaseURL, fileID))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// Download file
	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", b.Token, result.Result.FilePath)
	fileResp, err := http.Get(fileURL)
	if err != nil {
		return "", err
	}
	defer fileResp.Body.Close()

	// Save to uploads
	os.MkdirAll("uploads", 0755)
	ext := filepath.Ext(result.Result.FilePath)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("bot_%d%s", time.Now().UnixNano(), ext)
	fp := filepath.Join("uploads", filename)

	file, err := os.Create(fp)
	if err != nil {
		return "", err
	}
	defer file.Close()

	io.Copy(file, fileResp.Body)

	return "/uploads/" + filename, nil
}

func (b *TelegramBot) makeRequest(method string, payload interface{}) {
	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(
		fmt.Sprintf("%s/%s", b.BaseURL, method),
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		log.Printf("Telegram API error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Telegram API error response: %s", string(body))
	}
}

func escapeMarkdown(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"[", "\\[",
		"]", "\\]",
		"`", "\\`",
	)
	return replacer.Replace(text)
}