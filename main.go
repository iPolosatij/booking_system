package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var (
	db           *sql.DB
	store        = sessions.NewCookieStore([]byte("super-secret-key"))
	tmpl         *template.Template
	slotDuration = 60
	dayStart     = "08:00"
	dayEnd       = "22:00"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Login     string    `json:"login"`
	Password  string    `json:"-"`
	FullName  string    `json:"full_name"`
	BirthDate string    `json:"birth_date"`
	Gender    string    `json:"gender"`
	Role      string    `json:"role"`
}

type BookingItem struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type BookingSlot struct {
	ID          uuid.UUID `json:"id"`
	Date        string    `json:"date"`
	StartTime   string    `json:"start_time"`
	EndTime     string    `json:"end_time"`
	ItemID      uuid.UUID `json:"item_id"`
	IsAvailable bool      `json:"is_available"`
}

type Booking struct {
	ID        uuid.UUID   `json:"id"`
	UserID    uuid.UUID   `json:"user_id"`
	SlotID    uuid.UUID   `json:"slot_id"`
	CreatedAt string      `json:"created_at"`
	Slot      BookingSlot `json:"slot"`
	Item      BookingItem `json:"item"`
}

type SystemSettings struct {
	SlotDurationMinutes int    `json:"slot_duration_minutes"`
	DayStartTime        string `json:"day_start_time"`
	DayEndTime          string `json:"day_end_time"`
}

func initDB() {
	var err error
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	loadSystemSettings()
}

func loadSystemSettings() {
	row := db.QueryRow("SELECT slot_duration_minutes, day_start_time, day_end_time FROM system_settings LIMIT 1")
	err := row.Scan(&slotDuration, &dayStart, &dayEnd)
	if err != nil {
		log.Println("Using default system settings:", err)
	}
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := store.Get(r, "session")
		if _, ok := session.Values["user_id"]; !ok {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	initDB()
	defer db.Close()

	// Добавляем функцию sub для шаблонов
	tmpl = template.Must(template.New("").Funcs(template.FuncMap{
		"sub": func(a, b int) int { return a - b },
	}).ParseGlob("templates/*.html"))

	r := mux.NewRouter()

	// Static files
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Routes
	r.HandleFunc("/", indexHandler).Methods("GET")
	r.HandleFunc("/login", loginHandler).Methods("GET", "POST")
	r.HandleFunc("/logout", logoutHandler).Methods("GET")
	r.HandleFunc("/admin", adminHandler).Methods("GET")
	r.HandleFunc("/manager", managerHandler).Methods("GET")
	r.HandleFunc("/user", userHandler).Methods("GET")
	r.HandleFunc("/user/create", userCreateHandler).Methods("GET")

	// API routes
	r.HandleFunc("/api/login", apiLoginHandler).Methods("POST")
	r.HandleFunc("/api/users", apiCreateUserHandler).Methods("POST")
	r.HandleFunc("/api/users/{id}", apiDeleteUserHandler).Methods("DELETE")
	r.HandleFunc("/api/booking-items", apiCreateBookingItemHandler).Methods("POST")
	r.HandleFunc("/api/booking-items/{id}", apiDeleteBookingItemHandler).Methods("DELETE")
	r.HandleFunc("/api/booking-slots", apiGetAvailableSlotsHandler).Methods("GET")
	r.HandleFunc("/api/booking-slots/{id}/book", apiBookSlotHandler).Methods("POST")
	r.HandleFunc("/api/booking-slots/{id}/cancel", apiCancelBookingHandler).Methods("POST")
	r.HandleFunc("/api/booking-slots/{id}/block", apiBlockSlotHandler).Methods("POST")
	r.HandleFunc("/api/bookings", apiGetUserBookingsHandler).Methods("GET")
	r.HandleFunc("/api/available-dates", apiGetAvailableDatesHandler).Methods("GET")
	r.HandleFunc("/api/settings", apiUpdateSettingsHandler).Methods("POST")
	r.HandleFunc("/api/dates/{date}/availability", apiToggleDateAvailabilityHandler).Methods("POST")

	log.Println("Server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func generateTimeSlots() {
	// Эта функция может вызываться при изменении настроек системы
	// или по расписанию для генерации слотов на будущие даты
	// (реализация зависит от ваших требований)
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	if _, ok := session.Values["user_id"]; ok {
		http.Redirect(w, r, "/user", http.StatusSeeOther)
		return
	}
	tmpl.ExecuteTemplate(w, "index.html", nil)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		tmpl.ExecuteTemplate(w, "login.html", nil)
		return
	}

	login := r.FormValue("login")
	password := r.FormValue("password")

	var user User
	err := db.QueryRow("SELECT id, password, role FROM users WHERE login = $1", login).
		Scan(&user.ID, &user.Password, &user.Role)
	if err != nil {
		tmpl.ExecuteTemplate(w, "login.html", map[string]string{"Error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		tmpl.ExecuteTemplate(w, "login.html", map[string]string{"Error": "Invalid credentials"})
		return
	}

	// Создаем новую сессию (старую сбрасываем)
	session, _ := store.New(r, "session")
	session.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7, // 7 дней
		HttpOnly: true,
		Secure:   false, // Для разработки, на проде должно быть true
		SameSite: http.SameSiteLaxMode,
	}

	session.Values["user_id"] = user.ID.String()
	session.Values["role"] = user.Role

	if err := session.Save(r, w); err != nil {
		log.Printf("Failed to save session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Редирект в зависимости от роли
	switch user.Role {
	case "admin":
		http.Redirect(w, r, "/admin", http.StatusSeeOther)
	case "manager":
		http.Redirect(w, r, "/manager", http.StatusSeeOther)
	default:
		http.Redirect(w, r, "/user", http.StatusSeeOther)
	}
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	session.Values["user_id"] = ""
	session.Values["role"] = ""
	session.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Получаем список менеджеров
	rows, err := db.Query("SELECT id, login, full_name FROM users WHERE role = 'manager'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var managers []User
	for rows.Next() {
		var m User
		rows.Scan(&m.ID, &m.Login, &m.FullName)
		managers = append(managers, m)
	}

	// Получаем список элементов бронирования
	rows, err = db.Query("SELECT id, name FROM booking_items")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []BookingItem
	for rows.Next() {
		var i BookingItem
		rows.Scan(&i.ID, &i.Name)
		items = append(items, i)
	}

	// Получаем настройки системы
	var settings SystemSettings
	db.QueryRow("SELECT slot_duration_minutes, day_start_time, day_end_time FROM system_settings LIMIT 1").
		Scan(&settings.SlotDurationMinutes, &settings.DayStartTime, &settings.DayEndTime)

	tmpl.ExecuteTemplate(w, "admin.html", map[string]interface{}{
		"Managers": managers,
		"Items":    items,
		"Settings": settings,
	})
}

func managerHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "manager" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Получаем список пользователей
	rows, err := db.Query("SELECT id, login, full_name, birth_date, gender FROM users WHERE role = 'user'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Login, &u.FullName, &u.BirthDate, &u.Gender)
		users = append(users, u)
	}

	// Получаем доступные даты (7 дней вперед)
	start := time.Now()
	end := start.AddDate(0, 0, 7)
	rows, err = db.Query("SELECT DISTINCT date FROM booking_slots WHERE date BETWEEN $1 AND $2 AND is_available = true ORDER BY date", start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var dates []string
	for rows.Next() {
		var date string
		rows.Scan(&date)
		dates = append(dates, date)
	}

	// Получаем элементы бронирования
	rows, err = db.Query("SELECT id, name FROM booking_items")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []BookingItem
	for rows.Next() {
		var i BookingItem
		rows.Scan(&i.ID, &i.Name)
		items = append(items, i)
	}

	tmpl.ExecuteTemplate(w, "manager.html", map[string]interface{}{
		"Users":          users,
		"AvailableDates": dates,
		"Items":          items,
	})
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	// Получаем информацию о пользователе
	var user User
	err := db.QueryRow("SELECT id, login, full_name, birth_date, gender FROM users WHERE id = $1", userID).
		Scan(&user.ID, &user.Login, &user.FullName, &user.BirthDate, &user.Gender)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Получаем бронирования пользователя
	rows, err := db.Query(`
		SELECT b.id, b.created_at, bs.date, bs.start_time, bs.end_time, bi.name 
		FROM bookings b
		JOIN booking_slots bs ON b.slot_id = bs.id
		JOIN booking_items bi ON bs.item_id = bi.id
		WHERE b.user_id = $1
		ORDER BY bs.date, bs.start_time
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type BookingView struct {
		ID        string
		CreatedAt string
		Date      string
		StartTime string
		EndTime   string
		ItemName  string
	}

	var bookings []BookingView
	for rows.Next() {
		var b BookingView
		rows.Scan(&b.ID, &b.CreatedAt, &b.Date, &b.StartTime, &b.EndTime, &b.ItemName)
		bookings = append(bookings, b)
	}

	// Считаем количество бронирований
	var bookingCount int
	db.QueryRow("SELECT COUNT(*) FROM bookings WHERE user_id = $1", userID).Scan(&bookingCount)

	tmpl.ExecuteTemplate(w, "user.html", map[string]interface{}{
		"User":         user,
		"Bookings":     bookings,
		"BookingCount": bookingCount,
	})
}

// API Handlers
func apiLoginHandler(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var user User
	err := db.QueryRow("SELECT id, password, role FROM users WHERE login = $1", creds.Login).
		Scan(&user.ID, &user.Password, &user.Role)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	session, _ := store.Get(r, "session")
	session.Values["user_id"] = user.ID.String()
	session.Values["role"] = user.Role
	session.Save(r, w)

	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"role":   user.Role,
	})
}

func apiCreateUserHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var newUser struct {
		Login     string `json:"login"`
		Password  string `json:"password"`
		FullName  string `json:"full_name"`
		BirthDate string `json:"birth_date"`
		Gender    string `json:"gender"`
		Role      string `json:"role"`
	}

	// Добавляем логирование тела запроса
	body, _ := io.ReadAll(r.Body)
	log.Printf("Received create user request: %s", string(body))
	r.Body = io.NopCloser(bytes.NewBuffer(body)) // Восстанавливаем тело для повторного чтения

	if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
		log.Printf("Error decoding user data: %v", err)
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	// Валидация данных
	if newUser.Login == "" || newUser.Password == "" || newUser.FullName == "" {
		log.Printf("Validation failed: missing required fields")
		http.Error(w, "Login, password and full name are required", http.StatusBadRequest)
		return
	}

	// Проверяем, не существует ли уже пользователь с таким логином
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE login = $1)", newUser.Login).Scan(&exists)
	if err != nil {
		log.Printf("Error checking user existence: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		log.Printf("User with login %s already exists", newUser.Login)
		http.Error(w, "User with this login already exists", http.StatusConflict)
		return
	}

	// Менеджеры могут создавать только пользователей
	if role == "manager" {
		newUser.Role = "user" // Принудительно устанавливаем роль user для менеджеров
	} else if newUser.Role == "" {
		newUser.Role = "user" // Значение по умолчанию
	}

	// Хешируем пароль
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	// Генерируем UUID для нового пользователя
	userID := uuid.New()

	// Добавляем транзакцию для надежности
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Вставляем пользователя
	_, err = tx.Exec(`
        INSERT INTO users (id, login, password, full_name, birth_date, gender, role) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		userID, newUser.Login, string(hashedPassword), newUser.FullName,
		newUser.BirthDate, newUser.Gender, newUser.Role)
	if err != nil {
		log.Printf("Error inserting user: %v", err)
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	// Фиксируем транзакцию
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully created user %s with ID %s", newUser.Login, userID)

	// Возвращаем успешный ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"user": map[string]interface{}{
			"id":        userID,
			"login":     newUser.Login,
			"full_name": newUser.FullName,
			"role":      newUser.Role,
		},
	})
}

func apiDeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	userID := vars["id"]

	// Проверяем роль удаляемого пользователя
	var userRole string
	err := db.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Менеджеры могут удалять только пользователей
	if role == "manager" && userRole != "user" {
		http.Error(w, "Managers can only delete users", http.StatusForbidden)
		return
	}

	_, err = db.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func apiCreateBookingItemHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var item struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec("INSERT INTO booking_items (name) VALUES ($1)", item.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func apiDeleteBookingItemHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemID := vars["id"]

	_, err := db.Exec("DELETE FROM booking_items WHERE id = $1", itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func apiGetAvailableDatesHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	end := start.AddDate(0, 0, 7) // 7 дней вперед

	rows, err := db.Query(`
		SELECT DISTINCT date 
		FROM booking_slots 
		WHERE date BETWEEN $1 AND $2 AND is_available = true 
		ORDER BY date
	`, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var dates []string
	for rows.Next() {
		var date string
		rows.Scan(&date)
		dates = append(dates, date)
	}

	json.NewEncoder(w).Encode(dates)
}

func apiGetAvailableSlotsHandler(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	itemID := r.URL.Query().Get("item_id")

	rows, err := db.Query(`
		SELECT id, date, start_time, end_time, item_id, is_available
		FROM booking_slots
		WHERE date = $1 AND item_id = $2 AND is_available = true
		ORDER BY start_time
	`, date, itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var slots []BookingSlot
	for rows.Next() {
		var slot BookingSlot
		rows.Scan(&slot.ID, &slot.Date, &slot.StartTime, &slot.EndTime, &slot.ItemID, &slot.IsAvailable)
		slots = append(slots, slot)
	}

	json.NewEncoder(w).Encode(slots)
}

func apiBookSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	slotID := vars["id"]

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Проверяем доступность слота
	var isAvailable bool
	err = tx.QueryRow("SELECT is_available FROM booking_slots WHERE id = $1 FOR UPDATE", slotID).
		Scan(&isAvailable)
	if err != nil {
		http.Error(w, "Slot not found", http.StatusNotFound)
		return
	}

	if !isAvailable {
		http.Error(w, "Slot is not available", http.StatusConflict)
		return
	}

	// Проверяем лимит бронирований
	var bookingCount int
	err = tx.QueryRow("SELECT COUNT(*) FROM bookings WHERE user_id = $1", userID).
		Scan(&bookingCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if bookingCount >= 3 {
		http.Error(w, "Booking limit reached", http.StatusForbidden)
		return
	}

	// Создаем бронирование
	_, err = tx.Exec("INSERT INTO bookings (user_id, slot_id) VALUES ($1, $2)", userID, slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Помечаем слот как занятый
	_, err = tx.Exec("UPDATE booking_slots SET is_available = false WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func apiCancelBookingHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	bookingID := vars["id"]

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Получаем slot_id для этого бронирования
	var slotID string
	err = tx.QueryRow(`
		SELECT slot_id FROM bookings 
		WHERE id = $1 AND user_id = $2
	`, bookingID, userID).Scan(&slotID)
	if err != nil {
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	// Удаляем бронирование
	_, err = tx.Exec("DELETE FROM bookings WHERE id = $1", bookingID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Освобождаем слот
	_, err = tx.Exec("UPDATE booking_slots SET is_available = true WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func apiBlockSlotHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	slotID := vars["id"]

	_, err := db.Exec("UPDATE booking_slots SET is_available = false WHERE id = $1", slotID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func apiGetUserBookingsHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	rows, err := db.Query(`
		SELECT b.id, b.created_at, bs.date, bs.start_time, bs.end_time, bi.name 
		FROM bookings b
		JOIN booking_slots bs ON b.slot_id = bs.id
		JOIN booking_items bi ON bs.item_id = bi.id
		WHERE b.user_id = $1
		ORDER BY bs.date, bs.start_time
	`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var bookings []map[string]interface{}
	for rows.Next() {
		var b struct {
			ID        string
			CreatedAt string
			Date      string
			StartTime string
			EndTime   string
			ItemName  string
		}
		rows.Scan(&b.ID, &b.CreatedAt, &b.Date, &b.StartTime, &b.EndTime, &b.ItemName)
		bookings = append(bookings, map[string]interface{}{
			"id":         b.ID,
			"created_at": b.CreatedAt,
			"date":       b.Date,
			"start_time": b.StartTime,
			"end_time":   b.EndTime,
			"item_name":  b.ItemName,
		})
	}

	json.NewEncoder(w).Encode(bookings)
}

func apiUpdateSettingsHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var settings struct {
		SlotDurationMinutes int    `json:"slot_duration_minutes"`
		DayStartTime        string `json:"day_start_time"`
		DayEndTime          string `json:"day_end_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
		UPDATE system_settings 
		SET slot_duration_minutes = $1, 
		    day_start_time = $2, 
		    day_end_time = $3
	`, settings.SlotDurationMinutes, settings.DayStartTime, settings.DayEndTime)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Обновляем глобальные переменные
	slotDuration = settings.SlotDurationMinutes
	dayStart = settings.DayStartTime
	dayEnd = settings.DayEndTime

	w.WriteHeader(http.StatusOK)
}

func apiToggleDateAvailabilityHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	date := vars["date"]

	var req struct {
		Action string `json:"action"` // "enable" или "disable"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	isAvailable := req.Action == "enable"
	_, err := db.Exec("UPDATE booking_slots SET is_available = $1 WHERE date = $2", isAvailable, date)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func userCreateHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	tmpl.ExecuteTemplate(w, "user_create.html", nil)
}
