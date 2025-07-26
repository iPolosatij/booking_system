/**
 * Управление бронированиями
 */

import { apiRequest } from '../core/api.js';
import { showNotification } from '../core/notifications.js';

export function initBookingManagement() {
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await cancelBooking(btn.getAttribute('data-booking-id'));
        });
    });
}

export async function cancelBooking(bookingId) {
    if (!confirm('Отменить это бронирование?')) return;

    try {
        await apiRequest(`/api/booking-slots/${bookingId}/cancel`, 'POST');
        showNotification('Бронирование отменено', 'success');
        location.reload();
    } catch (error) {
        console.error('Ошибка отмены:', error);
        showNotification(error.message, 'error');
    }
}
