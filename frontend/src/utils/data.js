export const SPECIALIZATIONS = [
  { icon:'❤️', name:'Cardiology', desc:'Comprehensive heart care and advanced cardiac interventions.', tags:['CATH Lab','Angioplasty'] },
  { icon:'🧠', name:'Neurology', desc:'Advanced care for brain, spine, and nerve disorders.', tags:['Stroke Unit','Spine'] },
  { icon:'🦴', name:'Orthopaedics', desc:'Joint replacements, trauma care, and sports medicine.', tags:['Robotic TKR','Arthroscopy'] },
  { icon:'🔬', name:'Oncology', desc:'Comprehensive cancer care and radiation therapy.', tags:['LINAC','Chemotherapy'] },
  { icon:'👶', name:'Paediatrics', desc:'Specialized healthcare for infants, children, and adolescents.', tags:['NICU','Vaccines'] },
  { icon:'🤰', name:'Gynaecology & Obstetrics', desc:'Comprehensive women\'s health and maternity services.', tags:['High Risk','Maternity'] },
  { icon:'👁️', name:'Ophthalmology', desc:'Advanced eye care, surgery, and vision correction.', tags:['LASIK','Cataract'] },
  { icon:'🫁', name:'Pulmonology', desc:'Care for respiratory health and sleep disorders.', tags:['Bronchoscopy','Asthma'] },
  { icon:'🍽️', name:'Gastroenterology', desc:'Complete digestive and liver care services.', tags:['Endoscopy','Liver'] },
  { icon:'🫘', name:'Nephrology', desc:'Kidney disease management and dialysis services.', tags:['Dialysis','Stone Clinic'] },
  { icon:'🩺', name:'General Medicine', desc:'Internal medicine and preventive health checkups.', tags:['Diabetes','Preventive'] },
  { icon:'✂️', name:'General Surgery', desc:'Routine and complex laparoscopic surgical procedures.', tags:['Laparoscopic','Hernia'] },
  { icon:'✨', name:'Dermatology', desc:'Skin, hair, and nail treatments and aesthetics.', tags:['Cosmetic','Skin Care'] },
  { icon:'🧘', name:'Psychiatry', desc:'Mental health support and behavioral therapy.', tags:['Counseling','Therapy'] },
  { icon:'☢️', name:'Radiology', desc:'Advanced imaging: MRI, CT, and Ultrasound.', tags:['MRI','CT Scan'] },
  { icon:'💤', name:'Anaesthesiology', desc:'Pain management and perioperative care.', tags:['Pain Clinic','ICU'] },
  { icon:'👂', name:'ENT', desc:'Ear, Nose, and Throat specialized care.', tags:['Hearing','Sinus'] },
  { icon:'🦷', name:'Dentistry', desc:'Complete oral health and dental surgery.', tags:['Root Canal','Implant'] },
  { icon:'💦', name:'Urology', desc:'Kidney stones and urinary tract health.', tags:['Laser','Uro-surgery'] },
];

export const DOCTORS = [
  { 
    id:1, name:'Dr. Arjun Mehta', spec:'Cardiology', qual:'MBBS, MD (Cardiology), DM · AIIMS Delhi', 
    exp:18, patients:4200, rating:4.9, initials:'AM', color:'linear-gradient(135deg,#1a3fd4,#1a5fd4)', 
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200',
    tags:['Interventional Cardiology','Heart Failure','Electrophysiology'], avail:'Mon–Sat', slots:'10:00 AM – 1:00 PM', 
    bio:'Dr. Arjun Mehta is a senior interventional cardiologist with 18 years of experience at AIIMS Delhi and Medanta before joining MaxCare+. He has performed over 3,000 angioplasties.', 
    schedule:[{day:'Mon/Wed/Fri',time:'10:00–13:00'},{day:'Tue/Thu',time:'14:00–17:00'},{day:'Saturday',time:'09:00–12:00'},{day:'Sunday',time:'Emergency only'}] 
  },
  { 
    id:2, name:'Dr. Sunita Rao', spec:'Gynaecology & Obstetrics', qual:'MBBS, MS (OBG), FMAS · Manipal Hospital', 
    exp:14, patients:3100, rating:4.8, initials:'SR', color:'linear-gradient(135deg,#7c3aed,#a855f7)', 
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200&h=200',
    tags:['High-Risk Pregnancy','Laparoscopic Surgery','Fertility'], avail:'Mon–Fri', slots:'09:00 AM – 12:00 PM', 
    bio:'Dr. Sunita Rao specialises in high-risk obstetrics and minimally invasive gynaecological surgery. She has been instrumental in building MaxCare\'s mother-and-child programme.', 
    schedule:[{day:'Mon/Tue/Thu',time:'09:00–12:00'},{day:'Wednesday',time:'14:00–17:00'},{day:'Friday',time:'09:00–11:00'},{day:'Saturday',time:'By appointment'}] 
  },
  { 
    id:3, name:'Dr. Vikram Singh', spec:'Orthopaedics', qual:'MBBS, MS (Ortho), Fellowship Joint Replacement', 
    exp:22, patients:5800, rating:4.9, initials:'VS', color:'linear-gradient(135deg,#0fa86e,#1ad48f)', 
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200&h=200',
    tags:['Robotic Knee Replacement','Sports Medicine','Spine Surgery'], avail:'Mon–Sat', slots:'11:00 AM – 2:00 PM', 
    bio:'With 22 years of orthopaedic practice and over 2,500 joint replacements, Dr. Vikram Singh is one of the most sought-after knee and hip replacement surgeons.', 
    schedule:[{day:'Mon/Wed/Sat',time:'11:00–14:00'},{day:'Tue/Thu',time:'09:00–12:00'},{day:'Friday',time:'14:00–16:00'},{day:'Sunday',time:'Closed'}] 
  },
  { 
    id:4, name:'Dr. Priya Nair', spec:'Neurology', qual:'MBBS, MD, DM (Neurology) · NIMHANS', 
    exp:12, patients:2800, rating:4.8, initials:'PN', color:'linear-gradient(135deg,#b45309,#d97706)', 
    image: 'https://images.unsplash.com/photo-1559839734-2b71f153678e?auto=format&fit=crop&q=80&w=200&h=200',
    tags:['Stroke','Epilepsy','Movement Disorders'], avail:'Tue–Sat', slots:'02:00 PM – 5:00 PM', 
    bio:'Dr. Priya Nair is a neurologist specialising in stroke management and epilepsy. After her DM from NIMHANS, she completed a stroke fellowship in London.', 
    schedule:[{day:'Tue/Thu/Sat',time:'14:00–17:00'},{day:'Wednesday',time:'10:00–13:00'},{day:'Friday',time:'14:00–16:00'},{day:'Mon/Sun',time:'Emergency only'}] 
  },
];

export const SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM']
