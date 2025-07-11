CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
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

CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    item_id UUID REFERENCES booking_items(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES booking_slots(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
    day_start_time TIME NOT NULL DEFAULT '08:00:00',
    day_end_time TIME NOT NULL DEFAULT '22:00:00'
);

-- Insert admin user
INSERT INTO users (login, password, full_name, birth_date, gender, role)
VALUES ('SuperAdmin', '$2a$12$w2o1rsiTM9iwhi52W/MPquAIG34hG9vlFb3vqfhaH9ix8tiNgT2sm', 'Admin', '2000-01-01', 'male', 'admin');

-- Insert default settings
INSERT INTO system_settings (slot_duration_minutes) VALUES (60);