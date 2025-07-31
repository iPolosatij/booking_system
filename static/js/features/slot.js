/**
 * Управление слотами бронирования
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

// Основная функция инициализации
export function initSlotManagement() {
    try {
        const items = document.querySelectorAll('.item-list li');
        if (!items || items.length === 0) {
            console.warn('Не найдены элементы товаров для бронирования');
            return;
        }

        items.forEach(item => {
            try {
                const itemId = item.getAttribute('data-item-id');
                if (!itemId) {
                    console.warn('Элемент товара не содержит data-item-id', item);
                    return;
                }

                item.addEventListener('click', async () => {
                    try {
                        await loadAvailableSlots(itemId);
                    } catch (error) {
                        console.error('Ошибка при загрузке слотов:', error);
                        showNotification('Ошибка загрузки слотов', 'error');
                    }
                });
            } catch (error) {
                console.error('Ошибка при инициализации элемента:', item, error);
            }
        });
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        showNotification('Системная ошибка инициализации', 'error');
    }
}

// Загрузка доступных слотов
async function loadAvailableSlots(itemId) {
    if (!itemId) {
        console.error('Отсутствует ID товара');
        showNotification('Ошибка: не указан товар', 'error');
        return;
    }

    try {
        const date = new Date().toISOString().split('T')[0];
        const response = await apiRequest(`/api/booking-slots?date=${date}&item_id=${itemId}`, 'GET');
        
        // Гарантируем что slots - всегда массив
        const slots = (response && Array.isArray(response)) ? response : [];
        renderSlots(slots);
    } catch (error) {
        console.error('Ошибка загрузки слотов:', error);
        showNotification(error.message || 'Ошибка загрузки слотов', 'error');
        renderSlots([]); // Показываем пустой список при ошибке
    }
}

// Отрисовка слотов
function renderSlots(slots) {
    try {
        // Проверяем входные данные
        const safeSlots = Array.isArray(slots) ? slots : [];
        const container = document.getElementById('slot-list-container');
        
        if (!container) {
            console.error('Не найден контейнер для слотов');
            return;
        }

        // Очищаем контейнер
        container.innerHTML = '';

        if (safeSlots.length === 0) {
            container.innerHTML = '<p class="no-slots">Нет доступных слотов</p>';
            return;
        }

        // Создаем список слотов
        const list = document.createElement('ul');
        list.className = 'slot-list';

        if(safeSlots != null){
            safeSlots.forEach(slot => {
            try {
                // Проверяем данные слота
                if (!slot?.id || !slot?.start_time || !slot?.end_time) {
                    console.warn('Пропущен некорректный слот:', slot);
                    return;
                }

                const li = document.createElement('li');
                li.className = 'slot-item';
                li.innerHTML = `
                    <span class="slot-time">${slot.start_time} - ${slot.end_time}</span>
                    <div class="slot-actions">
                        <button class="btn book-btn" data-slot-id="${slot.id}">Забронировать</button>
                        <button class="btn block-btn" data-slot-id="${slot.id}">Заблокировать</button>
                    </div>
                `;
                list.appendChild(li);
            } catch (error) {
                console.error('Ошибка рендеринга слота:', slot, error);
            }
        });
    }
        else{
            showNotification('пустой лист');
            return;
        }

        container.appendChild(list);
        setupSlotEventHandlers();
    } catch (error) {
        console.error('Критическая ошибка рендеринга:', error);
        showNotification('Ошибка отображения слотов', 'error');
    }
}

// Настройка обработчиков событий
function setupSlotEventHandlers() {
    try {
        // Обработчики для кнопок бронирования
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const slotId = btn.getAttribute('data-slot-id');
                if (slotId) {
                    try {
                        await bookSlot(slotId);
                    } catch (error) {
                        console.error('Ошибка при бронировании:', error);
                    }
                }
            });
        });

        // Обработчики для кнопок блокировки
        document.querySelectorAll('.block-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const slotId = btn.getAttribute('data-slot-id');
                if (slotId) {
                    try {
                        await blockSlot(slotId);
                    } catch (error) {
                        console.error('Ошибка при блокировке:', error);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Ошибка настройки обработчиков:', error);
    }
}

// Бронирование слота
async function bookSlot(slotId) {
    if (!slotId) {
        console.error('Не указан ID слота для бронирования');
        return;
    }

    if (!confirm('Вы уверены, что хотите забронировать этот слот?')) {
        return;
    }

    try {
        await apiRequest(`/api/booking-slots/${slotId}/book`, 'POST');
        showNotification('Слот успешно забронирован', 'success');
        
        // Обновляем список слотов без перезагрузки страницы
        const activeItem = document.querySelector('.item-list li.active');
        if (activeItem) {
            await loadAvailableSlots(activeItem.getAttribute('data-item-id'));
        }
    } catch (error) {
        console.error('Ошибка бронирования:', error);
        showNotification(error.message || 'Ошибка бронирования', 'error');
    }
}

// Блокировка слота
async function blockSlot(slotId) {
    if (!slotId) {
        console.error('Не указан ID слота для блокировки');
        return;
    }

    if (!confirm('Вы уверены, что хотите заблокировать этот слот?')) {
        return;
    }

    try {
        await apiRequest(`/api/booking-slots/${slotId}/block`, 'POST');
        showNotification('Слот успешно заблокирован', 'success');
        
        // Обновляем список слотов без перезагрузки страницы
        const activeItem = document.querySelector('.item-list li.active');
        if (activeItem) {
            await loadAvailableSlots(activeItem.getAttribute('data-item-id'));
        }
    } catch (error) {
        console.error('Ошибка блокировки:', error);
        showNotification(error.message || 'Ошибка блокировки', 'error');
    }
}