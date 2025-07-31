-- Включение расширения для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы пользователей (если не существует)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы объектов бронирования
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание таблицы временных слотов
CREATE TABLE IF NOT EXISTS booking_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_time_slot CHECK (end_time > start_time)
);

-- Создание таблицы бронирований
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    participants INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, slot_id)  -- Один пользователь может забронировать слот только один раз
);

-- Создание таблицы системных настроек
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    day_start_time TIME NOT NULL DEFAULT '08:00:00',
    day_end_time TIME NOT NULL DEFAULT '22:00:00',
    booking_window_days INTEGER NOT NULL DEFAULT 30,
    min_booking_hours INTEGER NOT NULL DEFAULT 2,
    max_daily_bookings INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Добавление администратора (если не существует)
INSERT INTO users (login, password, full_name, birth_date, gender, role)
VALUES (
    'SuperAdmin',
    '$2a$12$w2o1rsiTM9iwhi52W/MPquAIG34hG9vlFb3vqfhaH9ix8tiNgT2sm',
    'System Administrator',
    '2000-01-01',
    'male',
    'admin'
)
ON CONFLICT (login) DO NOTHING;

-- Добавление тестового менеджера
INSERT INTO users (login, password, full_name, birth_date, gender, role)
VALUES (
    'manager1',
    '$2a$12$xyz123...',
    'Test Manager',
    '1990-05-15',
    'female',
    'manager'
)
ON CONFLICT (login) DO NOTHING;

-- Добавление тестового пользователя
INSERT INTO users (login, password, full_name, birth_date, gender, role)
VALUES (
    'user1',
    '$2a$12$abc456...',
    'Test User',
    '1995-10-20',
    'male',
    'user'
)
ON CONFLICT (login) DO NOTHING;

-- Добавление системных настроек (если не существует)
INSERT INTO system_settings (
    slot_duration_minutes,
    day_start_time,
    day_end_time,
    booking_window_days,
    min_booking_hours,
    max_daily_bookings
)
VALUES (
    60,
    '08:00:00',
    '22:00:00',
    30,
    2,
    3
)
ON CONFLICT (id) DO UPDATE SET
    slot_duration_minutes = EXCLUDED.slot_duration_minutes,
    day_start_time = EXCLUDED.day_start_time,
    day_end_time = EXCLUDED.day_end_time,
    booking_window_days = EXCLUDED.booking_window_days,
    min_booking_hours = EXCLUDED.min_booking_hours,
    max_daily_bookings = EXCLUDED.max_daily_bookings;

-- Добавление тестовых объектов бронирования
INSERT INTO booking_items (name, description, capacity)
VALUES
    ('Conference Room A', 'Main conference room with 20 seats', 20),
    ('Conference Room B', 'Small meeting room with 8 seats', 8),
    ('Tennis Court', 'Outdoor tennis court', 4)
ON CONFLICT (name) DO NOTHING;

-- Создание индексов для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_booking_slots_date ON booking_slots(date);
CREATE INDEX IF NOT EXISTS idx_booking_slots_item_id ON booking_slots(item_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_availability ON booking_slots(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);