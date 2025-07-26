/**
 * Управление менеджерами
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initManagerManagement() {
    const addBtn = document.getElementById('add-manager-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addManager();
        });
    }

    document.querySelectorAll('.manager-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteManager(btn.getAttribute('data-id'));
        });
    });
}

async function addManager() {
    try {
        const managerData = {
            login: document.getElementById('manager-login').value,
            password: document.getElementById('manager-password').value,
            full_name: 'New Manager',
            birth_date: '2000-01-01',
            gender: 'male',
            role: 'manager'
        };

        if (!managerData.login || !managerData.password) {
            throw new Error('Введите логин и пароль');
        }

        await apiRequest('/api/users', 'POST', managerData);
        showNotification('Менеджер создан', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка создания:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteManager(managerId) {
    if (!confirm('Удалить этого менеджера?')) return;

    try {
        await apiRequest(`/api/users/${managerId}`, 'DELETE');
        showNotification('Менеджер удален', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification(error.message, 'error');
    }
}
