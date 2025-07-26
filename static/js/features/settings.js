/**
 * Управление настройками системы
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initSettingsManagement() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
}

async function saveSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    const originalText = saveBtn.textContent;

    try {
        const duration = parseInt(document.getElementById('slot-duration').value);
        const startTime = document.getElementById('day-start').value;
        const endTime = document.getElementById('day-end').value;

        if (isNaN(duration)) throw new Error('Длительность должна быть числом');
        if (duration <= 0) throw new Error('Длительность должна быть положительной');
        if (!startTime || !endTime) throw new Error('Заполните все поля');

        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        const response = await apiRequest('/api/settings', 'POST', {
            slot_duration_minutes: duration,
            day_start_time: startTime,
            day_end_time: endTime
        });

        showNotification(response.message || 'Настройки сохранены', 'success');

    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}
