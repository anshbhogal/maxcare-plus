import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, Button, Modal, Input, Select, PhoneInput, EmailInput, Textarea, PageHeader, Alert, InfoRow, SectionDivider } from '../../components/common/index.jsx'

const SPECIALIZATIONS = [
  'Cardiology','Neurology','Orthopaedics','Oncology','Paediatrics',
  'Gynaecology & Obstetrics','Ophthalmology','Pulmonology','Gastroenterology',
  'Nephrology','General Medicine','General Surgery','Dermatology',
  'Psychiatry','Radiology','Anaesthesiology','ENT','Dentistry','Urology',
]

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']

function DoctorForm({ initial = {}, onSave, onCancel, loading, error }) {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', specialization: '',
    license_no: '', phone: '', experience_years: '', qualifications: '',
    bio: '', consultation_fee: '', available_days: '', available_time: '',
    ...initial,
  })
  const [phoneErr, setPhoneErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhone = (v) => {
    set('phone', v)
    setPhoneErr(v.length > 0 && v.length < 10 ? 'Must be 10 digits' : '')
  }

  const isEdit = !!initial.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionDivider label="Account Details" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Input label="Full Name" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dr. First Last" />
        </div>
        <EmailInput label="Email Address" required value={form.email} onChange={v => set('email', v)} disabled={isEdit} />
        {!isEdit && <Input label="Password" required type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />}
      </div>

      <SectionDivider label="Professional Details" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Select label="Specialization" required value={form.specialization} onChange={e => set('specialization', e.target.value)}>
          <option value="">Select specialization</option>
          {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
        </Select>
        <Input label="Medical License No." required value={form.license_no} onChange={e => set('license_no', e.target.value)} placeholder="MCI/State reg. number" />
        <PhoneInput label="Mobile Number" value={form.phone} onChange={handlePhone} error={phoneErr} />
        <Input label="Experience (years)" type="number" min={0} value={form.experience_years} onChange={e => set('experience_years', e.target.value)} />
        <div style={{ gridColumn: '1/-1' }}>
          <Input label="Qualifications" value={form.qualifications} onChange={e => set('qualifications', e.target.value)} placeholder="MBBS, MD (Cardiology), DM · AIIMS Delhi" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <Textarea label="Short Bio" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Brief professional summary..." />
        </div>
      </div>

      <SectionDivider label="Availability & Fees" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        <Input label="Consultation Fee (₹)" type="number" value={form.consultation_fee} onChange={e => set('consultation_fee', e.target.value)} placeholder="500" />
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          variant="brand"
          loading={loading}
          disabled={!form.full_name || !form.email || (!isEdit && !form.password) || !form.specialization || !form.license_no || phoneErr}
          onClick={() => onSave(form)}
        >
          {isEdit ? 'Save Changes' : 'Add Doctor'}
        </Button>
      </div>
    </div>
  )
}

function ShiftManager({ doctor, onCancel }) {
  const qc = useQueryClient()
  const [err, setErr] = useState('')
  const [newAssign, setNewAssign] = useState({ shift_id: '', day_of_week: 'Monday' })

  const { data: allShifts = [] } = useQuery({
    queryKey: ['admin-shifts'],
    queryFn: () => api.get('/admin/shifts').then(r => r.data)
  })

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['doctor-shifts', doctor.id],
    queryFn: () => api.get(`/admin/doctors/${doctor.id}/shifts`).then(r => r.data)
  })

  const assign = useMutation({
    mutationFn: (d) => api.post(`/admin/doctors/${doctor.id}/shifts`, d),
    onSuccess: () => { qc.invalidateQueries(['doctor-shifts', doctor.id]); setErr('') },
    onError: e => setErr(e.response?.data?.detail || 'Assignment failed')
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/doctors/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries(['doctor-shifts', doctor.id])
  })

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '12px 15px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 700, color: '#1e293b' }}>{doctor.full_name}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{doctor.specialization}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Current Assignments</div>
        {isLoading ? <Spinner size="sm" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignments.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No shifts assigned yet.</div>}
            {assignments.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.day_of_week}</span>
                  <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{a.shift.name} ({a.shift.start_time.slice(0,5)} - {a.shift.end_time.slice(0,5)})</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)} style={{ color: '#ef4444' }}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionDivider label="Assign New Shift" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: 10, alignItems: 'end' }}>
        <Select label="Day" value={newAssign.day_of_week} onChange={e => setNewAssign(f => ({ ...f, day_of_week: e.target.value }))}>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select label="Shift" value={newAssign.shift_id} onChange={e => setNewAssign(f => ({ ...f, shift_id: e.target.value }))}>
          <option value="">Select shift</option>
          {allShifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0,5)})</option>)}
        </Select>
        <Button 
          variant="brand" 
          disabled={!newAssign.shift_id || assign.isPending} 
          onClick={() => assign.mutate(newAssign)}
        >
          Add
        </Button>
      </div>
      {err && <Alert type="danger">{err}</Alert>}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Button variant="secondary" onClick={onCancel}>Close</Button>
      </div>
    </div>
  )
}

export default function AdminDoctors() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState(null)
  const [viewDoctor, setViewDoctor] = useState(null)
  const [shiftDoctor, setShiftDoctor] = useState(null)
  const [err, setErr] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: () => api.get('/doctors/?include_unavailable=true').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: d => api.post('/doctors/', {
      ...d,
      email: d.email.toLowerCase(),
      experience_years: d.experience_years ? parseInt(d.experience_years) : null,
      consultation_fee: d.consultation_fee ? parseInt(d.consultation_fee) : null,
    }),
    onSuccess: () => { qc.invalidateQueries(['doctors-all']); qc.invalidateQueries(['doctors']); setAddOpen(false); setErr('') },
    onError: e => setErr(e.response?.data?.detail || 'Failed to add doctor'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/doctors/${id}`, {
      ...d,
      experience_years: d.experience_years ? parseInt(d.experience_years) : null,
      consultation_fee: d.consultation_fee ? parseInt(d.consultation_fee) : null,
    }),
    onSuccess: () => { qc.invalidateQueries(['doctors-all']); qc.invalidateQueries(['doctors']); setEditDoctor(null); setErr('') },
    onError: e => setErr(e.response?.data?.detail || 'Update failed'),
  })

  const toggleAvail = useMutation({
    mutationFn: ({ id, is_available }) => api.patch(`/doctors/${id}`, { is_available }),
    onSuccess: () => { qc.invalidateQueries(['doctors-all']); qc.invalidateQueries(['doctors']) },
  })

  const columns = [
    {
      key: 'employee_id', label: 'Employee ID',
      render: r => r.employee_id
        ? <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f0fdf4', padding: '3px 9px', borderRadius: 6, color: '#15803d', fontWeight: 700, border: '1px solid #bbf7d0' }}>{r.employee_id}</span>
        : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
    },
    {
      key: 'full_name', label: 'Doctor',
      render: r => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {r.full_name?.split(' ').map(n => n[0]).slice(0,2).join('')}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.full_name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.qualifications?.slice(0,40) || 'No qualifications added'}</div>
          </div>
        </div>
      )
    },
    { key: 'specialization', label: 'Specialization', render: r => <span style={{ padding: '3px 10px', background: '#eff6ff', borderRadius: 100, fontSize: 12, color: '#1e40af', fontWeight: 500 }}>{r.specialization}</span> },
    { key: 'experience_years', label: 'Experience', render: r => r.experience_years ? `${r.experience_years} yrs` : '—' },
    { key: 'consultation_fee', label: 'Fee', render: r => r.consultation_fee ? `₹${r.consultation_fee}` : '—' },
    { key: 'phone', label: 'Mobile', render: r => r.phone ? `+91 ${r.phone}` : '—' },
    { key: 'is_available', label: 'Status', render: r => <Badge status={r.is_available ? 'available' : 'inactive'} label={r.is_available ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => setViewDoctor(r)}>View</Button>
          <Button size="sm" variant="secondary" onClick={() => { setEditDoctor(r); setErr('') }}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => setShiftDoctor(r)}>Shifts</Button>
          <Button size="sm" variant={r.is_available ? 'danger' : 'success'} onClick={() => toggleAvail.mutate({ id: r.id, is_available: !r.is_available })}>
            {r.is_available ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      )
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Doctor Management"
        subtitle={`${data.length} doctors registered`}
        action={<Button variant="brand" onClick={() => { setAddOpen(true); setErr('') }}>+ Add Doctor</Button>}
      />

      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={data} emptyMsg="No doctors registered yet. Add your first doctor above." />
        }
      </Card>

      {/* Add Doctor */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Doctor" width={600}>
        <DoctorForm onSave={d => { setErr(''); create.mutate(d) }} onCancel={() => setAddOpen(false)} loading={create.isPending} error={err} />
      </Modal>

      {/* Edit Doctor */}
      <Modal open={!!editDoctor} onClose={() => setEditDoctor(null)} title="Edit Doctor Profile" width={600}>
        {editDoctor && (
          <DoctorForm
            initial={editDoctor}
            onSave={d => { setErr(''); update.mutate({ id: editDoctor.id, ...d }) }}
            onCancel={() => setEditDoctor(null)}
            loading={update.isPending}
            error={err}
          />
        )}
      </Modal>

      {/* View Doctor */}
      <Modal open={!!viewDoctor} onClose={() => setViewDoctor(null)} title="Doctor Profile" width={500}>
        {viewDoctor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, padding: '16px 18px', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 12 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                {viewDoctor.full_name?.split(' ').map(n => n[0]).slice(0,2).join('')}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{viewDoctor.full_name}</div>
                <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{viewDoctor.specialization}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{viewDoctor.qualifications}</div>
              </div>
            </div>
            {viewDoctor.bio && <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, padding: '12px 14px', background: '#f8fafc', borderRadius: 10 }}>{viewDoctor.bio}</div>}
            <SectionDivider label="Details" />
            <InfoRow label="License No." value={viewDoctor.license_no} />
            <InfoRow label="Mobile" value={viewDoctor.phone ? `+91 ${viewDoctor.phone}` : null} />
            <InfoRow label="Experience" value={viewDoctor.experience_years ? `${viewDoctor.experience_years} years` : null} />
            <InfoRow label="Consultation Fee" value={viewDoctor.consultation_fee ? `₹${viewDoctor.consultation_fee}` : null} />
            <InfoRow label="Status" value={viewDoctor.is_available ? 'Active' : 'Inactive'} />
          </div>
        )}
      </Modal>

      {/* Shift Management */}
      <Modal open={!!shiftDoctor} onClose={() => setShiftDoctor(null)} title="Manage Work Shifts" width={500}>
        {shiftDoctor && <ShiftManager doctor={shiftDoctor} onCancel={() => setShiftDoctor(null)} />}
      </Modal>
    </div>
  )
}
