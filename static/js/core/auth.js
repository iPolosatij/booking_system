/**
 * Функции аутентификации
 */

import { apiRequest } from './api.js';
import { showNotification } from './notifications.js';

export function initLogout() {
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await apiRequest('/logout', 'GET');
                window.location.href = '/login';
            } catch (error) {
                console.error('Ошибка выхода:', error);
                window.location.href = '/login';
            }
        });
    }
}
