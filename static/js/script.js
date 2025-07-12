/**
 * Booking System - Main JavaScript File
 * Handles all client-side functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking System initialized');
    
    // Initialize common components
    initTabs();
    initLogout();
    initSettingsManagement();
    
    // Initialize role-specific components if they exist on page
    if (document.getElementById('add-user-btn')) initUserManagement();
    if (document.getElementById('add-manager-btn')) initManagerManagement();
    if (document.getElementById('add-item-btn')) initItemManagement();
    if (document.querySelector('.date-list')) initDateManagement();
    if (document.querySelector('.booking-list')) initBookingManagement();
    if (document.querySelector('.item-list')) initSlotManagement();
});

// ======================
// CORE FUNCTIONS
// ======================

/**
 * Initialize tab navigation
 */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes from all tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Initialize logout functionality
 */
function initLogout() {
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await apiRequest('/logout', 'GET');
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login';
            }
        });
    }
}

// ======================
// SETTINGS MANAGEMENT
// ======================

/**
 * Initialize settings management
 */
function initSettingsManagement() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
}

/**
 * Save system settings
 */
async function saveSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    const originalText = saveBtn.textContent;
    
    try {
        // Get form values
        const duration = parseInt(document.getElementById('slot-duration').value);
        const startTime = document.getElementById('day-start').value;
        const endTime = document.getElementById('day-end').value;

        // Validation
        if (isNaN(duration) throw new Error('Duration must be a number');
        if (duration <= 0) throw new Error('Duration must be positive');
        if (!startTime || !endTime) throw new Error('Please fill all fields');

        // Show loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Send request
        const response = await apiRequest('/api/settings', 'POST', {
            slot_duration_minutes: duration,
            day_start_time: startTime,
            day_end_time: endTime
        });

        // Show success message
        showNotification(response.message || 'Settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Save settings error:', error);
        showNotification(error.message || 'Error saving settings', 'error');
    } finally {
        // Restore button state
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

// ======================
// USER MANAGEMENT
// ======================

/**
 * Initialize user management
 */
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

/**
 * Add new user
 */
async function addUser() {
    try {
        const userData = {
            login: document.getElementById('user-login').value,
            password: document.getElementById('user-password').value,
            full_name: document.getElementById('user-fullname').value,
            birth_date: document.getElementById('user-birthdate').value || null,
            gender: document.getElementById('user-gender').value || 'male',
            role: 'user'
        };
        
        // Validation
        if (!userData.login || !userData.password || !userData.full_name) {
            throw new Error('Please fill all required fields');
        }
        
        // Send request
        await apiRequest('/api/users', 'POST', userData);
        
        // Success
        showNotification('User created successfully', 'success');
        location.reload();
        
    } catch (error) {
        console.error('Add user error:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await apiRequest(`/api/users/${userId}`, 'DELETE');
        showNotification('User deleted successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// MANAGER MANAGEMENT
// ======================

/**
 * Initialize manager management
 */
function initManagerManagement() {
    const addBtn = document.getElementById('add-manager-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await addManager();
        });
    }
    
    document.querySelectorAll('.manager-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteManager(btn.getAttribute('data-id'));
        });
    });
}

/**
 * Add new manager
 */
async function addManager() {
    try {
        const managerData = {
            login: document.getElementById('manager-login').value,
            password: document.getElementById('manager-password').value,
            full_name: 'New Manager',
            birth_date: '2000-01-01',
            gender: 'male',
            role: 'manager'
        };
        
        if (!managerData.login || !managerData.password) {
            throw new Error('Please enter both login and password');
        }
        
        await apiRequest('/api/users', 'POST', managerData);
        showNotification('Manager created successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Add manager error:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Delete manager
 */
async function deleteManager(managerId) {
    if (!confirm('Are you sure you want to delete this manager?')) return;
    
    try {
        await apiRequest(`/api/users/${managerId}`, 'DELETE');
        showNotification('Manager deleted successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Delete manager error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// ITEM MANAGEMENT
// ======================

/**
 * Initialize item management
 */
function initItemManagement() {
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

/**
 * Add new booking item
 */
async function addItem() {
    try {
        const name = document.getElementById('item-name').value;
        if (!name) throw new Error('Please enter item name');
        
        await apiRequest('/api/booking-items', 'POST', { name });
        showNotification('Item created successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Add item error:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Delete booking item
 */
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        await apiRequest(`/api/booking-items/${itemId}`, 'DELETE');
        showNotification('Item deleted successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Delete item error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// BOOKING MANAGEMENT
// ======================

/**
 * Initialize booking management
 */
function initBookingManagement() {
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await cancelBooking(btn.getAttribute('data-booking-id'));
        });
    });
}

/**
 * Cancel booking
 */
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        await apiRequest(`/api/booking-slots/${bookingId}/cancel`, 'POST');
        showNotification('Booking cancelled successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Cancel booking error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// DATE MANAGEMENT
// ======================

/**
 * Initialize date management
 */
function initDateManagement() {
    document.querySelectorAll('.toggle-date-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const date = btn.getAttribute('data-date');
            const action = btn.textContent === 'Disable' ? 'disable' : 'enable';
            await toggleDateAvailability(date, action, btn);
        });
    });
}

/**
 * Toggle date availability
 */
async function toggleDateAvailability(date, action, button) {
    try {
        await apiRequest(`/api/dates/${date}/availability`, 'POST', { action });
        button.textContent = action === 'disable' ? 'Enable' : 'Disable';
        showNotification(`Date ${date} ${action}d successfully`, 'success');
    } catch (error) {
        console.error('Toggle date error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// SLOT MANAGEMENT
// ======================

/**
 * Initialize slot management
 */
function initSlotManagement() {
    document.querySelectorAll('.item-list li').forEach(item => {
        item.addEventListener('click', async () => {
            await loadAvailableSlots(item.getAttribute('data-item-id'));
        });
    });
}

/**
 * Load available slots for item
 */
async function loadAvailableSlots(itemId) {
    try {
        const date = new Date().toISOString().split('T')[0];
        const slots = await apiRequest(`/api/booking-slots?date=${date}&item_id=${itemId}`, 'GET');
        renderSlots(slots);
    } catch (error) {
        console.error('Load slots error:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Render slots list
 */
function renderSlots(slots) {
    const container = document.getElementById('slot-list-container');
    container.innerHTML = slots.length ? '' : '<p>No available slots for this item</p>';
    
    const list = document.createElement('ul');
    list.className = 'slot-list';
    
    slots.forEach(slot => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${slot.start_time} - ${slot.end_time}</span>
            <button class="book-btn" data-slot-id="${slot.id}">Book</button>
            <button class="block-btn" data-slot-id="${slot.id}">Block</button>
        `;
        list.appendChild(li);
    });
    
    container.appendChild(list);
    
    // Add event listeners to new buttons
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

/**
 * Book slot
 */
async function bookSlot(slotId) {
    try {
        await apiRequest(`/api/booking-slots/${slotId}/book`, 'POST');
        showNotification('Slot booked successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Book slot error:', error);
        showNotification(error.message, 'error');
    }
}

/**
 * Block slot
 */
async function blockSlot(slotId) {
    try {
        await apiRequest(`/api/booking-slots/${slotId}/block`, 'POST');
        showNotification('Slot blocked successfully', 'success');
        location.reload();
    } catch (error) {
        console.error('Block slot error:', error);
        showNotification(error.message, 'error');
    }
}

// ======================
// API HELPER FUNCTIONS
// ======================

/**
 * Make API request with error handling
 */
async function apiRequest(url, method, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    
    // Handle empty response (204 No Content)
    if (response.status === 204) {
        return { status: 'success' };
    }
    
    // Try to read response text
    const text = await response.text();
    
    if (!response.ok) {
        // Try to parse error JSON
        try {
            const error = text ? JSON.parse(text) : {};
            throw new Error(error.error || error.message || 'Request failed');
        } catch {
            throw new Error(text || 'Request failed');
        }
    }
    
    // Try to parse successful JSON
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error('Invalid server response');
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const oldNotif = document.querySelector('.custom-notification');
    if (oldNotif) oldNotif.remove();
    
    // Create notification element
    const notif = document.createElement('div');
    notif.className = `custom-notification ${type}`;
    notif.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
            <button class="close-notification">×</button>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(notif);
    
    // Auto-remove after 5 seconds
    setTimeout(() => notif.classList.add('fade-out'), 5000);
    setTimeout(() => notif.remove(), 5300);
    
    // Manual close
    notif.querySelector('.close-notification').addEventListener('click', () => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 300);
    });
}

// ======================
// NOTIFICATION STYLES
// ======================

const style = document.createElement('style');
style.textContent = `
    .custom-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        background: #2196F3;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        transition: all 0.3s ease;
        max-width: 300px;
    }
    .custom-notification.success {
        background: #4CAF50;
    }
    .custom-notification.error {
        background: #F44336;
    }
    .custom-notification.info {
        background: #2196F3;
    }
    .custom-notification.fade-out {
        opacity: 0;
        transform: translateY(-20px);
    }
    .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .close-notification {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 15px;
    }
`;
document.head.appendChild(style);