/**
 * Управление датами
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initDateManagement() {
    document.querySelectorAll('.toggle-date-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const date = btn.getAttribute('data-date');
            const action = btn.textContent === 'Disable' ? 'disable' : 'enable';
            await toggleDateAvailability(date, action, btn);
        });
    });
}

export async function toggleDateAvailability(date, action, button) {
    try {
        await apiRequest(`/api/dates/${date}/availability`, 'POST', { action });
        button.textContent = action === 'disable' ? 'Enable' : 'Disable';
        showNotification(`Дата ${date} ${action === 'disable' ? 'отключена' : 'включена'}`, 'success');
    } catch (error) {
        console.error('Ошибка изменения:', error);
        showNotification(error.message, 'error');
    }
}
