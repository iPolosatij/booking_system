package handlers

import (
	"booking-system/models"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func AdminHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	rows, err := models.DB.Query("SELECT id, login, full_name FROM users WHERE role = 'manager'")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var managers []models.User
	for rows.Next() {
		var m models.User
		rows.Scan(&m.ID, &m.Login, &m.FullName)
		managers = append(managers, m)
	}

	rows, err = models.DB.Query("SELECT id, name FROM booking_items")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []models.BookingItem
	for rows.Next() {
		var i models.BookingItem
		rows.Scan(&i.ID, &i.Name)
		items = append(items, i)
	}

	var settings models.SystemSettings
	models.DB.QueryRow("SELECT slot_duration_minutes, day_start_time, day_end_time FROM system_settings LIMIT 1").
		Scan(&settings.SlotDurationMinutes, &settings.DayStartTime, &settings.DayEndTime)

	models.Tmpl.ExecuteTemplate(w, "admin.html", map[string]interface{}{
		"Managers": managers,
		"Items":    items,
		"Settings": settings,
	})
}

func ApiCreateBookingItemHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var item struct {
		Name string `json:"name"`
	}

	// Добавляем проверку тела запроса
	if r.Body == nil {
		http.Error(w, `{"error":"Empty request body"}`, http.StatusBadRequest)
		return
	}

	defer r.Body.Close()

	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, `{"error":"Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Добавляем проверку имени
	if item.Name == "" {
		http.Error(w, `{"error":"Name is required"}`, http.StatusBadRequest)
		return
	}

	// Всегда устанавливаем Content-Type перед записью ответа
	w.Header().Set("Content-Type", "application/json")

	_, err := models.DB.Exec("INSERT INTO booking_items (name) VALUES ($1)", item.Name)
	if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, `{"error":"Database error"}`, http.StatusInternalServerError)
		return
	}

	// Возвращаем JSON-ответ
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Item created successfully",
	})
}

func ApiDeleteBookingItemHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemID := vars["id"]

	_, err := models.DB.Exec("DELETE FROM booking_items WHERE id = $1", itemID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func ApiUpdateSettingsHandler(w http.ResponseWriter, r *http.Request) {
	// Проверка аутентификации и прав
	session, _ := models.Store.Get(r, "session")
	role, ok := session.Values["role"].(string)
	if !ok || role != "admin" {
		respondWithJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	// Проверка метода запроса
	if r.Method != http.MethodPost {
		respondWithJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	// Проверка Content-Type
	if r.Header.Get("Content-Type") != "application/json" {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Content-Type must be application/json"})
		return
	}

	// Чтение и парсинг тела запроса
	var settings struct {
		SlotDurationMinutes int    `json:"slot_duration_minutes"`
		DayStartTime        string `json:"day_start_time"`
		DayEndTime          string `json:"day_end_time"`
	}

	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Валидация данных
	if settings.SlotDurationMinutes <= 0 {
		respondWithJSON(w, http.StatusBadRequest, map[string]string{"error": "Slot duration must be positive"})
		return
	}

	// Обновление в базе данных
	_, err := models.DB.Exec(`
        UPDATE system_settings 
        SET slot_duration_minutes = $1, 
            day_start_time = $2, 
            day_end_time = $3
    `, settings.SlotDurationMinutes, settings.DayStartTime, settings.DayEndTime)

	if err != nil {
		log.Printf("Database error: %v", err)
		respondWithJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database error"})
		return
	}

	// Обновление глобальных переменных
	models.SlotDuration = settings.SlotDurationMinutes
	models.DayStart = settings.DayStartTime
	models.DayEnd = settings.DayEndTime

	// Успешный ответ
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Settings updated successfully",
		"data": map[string]interface{}{
			"slot_duration_minutes": settings.SlotDurationMinutes,
			"day_start_time":        settings.DayStartTime,
			"day_end_time":          settings.DayEndTime,
		},
	})
}

// Вспомогательная функция для отправки JSON-ответов
func respondWithJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}
