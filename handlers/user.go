package handlers

import (
	"booking-system/models"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

func UserHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	userID, ok := session.Values["user_id"].(string)
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	var user models.User
	err := models.DB.QueryRow("SELECT id, login, full_name, birth_date, gender FROM users WHERE id = $1", userID).
		Scan(&user.ID, &user.Login, &user.FullName, &user.BirthDate, &user.Gender)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows, err := models.DB.Query(`
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

	var bookingCount int
	models.DB.QueryRow("SELECT COUNT(*) FROM bookings WHERE user_id = $1", userID).Scan(&bookingCount)

	models.Tmpl.ExecuteTemplate(w, "user.html", map[string]interface{}{
		"User":         user,
		"Bookings":     bookings,
		"BookingCount": bookingCount,
	})
}

func UserCreateHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	models.Tmpl.ExecuteTemplate(w, "user_create.html", nil)
}

func ApiCreateUserHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
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

	if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
		http.Error(w, "Invalid request data", http.StatusBadRequest)
		return
	}

	if newUser.Login == "" || newUser.Password == "" || newUser.FullName == "" {
		http.Error(w, "Login, password and full name are required", http.StatusBadRequest)
		return
	}

	var exists bool
	err := models.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE login = $1)", newUser.Login).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "User with this login already exists", http.StatusConflict)
		return
	}

	if role == "manager" {
		newUser.Role = "user"
	} else if newUser.Role == "" {
		newUser.Role = "user"
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	userID := uuid.New()

	tx, err := models.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
        INSERT INTO users (id, login, password, full_name, birth_date, gender, role) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		userID, newUser.Login, string(hashedPassword), newUser.FullName,
		newUser.BirthDate, newUser.Gender, newUser.Role)
	if err != nil {
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

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

func ApiDeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || (role != "admin" && role != "manager") {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	userID := vars["id"]

	var userRole string
	err := models.DB.QueryRow("SELECT role FROM users WHERE id = $1", userID).Scan(&userRole)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if role == "manager" && userRole != "user" {
		http.Error(w, "Managers can only delete users", http.StatusForbidden)
		return
	}

	_, err = models.DB.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
