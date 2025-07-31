/**
 * Управление админ-панелью
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initAdminManagement() {
    initManagersManagement();
    initItemsManagement();
    initSettingsManagement();
}

function initManagersManagement() {
    const addManagerBtn = document.getElementById('add-manager-btn');
    if (addManagerBtn) {
        addManagerBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addManager();
        });
    }

    document.querySelectorAll('.manager-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteManager(btn.getAttribute('data-id'));
        });
    });
}

function initItemsManagement() {
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addItem();
        });
    }

    document.querySelectorAll('.item-list li').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            
            const itemId = item.getAttribute('data-item-id');
            if (itemId) {
                try {
                    const slots = await apiRequest(`/api/booking-slots?item_id=${itemId}`, 'GET');
                    renderSlots(slots);
                } catch (error) {
                    console.error('Error loading slots:', error);
                    showNotification('Failed to load slots', 'error');
                }
            }
        });
    });

    document.querySelectorAll('.item-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await deleteItem(btn.getAttribute('data-id'));
        });
    });
}

function initSettingsManagement() {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await saveSettings();
        });
    }
}

function renderSlots(slots) {
    const container = document.getElementById('slot-list-container');
    if (!container) {
        console.error('Slot container not found');
        return;
    }

    container.innerHTML = slots && slots.length > 0 
        ? `<ul class="slot-list">${slots.map(slot => `
            <li class="slot-item">
                <span class="slot-time">${slot.start_time} - ${slot.end_time}</span>
                <button class="btn book-btn" data-slot-id="${slot.id}">Book</button>
            </li>
        `).join('')}</ul>`
        : '<p class="no-slots">No available slots</p>';

    // Добавляем обработчики для новых кнопок
    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const slotId = btn.getAttribute('data-slot-id');
            if (slotId) {
                try {
                    await apiRequest(`/api/booking-slots/${slotId}/book`, 'POST');
                    showNotification('Slot booked successfully', 'success');
                } catch (error) {
                    showNotification(error.message || 'Failed to book slot', 'error');
                }
            }
        });
    });
}

async function addManager() {
    const loginInput = document.getElementById('manager-login');
    const passwordInput = document.getElementById('manager-password');
    const fullnameInput = document.getElementById('manager-fullname');
    const birthdateInput = document.getElementById('manager-birthdate');
    const genderInput = document.getElementById('manager-gender');

    if (!loginInput || !passwordInput || !birthdateInput || !genderInput) {
        showNotification('Не найдены все необходимые поля ввода', 'error');
        return;
    }

    try {
        const managerData = {
            login: loginInput.value.trim(),
            password: passwordInput.value,
            full_name: fullnameInput?.value.trim() || 'New Manager',
            birth_date: birthdateInput.value,
            gender: genderInput.value
        };

        if (!managerData.login) throw new Error('Логин обязателен');
        if (!managerData.password) throw new Error('Пароль обязателен');
        if (!managerData.birth_date) throw new Error('Дата рождения обязательна');
        if (managerData.password.length < 6) throw new Error('Пароль должен содержать минимум 6 символов');

        await apiRequest('/api/managers', 'POST', managerData);
        
        loginInput.value = '';
        passwordInput.value = '';
        if (fullnameInput) fullnameInput.value = '';
        birthdateInput.value = '';
        genderInput.value = 'male';

        showNotification('Менеджер успешно создан', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        let errorMessage = 'Не удалось создать менеджера';
        if (error.message.includes('unique constraint')) {
            errorMessage = 'Пользователь с таким логином уже существует';
        } else if (error.message) {
            errorMessage = error.message;
        }
        showNotification(errorMessage, 'error');
    }
}

async function deleteManager(managerId) {
    if (!confirm('Are you sure you want to delete this manager?')) return;

    try {
        await apiRequest(`/api/users/${managerId}`, 'DELETE');
        showNotification('Manager deleted successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Error deleting manager:', error);
        showNotification(error.message || 'Failed to delete manager', 'error');
    }
}

async function addItem() {
    try {
        const itemName = document.getElementById('item-name').value;
        if (!itemName) throw new Error('Item name is required');

        await apiRequest('/api/booking-items', 'POST', { name: itemName });
        showNotification('Item created successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Error creating item:', error);
        showNotification(error.message || 'Failed to create item', 'error');
    }
}

async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        await apiRequest(`/api/booking-items/${itemId}`, 'DELETE');
        showNotification('Item deleted successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification(error.message || 'Failed to delete item', 'error');
    }
}

async function saveSettings() {
    try {
        const settings = {
            slot_duration_minutes: parseInt(document.getElementById('slot-duration').value),
            day_start_time: document.getElementById('day-start').value,
            day_end_time: document.getElementById('day-end').value
        };

        await apiRequest('/api/settings', 'POST', settings);
        showNotification('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification(error.message || 'Failed to save settings', 'error');
    }
}