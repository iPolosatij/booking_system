/**
 * Управление менеджерами и временными слотами бронирования
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

let currentItemId = null;

export function initManagerManagement() {
    initUserManagement();
    initSlotManagement();
}

function initUserManagement() {
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

function initSlotManagement() {
    document.querySelector('.booking-management').addEventListener('click', async (e) => {
        const btn = e.target.closest('.edit-slots-btn');
        if (!btn) return;
        
        e.stopPropagation();
        const itemId = btn.getAttribute('data-item-id');
        const itemName = btn.closest('.item').querySelector('.item-name')?.textContent || 'Unknown Item';
        await openSlotEditor(itemId, itemName);
    });

    document.getElementById('add-slot-btn')?.addEventListener('click', addNewSlot);
    document.getElementById('save-slots-btn')?.addEventListener('click', saveSlots);
}

async function addUser() {
    try {
        const userData = {
            login: document.getElementById('user-login').value,
            password: document.getElementById('user-password').value,
            full_name: document.getElementById('user-fullname').value,
            birth_date: document.getElementById('user-birthdate').value,
            gender: document.getElementById('user-gender').value,
            role: 'user'
        };

        if (!userData.login || !userData.password || !userData.full_name) {
            throw new Error('Заполните все обязательные поля');
        }

        await apiRequest('/api/users', 'POST', userData);
        showNotification('Пользователь создан', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Удалить пользователя?')) return;
    try {
        await apiRequest(`/api/users/${userId}`, 'DELETE');
        showNotification('Пользователь удален', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

async function openSlotEditor(itemId, itemName) {
    if (!itemId) {
        showNotification('Не выбран объект', 'error');
        return;
    }

    const editor = document.getElementById('slot-editor');
    const itemNameElement = document.getElementById('current-item-name');
    const slotListElement = document.getElementById('slot-list');

    currentItemId = itemId;
    itemNameElement.textContent = itemName;
    editor.style.display = 'block';

    try {
        const slots = await apiRequest(`/api/items/${itemId}/slots`, 'GET');
        renderSlots(slots || []);
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка загрузки слотов', 'error');
        renderSlots([]);
    }
}

function renderSlots(slots) {
    const slotList = document.getElementById('slot-list');
    slotList.innerHTML = '';

    if (slots.length === 0) {
        slotList.innerHTML = '<li class="no-slots">Нет слотов</li>';
        return;
    }

    slots.forEach(slot => {
        const li = document.createElement('li');
        li.className = 'slot-item';
        li.innerHTML = `
            <span class="slot-time">${slot.date} ${slot.start_time} - ${slot.end_time}</span>
            <button class="delete-slot-btn" data-slot-id="${slot.id}">Удалить</button>
        `;
        slotList.appendChild(li);
    });

    document.querySelectorAll('.delete-slot-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteSlot(btn.getAttribute('data-slot-id'));
        });
    });
}

async function addNewSlot() {
    try {
        const slotData = {
            item_id: currentItemId,
            date: document.getElementById('slot-date').value,
            start_time: document.getElementById('slot-start-time').value,
            end_time: document.getElementById('slot-end-time').value,
            is_available: true
        };

        if (!slotData.date || !slotData.start_time || !slotData.end_time) {
            throw new Error('Заполните все поля');
        }

        await apiRequest('/api/slots', 'POST', slotData);
        showNotification('Слот добавлен', 'success');
        
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');
        renderSlots(slots || []);
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteSlot(slotId) {
    if (!confirm('Удалить слот?')) return;
    try {
        await apiRequest(`/api/slots/${slotId}`, 'DELETE');
        showNotification('Слот удален', 'success');
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');
        renderSlots(slots || []);
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

async function saveSlots() {
    try {
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');
        await apiRequest(`/api/items/${currentItemId}/slots`, 'PUT', slots);
        showNotification('Слоты сохранены', 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}