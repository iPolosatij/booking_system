/**
 * Основные функции для работы с API
 */

export async function apiRequest(url, method, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    if (response.status === 204) {
        return { status: 'success' };
    }

    const text = await response.text();

    if (!response.ok) {
        try {
            const error = text ? JSON.parse(text) : {};
            throw new Error(error.error || error.message || 'Ошибка запроса');
        } catch {
            throw new Error(text || 'Ошибка запроса');
        }
    }

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error('Неверный ответ сервера');
    }
}
