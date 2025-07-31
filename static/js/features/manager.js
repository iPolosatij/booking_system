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
    const editButtons = document.querySelectorAll('.edit-slots-btn');
    if (!editButtons.length) {
        console.warn('No edit-slots-btn elements found');
        return;
    }

    editButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.getAttribute('data-item-id');
            const itemElement = btn.closest('.item');

            if (!itemElement) {
                console.error('Could not find parent item element');
                return;
            }

            const itemName = itemElement.querySelector('.item-name')?.textContent || 'Unknown Item';
            await openSlotEditor(itemId, itemName);
        });
    });

    const addSlotBtn = document.getElementById('add-slot-btn');
    const saveSlotsBtn = document.getElementById('save-slots-btn');

    if (addSlotBtn) {
        addSlotBtn.addEventListener('click', addNewSlot);
    } else {
        console.warn('Add slot button not found');
    }

    if (saveSlotsBtn) {
        saveSlotsBtn.addEventListener('click', saveSlots);
    } else {
        console.warn('Save slots button not found');
    }
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
            throw new Error('Пожалуйста, заполните все обязательные поля');
        }

        await apiRequest('/api/users', 'POST', userData);
        showNotification('Пользователь успешно создан', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        showNotification(error.message || 'Не удалось создать пользователя', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
        await apiRequest(`/api/users/${userId}`, 'DELETE');
        showNotification('Пользователь успешно удалён', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showNotification(error.message || 'Не удалось удалить пользователя', 'error');
    }
}

async function openSlotEditor(itemId, itemName) {
    if (!itemId) {
        console.error('Не указан ID товара');
        showNotification('Не выбран товар', 'error');
        return;
    }

    const editor = document.getElementById('slot-editor');
    const itemNameElement = document.getElementById('current-item-name');
    const slotListElement = document.getElementById('slot-list');

    if (!editor || !itemNameElement || !slotListElement) {
        console.error('Не найдены необходимые элементы редактора');
        showNotification('Системная ошибка: отсутствуют компоненты редактора', 'error');
        return;
    }

    currentItemId = itemId;
    itemNameElement.textContent = itemName;
    editor.style.display = 'block';

    try {
        const slots = await apiRequest(`/api/items/${itemId}/slots`, 'GET');
        renderSlots(slots || []);
    } catch (error) {
        console.error('Ошибка загрузки слотов:', error);
        showNotification('Не удалось загрузить временные слоты', 'error');
        renderSlots([]);
    }
}

function renderSlots(slots) {
    const slotList = document.getElementById('slot-list');
    if (!slotList) {
        console.error('Элемент списка слотов не найден');
        return;
    }

    // Защита от null/undefined
    slots = slots || [];
    
    slotList.innerHTML = '';

    if (slots.length === 0) {
        slotList.innerHTML = '<li class="no-slots">Нет доступных временных слотов</li>';
        return;
    }

    slots.forEach(slot => {
        if (!slot.id || !slot.date || !slot.start_time || !slot.end_time) {
            console.warn('Некорректные данные слота:', slot);
            return;
        }

        const li = document.createElement('li');
        li.className = 'slot-item';
        li.innerHTML = `
            <span class="slot-time">${slot.date} ${slot.start_time} - ${slot.end_time}</span>
            <span class="slot-status">${slot.is_available ? 'Доступен' : 'Забронирован'}</span>
            <button class="delete-slot-btn" data-slot-id="${slot.id}">Удалить</button>
        `;
        slotList.appendChild(li);
    });

    document.querySelectorAll('.delete-slot-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const slotId = btn.getAttribute('data-slot-id');
            if (!slotId) {
                console.error('Не найден ID слота для удаления');
                return;
            }
            await deleteSlot(slotId);
        });
    });
}

async function addNewSlot() {
    if (!currentItemId) {
        showNotification('Не выбран товар', 'error');
        return;
    }

    const dateInput = document.getElementById('slot-date');
    const startTimeInput = document.getElementById('slot-start-time');
    const endTimeInput = document.getElementById('slot-end-time');

    if (!dateInput || !startTimeInput || !endTimeInput) {
        showNotification('Не заполнены обязательные поля', 'error');
        return;
    }

    try {
        const slotData = {
            item_id: currentItemId,
            date: dateInput.value,
            start_time: startTimeInput.value,
            end_time: endTimeInput.value,
            is_available: true
        };

        if (!slotData.date || !slotData.start_time || !slotData.end_time) {
            throw new Error('Пожалуйста, заполните все поля слота');
        }

        if (slotData.start_time >= slotData.end_time) {
            throw new Error('Время окончания должно быть позже времени начала');
        }

        await apiRequest('/api/slots', 'POST', slotData);
        showNotification('Временной слот успешно добавлен', 'success');

        // Обновляем список слотов
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');
        renderSlots(slots || []);

        // Очищаем форму
        dateInput.value = '';
        startTimeInput.value = '';
        endTimeInput.value = '';
    } catch (error) {
        console.error('Ошибка добавления слота:', error);
        showNotification(error.message || 'Не удалось добавить временной слот', 'error');
    }
}

async function deleteSlot(slotId) {
    if (!slotId) {
        console.error('Не указан ID слота для удаления');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить этот временной слот?')) return;

    try {
        await apiRequest(`/api/slots/${slotId}`, 'DELETE');
        showNotification('Временной слот успешно удалён', 'success');

        // Обновляем список слотов
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');
        renderSlots(slots || []);
    } catch (error) {
        console.error('Ошибка удаления слота:', error);
        showNotification(error.message || 'Не удалось удалить временной слот', 'error');
    }
}

async function saveSlots() {
    if (!currentItemId) {
        showNotification('Не выбран товар', 'error');
        return;
    }

    try {
        const slots = await apiRequest(`/api/items/${currentItemId}/slots`, 'GET');

        if (!slots || !Array.isArray(slots)) {
            throw new Error('Получены некорректные данные слотов');
        }

        await apiRequest(`/api/items/${currentItemId}/slots`, 'PUT', slots);
        showNotification('Все временные слоты успешно сохранены', 'success');
    } catch (error) {
        console.error('Ошибка сохранения слотов:', error);
        showNotification(error.message || 'Не удалось сохранить временные слоты', 'error');
    }
}