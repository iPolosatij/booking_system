/**
 * Система уведомлений
 */

export function showNotification(message, type = 'info') {
    const oldNotif = document.querySelector('.custom-notification');
    if (oldNotif) oldNotif.remove();

    const notif = document.createElement('div');
    notif.className = `custom-notification ${type}`;
    notif.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
            <button class="close-notification">×</button>
        </div>
    `;

    document.body.appendChild(notif);

    setTimeout(() => notif.classList.add('fade-out'), 5000);
    setTimeout(() => notif.remove(), 5300);

    notif.querySelector('.close-notification').addEventListener('click', () => {
        notif.classList.add('fade-out');
        setTimeout(() => notif.remove(), 300);
    });
}

// Стили для уведомлений
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
