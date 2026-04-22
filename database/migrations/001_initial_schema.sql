CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('patient','doctor','admin');
CREATE TYPE appointment_status AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE payment_status AS ENUM ('pending','paid','partial','cancelled');
CREATE TYPE lab_test_status AS ENUM ('requested','sample_collected','processing','completed','cancelled');
CREATE TYPE bed_status AS ENUM ('available','occupied','maintenance');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    dob DATE, gender VARCHAR(20), blood_group VARCHAR(10),
    phone VARCHAR(20), address TEXT
);

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    license_no VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    status appointment_status DEFAULT 'pending',
    reason TEXT, notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, appointment_date, slot_time)
);

CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    total_amount NUMERIC(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    billed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    test_name VARCHAR(200) NOT NULL,
    status lab_test_status DEFAULT 'requested',
    result TEXT, notes TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100), unit VARCHAR(50),
    stock_quantity INT DEFAULT 0,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    diagnosis TEXT, notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INT,
    instructions TEXT
);

CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ward VARCHAR(100) NOT NULL,
    bed_number VARCHAR(20) UNIQUE NOT NULL,
    bed_type VARCHAR(50) DEFAULT 'general',
    status bed_status DEFAULT 'available'
);

CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    bed_id UUID NOT NULL REFERENCES beds(id),
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    diagnosis TEXT, status VARCHAR(20) DEFAULT 'admitted', notes TEXT
);

CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_doctor ON appointments(doctor_id);
CREATE INDEX idx_appt_date ON appointments(appointment_date);
CREATE INDEX idx_bills_patient ON bills(patient_id);
CREATE INDEX idx_lab_patient ON lab_tests(patient_id);

-- Default admin user — PLACEHOLDER hash (not usable for login)
-- AFTER first `docker compose up --build`, run once:
--   docker exec -it hms_backend python3 /app/scripts/reset_admin.py
-- This sets the correct SHA-256+bcrypt hash. Login: admin@hms.local / Admin@123
INSERT INTO users (email, password_hash, role)
VALUES ('admin@hms.local', 'PLACEHOLDER_RUN_RESET_ADMIN_SCRIPT', 'admin');

-- Sample beds
INSERT INTO beds (ward, bed_number, bed_type) VALUES
('General Ward','G-01','general'),('General Ward','G-02','general'),
('General Ward','G-03','general'),('ICU','ICU-01','icu'),
('ICU','ICU-02','icu'),('Private','P-01','private'),('Private','P-02','private');

-- Sample medicines
INSERT INTO medicines (name,category,unit,stock_quantity,price) VALUES
('Paracetamol 500mg','Analgesic','tablet',500,2.50),
('Amoxicillin 250mg','Antibiotic','capsule',300,8.00),
('Omeprazole 20mg','Antacid','capsule',200,5.00),
('Metformin 500mg','Antidiabetic','tablet',400,3.50),
('Amlodipine 5mg','Antihypertensive','tablet',250,6.00);

-- Extended doctor profile columns (added in v2)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications VARCHAR(300);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(200);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee INT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS patients_treated INT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_days VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_time VARCHAR(100);
