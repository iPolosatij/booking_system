/**
 * Управление слотами бронирования
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initSlotManagement() {
    document.querySelectorAll('.item-list li').forEach(item => {
        item.addEventListener('click', async () => {
            await loadAvailableSlots(item.getAttribute('data-item-id'));
        });
    });
}

async function loadAvailableSlots(itemId) {
    try {
        const date = new Date().toISOString().split('T')[0];
        const slots = await apiRequest(`/api/booking-slots?date=${date}&item_id=${itemId}`, 'GET');
        renderSlots(slots);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification(error.message, 'error');
    }
}

function renderSlots(slots) {
    const container = document.getElementById('slot-list-container');
    container.innerHTML = slots.length ? '' : '<p>Нет доступных слотов</p>';

    const list = document.createElement('ul');
    list.className = 'slot-list';

    slots.forEach(slot => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${slot.start_time} - ${slot.end_time}</span>
            <button class="book-btn" data-slot-id="${slot.id}">Забронировать</button>
            <button class="block-btn" data-slot-id="${slot.id}">Заблокировать</button>
        `;
        list.appendChild(li);
    });

    container.appendChild(list);

    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await bookSlot(btn.getAttribute('data-slot-id'));
        });
    });

    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await blockSlot(btn.getAttribute('data-slot-id'));
        });
    });
}

async function bookSlot(slotId) {
    try {
        await apiRequest(`/api/booking-slots/${slotId}/book`, 'POST');
        showNotification('Слот забронирован', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка бронирования:', error);
        showNotification(error.message, 'error');
    }
}

async function blockSlot(slotId) {
    try {
        await apiRequest(`/api/booking-slots/${slotId}/block`, 'POST');
        showNotification('Слот заблокирован', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка блокировки:', error);
        showNotification(error.message, 'error');
    }
}
