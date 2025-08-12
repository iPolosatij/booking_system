/**
 * Управление бронированием слотов (для пользователей)
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initSlotManagement() {
    document.querySelectorAll('.item-list li').forEach(item => {
        item.addEventListener('click', async () => {
            const itemId = item.getAttribute('data-item-id');
            await loadAvailableSlots(itemId);
        });
    });
}

async function loadAvailableSlots(itemId) {
    try {
        const date = new Date().toISOString().split('T')[0];
        const slots = await apiRequest(`/api/booking-slots?date=${date}&item_id=${itemId}`, 'GET');
        renderSlots(Array.isArray(slots) ? slots : []);
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка загрузки слотов', 'error');
        renderSlots([]);
    }
}

function renderSlots(slots) {
    const container = document.getElementById('slot-list-container');
    if (!container) return;

    container.innerHTML = slots.length === 0 
        ? '<p class="no-slots">Нет доступных слотов</p>'
        : slots.map(slot => `
            <div class="slot-item">
                <span>${slot.start_time} - ${slot.end_time}</span>
                <button class="book-btn" data-slot-id="${slot.id}">Забронировать</button>
            </div>
        `).join('');

    setupEventHandlers();
}

function setupEventHandlers() {
    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await bookSlot(btn.getAttribute('data-slot-id'));
        });
    });
}

async function bookSlot(slotId) {
    if (!confirm('Подтвердить бронирование?')) return;
    try {
        await apiRequest(`/api/booking-slots/${slotId}/book`, 'POST');
        showNotification('Бронирование успешно', 'success');
        
        const activeItem = document.querySelector('.item-list li.active');
        if (activeItem) {
            await loadAvailableSlots(activeItem.getAttribute('data-item-id'));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}