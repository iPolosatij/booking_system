/**
 * Инициализация приложения
 */

import { initTabs } from './tabs.js';
import { initLogout } from './auth.js';
import { initSettingsManagement } from '../features/settings.js';
import { initUserManagement } from '../features/user.js';
import { initManagerManagement } from '../features/manager.js';
import { initItemManagement } from '../features/item.js';
import { initDateManagement } from '../features/date.js';
import { initBookingManagement } from '../features/booking.js';
import { initSlotManagement } from '../features/slot.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking System initialized');

    initTabs();
    initLogout();
    initSettingsManagement();

    if (document.getElementById('add-user-btn')) initUserManagement();
    if (document.getElementById('add-manager-btn')) initManagerManagement();
    if (document.getElementById('add-item-btn')) initItemManagement();
    if (document.querySelector('.date-list')) initDateManagement();
    if (document.querySelector('.booking-list')) initBookingManagement();
    if (document.querySelector('.item-list')) initSlotManagement();
});
