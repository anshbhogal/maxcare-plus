import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, Button, Modal, Select, Input, Alert, PageHeader } from '../../components/common/index.jsx'

const SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00']

function DoctorAvailability({ doctorId, date }) {
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['doctor-shifts', doctorId],
    queryFn: () => api.get(`/admin/doctors/${doctorId}/shifts`).then(r => r.data),
    enabled: !!doctorId
  })

  const dayName = date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long' }) : ''
  const todayShifts = shifts.filter(s => s.day_of_week === dayName)

  if (isLoading) return <Spinner size="sm" />
  if (!doctorId || !date) return null

  return (
    <div style={{ marginTop: 8, padding: '10px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 6 }}>On-Duty for {dayName}:</div>
      {todayShifts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {todayShifts.map(s => (
            <div key={s.id} style={{ fontSize: 13, color: '#0c4a6e', fontWeight: 600 }}>
              • {s.shift.name} ({s.shift.start_time.slice(0,5)} - {s.shift.end_time.slice(0,5)})
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>⚠ Doctor is OFF-DUTY this day.</div>
      )}
    </div>
  )
}

export default function AdminAppointments() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reassignModal, setReassignModal] = useState(null)
  const [err, setErr] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Booking form state
  const [phone, setPhone] = useState('')
  const [patientInfo, setPatientInfo] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupErr, setLookupErr] = useState('')
  const [dept, setDept] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [reason, setReason] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState('')
  const [newDoctorId, setNewDoctorId] = useState('')

  // Always fetch ALL appointments
  const { data: allAppts = [], isLoading } = useQuery({
    queryKey: ['appointments-admin'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: () => api.get('/doctors/?include_unavailable=true').then(r => r.data),
  })

  // Client-side filter
  const appts = allAppts.filter(a => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    const matchesSearch = !searchTerm || a.patient?.phone?.includes(searchTerm)
    return matchesStatus && matchesSearch
  })

  const specializations = [...new Set(doctors.map(d => d.specialization))].sort()
  const deptDoctors = dept ? doctors.filter(d => d.specialization === dept) : []
  const pendingCount = allAppts.filter(a => a.status === 'pending').length
  const today = new Date().toISOString().split('T')[0]

  // ── Patient lookup by phone ────────────────────────────────────────────────
  const lookupPatient = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) { setLookupErr('Enter a valid 10-digit mobile number'); return }
    setLookingUp(true); setLookupErr(''); setPatientInfo(null)
    try {
      const { data } = await api.get(`/public/patient-by-phone/${digits}`)
      setPatientInfo(data)
    } catch (e) {
      if (e.response?.status === 404) {
        setLookupErr('New patient — will be registered on booking.')
        setPatientInfo({ full_name: '', phone: digits, _new: true })
      } else {
        setLookupErr('Lookup failed. Try again.')
      }
    } finally { setLookingUp(false) }
  }

  // ── Create appointment ─────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: async () => {
      if (!patientInfo || !dept || !doctorId || !apptDate || !slotTime)
        throw new Error('Please fill all required fields')
      if (patientInfo._new) {
        await api.post('/public/appointment-request', {
          full_name: patientInfo.full_name || 'Walk-in Patient',
          phone: phone.replace(/\D/g, ''),
          department: dept,
          preferred_date: apptDate,
          preferred_time: slotTime,
          consultation_type: 'Admin Booking',
          message: reason,
        })
      } else {
        await api.post('/appointments/', {
          patient_id: patientInfo.id,
          doctor_id: doctorId,
          appointment_date: apptDate,
          slot_time: slotTime + ':00',
          reason: reason || dept,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['appointments-admin'])
      qc.invalidateQueries(['appointments'])
      setOpen(false)
      resetForm()
    },
    onError: e => setErr(e.message || e.response?.data?.detail || 'Booking failed'),
  })

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status?new_status=${status}`),
    onSuccess: () => {
      qc.invalidateQueries(['appointments-admin'])
      qc.invalidateQueries(['appointments'])
    },
  })

  // ── Reschedule ─────────────────────────────────────────────────────────────
  const reassign = useMutation({
    mutationFn: ({ id }) => api.patch(`/appointments/${id}/reassign`, {
      appointment_date: newDate,
      slot_time: newSlot + ':00',
      doctor_id: newDoctorId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['appointments-admin'])
      qc.invalidateQueries(['appointments'])
      setReassignModal(null)
    },
    onError: e => setErr(e.response?.data?.detail || 'Reassign failed'),
  })

  const resetForm = () => {
    setPhone(''); setPatientInfo(null); setDept(''); setDoctorId('')
    setApptDate(''); setSlotTime(''); setReason(''); setErr(''); setLookupErr('')
  }

  const sortedAppts = [...appts].sort((a, b) => {
    const order = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 }
    const od = (order[a.status] ?? 9) - (order[b.status] ?? 9)
    if (od !== 0) return od
    return new Date(b.appointment_date) - new Date(a.appointment_date)
  })

  const columns = [
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    {
      key: 'dt', label: 'Date & Time',
      render: r => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {new Date(r.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ fontSize: 12, color: '#2563eb', fontFamily: 'monospace' }}>{r.slot_time?.slice(0, 5)}</div>
        </div>
      )
    },
    {
      key: 'patient', label: 'Patient',
      render: r => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
            {r.patient?.full_name || 'Walk-in Patient'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {r.patient?.patient_code && <span>{r.patient.patient_code}</span>}
            {r.patient?.phone && <span style={{ marginLeft: 6 }}>· +91 {r.patient.phone}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'doctor', label: 'Doctor',
      render: r => r.doctor ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{r.doctor.full_name}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.doctor.specialization}</div>
        </div>
      ) : '—'
    },
    {
      key: 'reason', label: 'Reason',
      render: r => <div style={{ fontSize: 12, color: '#64748b', maxWidth: 180 }}>{r.reason?.slice(0, 80) || '—'}</div>
    },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {r.status === 'pending' && (
            <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'confirmed' })}>
              Confirm
            </Button>
          )}
          {r.status === 'confirmed' && (
            <Button size="sm" variant="success" onClick={() => updateStatus.mutate({ id: r.id, status: 'completed' })}>
              Complete
            </Button>
          )}
          {['pending', 'confirmed'].includes(r.status) && (
            <>
              <Button size="sm" variant="secondary" onClick={() => {
                setReassignModal(r)
                setNewDate(r.appointment_date)
                setNewSlot(r.slot_time?.slice(0, 5) || '')
                setNewDoctorId(r.doctor_id || '')
                setErr('')
              }}>
                Reschedule
              </Button>
              <Button size="sm" variant="danger" onClick={() => {
                if (window.confirm('Cancel this appointment?'))
                  updateStatus.mutate({ id: r.id, status: 'cancelled' })
              }}>
                Cancel
              </Button>
            </>
          )}
        </div>
      )
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Appointments"
        subtitle={`${allAppts.length} total · ${pendingCount > 0 ? `${pendingCount} pending review` : 'all confirmed'}`}
        action={<Button variant="brand" onClick={() => { setOpen(true); resetForm() }}>+ Book Appointment</Button>}
      />

      {pendingCount > 0 && (
        <Alert type="warning">
          <strong>{pendingCount} new appointment request{pendingCount > 1 ? 's' : ''}</strong> from the website or walk-ins are waiting for confirmation below.
        </Alert>
      )}

      {/* Status filter tabs and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['all', 'All', allAppts.length],
            ['pending', 'Pending', allAppts.filter(a => a.status === 'pending').length],
            ['confirmed', 'Confirmed', allAppts.filter(a => a.status === 'confirmed').length],
            ['completed', 'Completed', allAppts.filter(a => a.status === 'completed').length],
            ['cancelled', 'Cancelled', allAppts.filter(a => a.status === 'cancelled').length],
          ].map(([val, label, count]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              style={{
                padding: '7px 16px', borderRadius: 100, fontFamily: 'inherit', cursor: 'pointer',
                border: `1px solid ${statusFilter === val ? '#bfdbfe' : '#e2e8f0'}`,
                background: statusFilter === val ? '#eff6ff' : '#fff',
                color: statusFilter === val ? '#1e40af' : '#64748b',
                fontWeight: statusFilter === val ? 600 : 400, fontSize: 13,
              }}
            >
              {label} {count > 0 && <span style={{ marginLeft: 4, padding: '1px 7px', borderRadius: 100, background: statusFilter === val ? '#bfdbfe' : '#f1f5f9', fontSize: 11 }}>{count}</span>}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 280 }}>
          <span className="icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text-dim)' }}>search</span>
          <input 
            type="text" 
            placeholder="Search mobile number..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value.replace(/\D/g, '').slice(0, 10))}
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: '1px solid var(--border)', outline: 'none', fontSize: 13, background: 'white' }}
          />
        </div>
      </div>

      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={sortedAppts} emptyMsg="No appointments found. Website booking requests appear here automatically." />
        }
      </Card>

      {/* ── Book Appointment Modal ── */}
      <Modal open={open} onClose={() => { setOpen(false); resetForm() }} title="Book New Appointment" width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1: Phone lookup */}
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Step 1 — Identify Patient by Mobile Number
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', flex: 1 }}>
                <div style={{ padding: '9px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 14, color: '#64748b', fontWeight: 500 }}>+91</div>
                <input
                  type="tel" placeholder="10-digit mobile number" value={phone} maxLength={10}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(v)
                    if (patientInfo) setPatientInfo(null)
                    setLookupErr('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && lookupPatient()}
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '0 10px 10px 0', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <Button onClick={lookupPatient} loading={lookingUp} disabled={phone.length !== 10} size="sm">
                Lookup
              </Button>
            </div>
            {lookupErr && <div style={{ fontSize: 12, color: '#d97706', marginTop: 6 }}>{lookupErr}</div>}
            {patientInfo && !patientInfo._new && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, fontSize: 13 }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Found: </span>
                <span style={{ color: '#166534' }}>{patientInfo.full_name} · {patientInfo.patient_code}</span>
                {patientInfo.blood_group && <span style={{ marginLeft: 8, color: '#dc2626' }}>🩸 {patientInfo.blood_group}</span>}
              </div>
            )}
            {patientInfo?._new && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>New patient — enter their full name:</div>
                <input
                  placeholder="Patient full name *"
                  value={patientInfo.full_name}
                  onChange={e => setPatientInfo(p => ({ ...p, full_name: e.target.value }))}
                  style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            )}
          </div>

          {/* Step 2: Department → Doctor → Date/Slot */}
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', opacity: patientInfo ? 1 : 0.5, pointerEvents: patientInfo ? 'all' : 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Step 2 — Appointment Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Department *" value={dept} onChange={e => { setDept(e.target.value); setDoctorId('') }}>
                <option value="">Select department</option>
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>

              <Select label="Doctor *" value={doctorId} onChange={e => setDoctorId(e.target.value)} disabled={!dept}>
                <option value="">{dept ? 'Select doctor' : 'Select department first'}</option>
                {deptDoctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}{d.consultation_fee ? ` — ₹${d.consultation_fee}` : ''}
                  </option>
                ))}
              </Select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Appointment Date *" type="date" min={today} value={apptDate} onChange={e => setApptDate(e.target.value)} />
                <Select label="Time Slot *" value={slotTime} onChange={e => setSlotTime(e.target.value)}>
                  <option value="">Select slot</option>
                  {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>

              <DoctorAvailability doctorId={doctorId} date={apptDate} />

              <Input label="Reason / Notes" value={reason} onChange={e => setReason(e.target.value)} placeholder="Brief reason for visit (optional)" />
            </div>
          </div>

          {err && <Alert type="danger">{err}</Alert>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setOpen(false); resetForm() }}>Cancel</Button>
            <Button
              variant="brand"
              loading={create.isPending}
              disabled={!patientInfo || !dept || !doctorId || !apptDate || !slotTime}
              onClick={() => create.mutate()}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reschedule Modal ── */}
      <Modal open={!!reassignModal} onClose={() => { setReassignModal(null); setErr('') }} title="Reschedule Appointment" width={440}>
        {reassignModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{reassignModal.patient?.full_name || 'Patient'}</div>
              <div style={{ color: '#64748b', marginTop: 2 }}>{reassignModal.doctor?.specialization || 'Appointment'}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                Currently: {new Date(reassignModal.appointment_date).toLocaleDateString('en-IN')} at {reassignModal.slot_time?.slice(0, 5)}
              </div>
            </div>

            <Select label="Reassign to Doctor (optional)" value={newDoctorId} onChange={e => setNewDoctorId(e.target.value)}>
              <option value="">Keep current doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>)}
            </Select>

            <Input label="New Date *" type="date" min={today} value={newDate} onChange={e => setNewDate(e.target.value)} />

            <Select label="New Time Slot *" value={newSlot} onChange={e => setNewSlot(e.target.value)}>
              <option value="">Select slot</option>
              {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>

            <DoctorAvailability doctorId={newDoctorId || reassignModal.doctor_id} date={newDate} />

            {err && <Alert type="danger">{err}</Alert>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setReassignModal(null); setErr('') }}>Cancel</Button>
              <Button
                variant="brand"
                loading={reassign.isPending}
                disabled={!newDate || !newSlot}
                onClick={() => reassign.mutate({ id: reassignModal.id })}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
