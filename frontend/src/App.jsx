import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'

// Public (Newly Redesigned)
import Landing from './pages/public/Landing'
import Specializations from './pages/public/Specializations'
import DoctorsDirectory from './pages/public/Doctors'
import BookAppointment from './pages/public/Book'
import SymptomChecker from './pages/public/SymptomChecker'

// Auth
import Login from './pages/Login'
import Register from './pages/Register'
import { NotFound, Unauthorized } from './pages/ErrorPages'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminPatients from './pages/admin/Patients'
import AdminDoctors from './pages/admin/Doctors'
import AdminAppointments from './pages/admin/Appointments'
import AdminBilling from './pages/admin/Billing'
import AdminPharmacy from './pages/admin/Pharmacy'
import { AdminLab, AdminIPD } from './pages/admin/LabIPD'

// Doctor
import { DoctorDashboard, DoctorAppointments, DoctorPrescriptions, DoctorLab, DoctorPatients } from './pages/doctor/index'

// Patient
import { PatientDashboard, PatientAppointments, PatientPrescriptions, PatientLab } from './pages/patient/index'
import { PatientBilling } from './pages/patient/Billing'

function ProtectedRoute({ children, role }) {
  const { user, token } = useAuthStore()

  // Not logged in at all
  if (!token || !user) return <Navigate to="/login" replace />

  // Logged in but wrong role — redirect to login with switch flag
  if (role && user.role !== role) {
    return <Navigate to="/login?switch=true" replace />
  }

  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      {/* ── Public (Modern Redesign) ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/specializations" element={<Specializations />} />
      <Route path="/doctors" element={<DoctorsDirectory />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/symptom-checker" element={<SymptomChecker />} />
      
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/login" element={<Login />} />

      {/* ── Admin Portal ── */}
      <Route path="/admin"              element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/patients"     element={<ProtectedRoute role="admin"><AdminPatients /></ProtectedRoute>} />
      <Route path="/admin/doctors"      element={<ProtectedRoute role="admin"><AdminDoctors /></ProtectedRoute>} />
      <Route path="/admin/appointments" element={<ProtectedRoute role="admin"><AdminAppointments /></ProtectedRoute>} />
      <Route path="/admin/billing"      element={<ProtectedRoute role="admin"><AdminBilling /></ProtectedRoute>} />
      <Route path="/admin/pharmacy"     element={<ProtectedRoute role="admin"><AdminPharmacy /></ProtectedRoute>} />
      <Route path="/admin/lab"          element={<ProtectedRoute role="admin"><AdminLab /></ProtectedRoute>} />
      <Route path="/admin/ipd"          element={<ProtectedRoute role="admin"><AdminIPD /></ProtectedRoute>} />

      {/* ── Doctor Portal ── */}
      <Route path="/doctor"              element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><DoctorAppointments /></ProtectedRoute>} />
      <Route path="/doctor/patients"     element={<ProtectedRoute role="doctor"><DoctorPatients /></ProtectedRoute>} />
      <Route path="/doctor/prescriptions"element={<ProtectedRoute role="doctor"><DoctorPrescriptions /></ProtectedRoute>} />
      <Route path="/doctor/lab"          element={<ProtectedRoute role="doctor"><DoctorLab /></ProtectedRoute>} />

      {/* ── Patient Portal ── */}
      <Route path="/patient"              element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute role="patient"><PatientAppointments /></ProtectedRoute>} />
      <Route path="/patient/billing"      element={<ProtectedRoute role="patient"><PatientBilling /></ProtectedRoute>} />
      <Route path="/patient/prescriptions"element={<ProtectedRoute role="patient"><PatientPrescriptions /></ProtectedRoute>} />
      <Route path="/patient/lab"          element={<ProtectedRoute role="patient"><PatientLab /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
