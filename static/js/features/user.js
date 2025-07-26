/**
 * Управление пользователями
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initUserManagement() {
    const addBtn = document.getElementById('add-user-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addUser();
        });
    }

    document.querySelectorAll('.user-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteUser(btn.getAttribute('data-id'));
        });
    });
}

async function addUser() {
    try {
        const userData = {
            login: document.getElementById('user-login').value,
            password: document.getElementById('user-password').value,
            full_name: document.getElementById('user-fullname').value,
            birth_date: document.getElementById('user-birthdate').value || null,
            gender: document.getElementById('user-gender').value || 'male',
            role: 'user'
        };

        if (!userData.login || !userData.password || !userData.full_name) {
            throw new Error('Заполните все обязательные поля');
        }

        await apiRequest('/api/users', 'POST', userData);

        showNotification('Пользователь создан', 'success');
        location.reload();

    } catch (error) {
        console.error('Ошибка создания:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Удалить этого пользователя?')) return;

    try {
        await apiRequest(`/api/users/${userId}`, 'DELETE');
        showNotification('Пользователь удален', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification(error.message, 'error');
    }
}
