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
import { initAdminManagement } from '../features/admin.js';
import { initSlotManagement } from '../features/slot.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking System initialized');

    // Общие модули для всех страниц
    initTabs();
    initLogout();
    initSettingsManagement();

    // Инициализация специфичных модулей
    if (document.getElementById('add-user-btn')) initUserManagement();
    if (document.getElementById('add-item-btn')) initItemManagement();
    if (document.querySelector('.date-list')) initDateManagement();
    if (document.querySelector('.booking-list')) initBookingManagement();

    // Главные панели (взаимоисключающие)
    if (document.querySelector('.manager-container')) {
        console.log('Initializing Manager Panel');
        initManagerManagement();
    } 
    else if (document.querySelector('.admin-container')) {
        console.log('Initializing Admin Panel');
        initAdminManagement();
    }

    // Инициализация бронирования слотов (ТОЛЬКО для пользователей)
    if (document.getElementById('slot-list-container') && 
        !document.querySelector('.manager-container') && 
        !document.querySelector('.admin-container')) {
        console.log('Initializing Slot Booking');
        initSlotManagement();
    }
});