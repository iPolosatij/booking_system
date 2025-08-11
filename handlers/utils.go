package handlers

import (
	"booking-system/models"
	"log"
	"net/http"
	"strings"
)

func LoadSystemSettings() {
	row := models.DB.QueryRow("SELECT slot_duration_minutes, day_start_time, day_end_time FROM system_settings LIMIT 1")
	err := row.Scan(&models.SlotDuration, &models.DayStart, &models.DayEnd)
	if err != nil {
		log.Println("Using default system settings:", err)
	}
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Пропускаем проверку для /login и статики
		if r.URL.Path == "/login" || strings.HasPrefix(r.URL.Path, "/static/") {
			next.ServeHTTP(w, r)
			return
		}

		// Проверяем сессию для остальных маршрутов
		session, _ := models.Store.Get(r, "session")
		if _, ok := session.Values["user_id"]; !ok {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}
		next.ServeHTTP(w, r)
	})
}
