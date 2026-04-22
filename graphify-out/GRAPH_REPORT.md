# Graph Report - D:\hms-project  (2026-04-22)

## Corpus Check
- 88 files · ~86,757 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 454 nodes · 1221 edges · 53 communities detected
- Extraction: 37% EXTRACTED · 63% INFERRED · 0% AMBIGUOUS · INFERRED: 768 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]

## God Nodes (most connected - your core abstractions)
1. `User` - 114 edges
2. `UserRole` - 102 edges
3. `Patient` - 67 edges
4. `Doctor` - 63 edges
5. `Appointment` - 58 edges
6. `AppointmentStatus` - 37 edges
7. `Shift` - 31 edges
8. `DoctorShift` - 29 edges
9. `OTPRecord` - 27 edges
10. `DayOfWeek` - 27 edges

## Surprising Connections (you probably didn't know these)
- `request_lab_test()` --calls--> `LabTest`  [INFERRED]
  D:\hms-project\backend\app\api\v1\endpoints\lab.py → D:\hms-project\backend\app\models\lab.py
- `analyze()` --calls--> `analyze_symptoms()`  [INFERRED]
  D:\hms-project\backend\app\symptom_checker_main.py → D:\hms-project\backend\app\api\v1\endpoints\symptom_checker.py
- `ShiftCreate` --uses--> `User`  [INFERRED]
  D:\hms-project\backend\app\api\v1\endpoints\admin.py → D:\hms-project\backend\app\models\user.py
- `ShiftCreate` --uses--> `Bill`  [INFERRED]
  D:\hms-project\backend\app\api\v1\endpoints\admin.py → D:\hms-project\backend\app\models\bill.py
- `ShiftCreate` --uses--> `PaymentStatus`  [INFERRED]
  D:\hms-project\backend\app\api\v1\endpoints\admin.py → D:\hms-project\backend\app\models\bill.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (64): confirm_password_reset(), _find_user_by_login(), login(), logout(), PasswordResetConfirm, PasswordResetRequest, Step 1: Generate OTP and send via email., Find user by email OR by doctor employee_id.     identifier is lowercased before (+56 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (52): assign_doctor_shift(), Config, create_shift(), DoctorShiftAssign, DoctorShiftOut, ShiftCreate, ShiftOut, Appointment (+44 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (33): create_appointment(), _enrich(), get_appointment(), is_doctor_on_duty(), list_appointments(), patient_history(), reassign_appointment(), update_status() (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (29): BaseModel, Bill, BillItem, PaymentStatus, BillCreate, BillItemIn, BillItemOut, BillOut (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (18): chatbot_endpoint(), ChatRequest, ChatResponse, AI Chatbot for Patients:     - Extracts symptoms via LLM logic     - Detects i, Enum, detect_intent(), Intent, LLM Responsibility: Detect user intent from text.     MOCK Implementation: Keyw (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (18): Base, add_medicine(), Config, create_prescription(), Medicine, MedicineCreate, MedicineOut, Prescription (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (14): Config, _generate_patient_code(), get_patient(), list_patients(), _patient_to_out(), PatientOut, PatientRegister, purge_patient() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (11): decrypt_pii(), encrypt_pii(), Encrypt PII using AES-256-GCM., Decrypt PII using AES-256-GCM., is_already_encrypted(), migrate(), migrate_to_encryption.py — One-time migration to encrypt existing PII data.  U, Stores OTPs for mobile number verification during account linking. (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.32
Nodes (10): Admission, AdmissionCreate, AdmissionOut, admit_patient(), Bed, BedCreate, BedOut, BedStatus (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (7): BookAppointment(), DoctorsDirectory(), Landing(), PublicLayout(), Specializations(), SymptomChecker(), useScrollReveal()

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (9): get_current_user(), create_access_token(), decode_token(), hash_password(), _pre_hash(), SHA-256 pre-hash the password then base64-encode it.     This produces a fixed 4, Hash password using SHA-256 pre-hash + bcrypt., Verify password — handles both new SHA-256+bcrypt and legacy passlib hashes. (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (3): BaseSettings, Config, Settings

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (1): backup_db.py — Automated Database Backup Script.  This script performs a pg_du

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): purge_old_records.py — Automated GDPR/HIPAA Purge Script.  Purges records base

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (1): restore_db.py — Database Restoration Script.  Restores the HMS database from a

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): One-time migration: Add extended profile columns to the doctors table. Run this

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): SHA-256 pre-hash the password then base64-encode it.     This produces a fixed 4

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Hash password using SHA-256 pre-hash + bcrypt.

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Verify password — handles both new SHA-256+bcrypt and legacy passlib hashes.

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Stores OTPs for mobile number verification during account linking.

## Knowledge Gaps
- **27 isolated node(s):** `Perform CPU-intensive symptom analysis.     Combines rule-based engine (Safety)`, `LLM Responsibility: Detect user intent from text.     MOCK Implementation: Keyw`, `LLM Responsibility: Convert structured output into a natural language response.`, `LLM Responsibility: Extract symptoms from free-text input.     MOCK Implementat`, `Config` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (2 nodes): `main.py`, `health()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `database.py`, `get_db()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `migrate_doctor_columns.py`, `One-time migration: Add extended profile columns to the doctors table. Run this`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `Invoice.jsx`, `Invoice()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `Toast.jsx`, `Toast()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `Layout.jsx`, `Layout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `AdminBilling()`, `Billing.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `Dashboard.jsx`, `AdminDashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `Pharmacy.jsx`, `AdminPharmacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `PatientBilling()`, `Billing.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `router.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `client.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `authStore.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `SHA-256 pre-hash the password then base64-encode it.     This produces a fixed 4`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Hash password using SHA-256 pre-hash + bcrypt.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Verify password — handles both new SHA-256+bcrypt and legacy passlib hashes.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Stores OTPs for mobile number verification during account linking.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 19`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `UserRole` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Doctor` connect `Community 1` to `Community 0`, `Community 8`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 112 inferred relationships involving `User` (e.g. with `ShiftCreate` and `ShiftOut`) actually correct?**
  _`User` has 112 INFERRED edges - model-reasoned connections that need verification._
- **Are the 100 inferred relationships involving `UserRole` (e.g. with `AppointmentCreate` and `AppointmentReassign`) actually correct?**
  _`UserRole` has 100 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `Patient` (e.g. with `ShiftCreate` and `ShiftOut`) actually correct?**
  _`Patient` has 65 INFERRED edges - model-reasoned connections that need verification._
- **Are the 61 inferred relationships involving `Doctor` (e.g. with `ShiftCreate` and `ShiftOut`) actually correct?**
  _`Doctor` has 61 INFERRED edges - model-reasoned connections that need verification._