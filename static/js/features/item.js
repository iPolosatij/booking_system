/**
 * Управление объектами бронирования
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initItemManagement() {
    const addBtn = document.getElementById('add-item-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addItem();
        });
    }

    document.querySelectorAll('.item-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteItem(btn.getAttribute('data-id'));
        });
    });
}

async function addItem() {
    try {
        const name = document.getElementById('item-name').value;
        if (!name) throw new Error('Введите название');

        await apiRequest('/api/booking-items', 'POST', { name });
        showNotification('Объект создан', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка создания:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteItem(itemId) {
    if (!confirm('Удалить этот объект?')) return;

    try {
        await apiRequest(`/api/booking-items/${itemId}`, 'DELETE');
        showNotification('Объект удален', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification(error.message, 'error');
    }
}
