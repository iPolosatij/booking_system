document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // Общие функции для всех страниц
    initTabs();
    initLogout();

    // Инициализация специфичных для ролей функций
    if (document.getElementById('add-user-btn')) {
        console.log('Initializing user management');
        initUserManagement();
    }
    
    if (document.getElementById('add-manager-btn')) {
        console.log('Initializing manager management');
        initManagerManagement();
    }
    
    if (document.getElementById('add-item-btn')) {
        console.log('Initializing item management');
        initItemManagement();
    }
    
    if (document.getElementById('save-settings-btn')) {
        console.log('Initializing settings management');
        initSettingsManagement();
    }
    
    if (document.querySelector('.date-list')) {
        console.log('Initializing date management');
        initDateManagement();
    }
    
    if (document.querySelector('.booking-list')) {
        console.log('Initializing booking management');
        initBookingManagement();
    }
    
    if (document.querySelector('.item-list')) {
        console.log('Initializing slot management');
        initSlotManagement();
    }
});

// Общие функции
function initTabs() {
    console.log('Initializing tabs');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Tab button clicked:', btn.getAttribute('data-tab'));
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function initLogout() {
    console.log('Initializing logout');
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout clicked');
            fetch('/logout', {
                method: 'GET',
                credentials: 'same-origin'
            })
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => {
                console.error('Logout error:', error);
                window.location.href = '/login';
            });
        });
    }
}

// User Management
function initUserManagement() {
    console.log('Setting up user management');
    
    // Добавление пользователя
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        console.log('Add User button found, adding event listener');
        addUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Add User button clicked');
            addUser();
        });
    } else {
        console.error('Add User button NOT found!');
    }
    
    // Удаление пользователя
    const deleteButtons = document.querySelectorAll('.user-list .delete-btn');
    console.log(`Found ${deleteButtons.length} delete buttons`);
    
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            console.log('Delete user clicked:', userId);
            deleteUser(userId);
        });
    });
}

function addUser() {
    console.log('Starting addUser function');
    
    const login = document.getElementById('user-login').value;
    const password = document.getElementById('user-password').value;
    const fullName = document.getElementById('user-fullname').value;
    const birthDate = document.getElementById('user-birthdate').value;
    const gender = document.getElementById('user-gender').value;
    
    console.log('Form values:', {login, password, fullName, birthDate, gender});
    
    // Валидация
    if (!login || !password || !fullName) {
        const errorMsg = 'Please fill all required fields (Login, Password, Full Name)';
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }

    console.log('Sending request to /api/users');
    
    fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            login,
            password,
            full_name: fullName,
            birth_date: birthDate || null,
            gender: gender || 'male',
            role: 'user'
        }),
        credentials: 'include'
    })
    .then(response => {
        console.log('Received response, status:', response.status);
        if (!response.ok) {
            return response.json().then(err => { 
                console.error('Server error:', err);
                throw err; 
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('User created successfully:', data);
        alert('User created successfully!');
        location.reload();
    })
    .catch(error => {
        console.error('Error in addUser:', error);
        alert('Error creating user: ' + (error.message || JSON.stringify(error)));
    });
}

function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        console.log('User deletion cancelled');
        return;
    }
    
    console.log('Deleting user with ID:', userId);
    
    fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            console.log('User deleted successfully');
            location.reload();
        } else {
            console.error('Failed to delete user, status:', response.status);
            throw new Error('User deletion failed');
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    });
}

// Manager Management
function initManagerManagement() {
    console.log('Initializing manager management');
    
    const addManagerBtn = document.getElementById('add-manager-btn');
    if (addManagerBtn) {
        addManagerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addManager();
        });
    }
    
    document.querySelectorAll('.manager-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const managerId = this.getAttribute('data-id');
            deleteManager(managerId);
        });
    });
}

function addManager() {
    const login = document.getElementById('manager-login').value;
    const password = document.getElementById('manager-password').value;
    
    if (!login || !password) {
        alert('Please enter both login and password');
        return;
    }
    
    fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            login,
            password,
            full_name: 'New Manager',
            birth_date: '2000-01-01',
            gender: 'male',
            role: 'manager'
        }),
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Manager creation failed');
    })
    .then(data => {
        alert('Manager created successfully');
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating manager: ' + error.message);
    });
}

function deleteManager(managerId) {
    if (!confirm('Are you sure you want to delete this manager?')) return;
    
    fetch(`/api/users/${managerId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            location.reload();
        } else {
            throw new Error('Manager deletion failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting manager: ' + error.message);
    });
}

// Item Management
function initItemManagement() {
    console.log('Initializing item management');
    
    const addItemBtn = document.getElementById('add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addItem();
        });
    }
    
    document.querySelectorAll('.item-list .delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            deleteItem(itemId);
        });
    });
}

function addItem() {
    const name = document.getElementById('item-name').value;
    
    if (!name) {
        alert('Please enter item name');
        return;
    }
    
    fetch('/api/booking-items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Item creation failed');
    })
    .then(data => {
        alert('Item created successfully');
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating item: ' + error.message);
    });
}

function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    fetch(`/api/booking-items/${itemId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            location.reload();
        } else {
            throw new Error('Item deletion failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting item: ' + error.message);
    });
}

// Settings Management
function initSettingsManagement() {
    console.log('Initializing settings management');
    
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveSettings();
        });
    }
}

function saveSettings() {
    const duration = document.getElementById('slot-duration').value;
    const startTime = document.getElementById('day-start').value;
    const endTime = document.getElementById('day-end').value;
    
    fetch('/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            slot_duration_minutes: parseInt(duration),
            day_start_time: startTime,
            day_end_time: endTime
        }),
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Settings save failed');
    })
    .then(data => {
        alert('Settings saved successfully');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error saving settings: ' + error.message);
    });
}

// Date Management
function initDateManagement() {
    console.log('Initializing date management');
    
    document.querySelectorAll('.toggle-date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            const action = this.textContent === 'Disable' ? 'disable' : 'enable';
            toggleDateAvailability(date, action, this);
        });
    });
}

function toggleDateAvailability(date, action, button) {
    fetch(`/api/dates/${date}/availability`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Date toggle failed');
    })
    .then(data => {
        button.textContent = action === 'disable' ? 'Enable' : 'Disable';
        alert(`Date ${date} ${action}d successfully`);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error toggling date availability: ' + error.message);
    });
}

// Slot Management
function initSlotManagement() {
    console.log('Initializing slot management');
    
    document.querySelectorAll('.item-list li').forEach(item => {
        item.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            loadAvailableSlots(itemId);
        });
    });
}

function loadAvailableSlots(itemId) {
    const date = new Date().toISOString().split('T')[0]; // Сегодняшняя дата
    
    fetch(`/api/booking-slots?date=${date}&item_id=${itemId}`, {
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to load slots');
    })
    .then(slots => {
        renderSlots(slots);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error loading slots: ' + error.message);
    });
}

function renderSlots(slots) {
    const container = document.getElementById('slot-list-container');
    container.innerHTML = '';
    
    if (slots.length === 0) {
        container.innerHTML = '<p>No available slots for this item</p>';
        return;
    }
    
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
    
    // Добавляем обработчики для новых кнопок
    document.querySelectorAll('.book-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const slotId = this.getAttribute('data-slot-id');
            bookSlot(slotId);
        });
    });
    
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const slotId = this.getAttribute('data-slot-id');
            blockSlot(slotId);
        });
    });
}

function bookSlot(slotId) {
    fetch(`/api/booking-slots/${slotId}/book`, {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Booking failed');
    })
    .then(data => {
        alert('Slot booked successfully');
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error booking slot: ' + error.message);
    });
}

function blockSlot(slotId) {
    fetch(`/api/booking-slots/${slotId}/block`, {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Blocking failed');
    })
    .then(data => {
        alert('Slot blocked successfully');
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error blocking slot: ' + error.message);
    });
}

// Booking Management
function initBookingManagement() {
    console.log('Initializing booking management');
    
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            cancelBooking(bookingId);
        });
    });
}

function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    fetch(`/api/booking-slots/${bookingId}/cancel`, {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Cancellation failed');
    })
    .then(data => {
        alert('Booking cancelled successfully');
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error cancelling booking: ' + error.message);
    });
}