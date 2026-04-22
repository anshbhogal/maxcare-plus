import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import {
  Card, Table, Badge, Spinner, Button, Modal,
  Input, Select, PageHeader, Alert, InfoRow, SectionDivider, PhoneInput
} from '../../components/common/index.jsx'

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']

// ── Full Patient History Modal ────────────────────────────────────────────────
function PatientHistory({ patientId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: () => api.get(`/appointments/patient/${patientId}/history`).then(r => r.data),
    enabled: !!patientId,
  })
  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
  if (!data) return null
  const { patient, appointments, prescriptions, lab_tests } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Profile card */}
      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
          {patient.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{patient.full_name}</div>
          <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>{patient.patient_code}</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginTop: 5, flexWrap: 'wrap' }}>
            {patient.blood_group && <span>🩸 {patient.blood_group}</span>}
            {patient.gender && <span>👤 {patient.gender}</span>}
            {patient.phone && <span>📞 +91 {patient.phone}</span>}
            {patient.dob && <span>🎂 {new Date(patient.dob).toLocaleDateString('en-IN')}</span>}
          </div>
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'Visits', value: appointments.length, icon: '📅', c: '#2563eb' },
          { label: 'Prescriptions', value: prescriptions.length, icon: '💊', c: '#7c3aed' },
          { label: 'Lab Tests', value: lab_tests.length, icon: '🔬', c: '#0891b2' },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 22, color: s.c }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Appointment history */}
      {appointments.length > 0 && (
        <div>
          <SectionDivider label="Visit History" />
          {appointments.slice(0, 8).map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 9, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {a.time}
                </div>
                {a.doctor && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 1 }}>{a.doctor.name} · {a.doctor.spec}</div>}
                {a.reason && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.reason.slice(0, 80)}</div>}
              </div>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      )}

      {/* Prescriptions */}
      {prescriptions.length > 0 && (
        <div>
          <SectionDivider label="Prescriptions" />
          {prescriptions.slice(0, 4).map(p => (
            <div key={p.id} style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 9, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  {p.diagnosis || 'Prescription'}
                  {p.current_version > 1 && (
                    <span style={{ marginLeft: 8, padding: '1px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 10, fontWeight: 700, verticalAlign: 'middle' }}>
                      v{p.current_version}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.date}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {p.medicines.map((m, i) => (
                  <span key={i} style={{ padding: '2px 9px', borderRadius: 100, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11, color: '#5b21b6' }}>
                    {m.name} {m.dosage && `(${m.dosage})`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lab tests */}
      {lab_tests.length > 0 && (
        <div>
          <SectionDivider label="Lab Tests" />
          {lab_tests.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 9, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{t.test_name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.date}</div>
                {t.result && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3, fontStyle: 'italic' }}>{t.result.slice(0, 80)}</div>}
              </div>
              <Badge status={t.status} />
            </div>
          ))}
        </div>
      )}

      {appointments.length === 0 && prescriptions.length === 0 && lab_tests.length === 0 && (
        <Alert type="info">No medical history recorded yet for this patient at MaxCare+.</Alert>
      )}
    </div>
  )
}

// ── Edit Patient Form ─────────────────────────────────────────────────────────
function EditPatientModal({ patient, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: patient.full_name || '',
    phone: patient.phone || '',
    gender: patient.gender || '',
    blood_group: patient.blood_group || '',
    dob: patient.dob || '',
    address: patient.address || '',
  })
  const [phoneErr, setPhoneErr] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhone = (v) => {
    set('phone', v)
    setPhoneErr(v.length > 0 && v.length < 10 ? 'Must be exactly 10 digits' : '')
  }

  const handleSave = async () => {
    if (form.phone && form.phone.length !== 10) { setPhoneErr('Enter 10 digits'); return }
    setLoading(true); setErr('')
    try {
      await api.patch(`/patients/${patient.id}`, {
        full_name: form.full_name || undefined,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        blood_group: form.blood_group || undefined,
        dob: form.dob || undefined,
        address: form.address || undefined,
      })
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.detail || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, fontSize: 13, color: '#1e40af' }}>
        Editing: <strong>{patient.full_name}</strong> · {patient.patient_code}
      </div>

      <Input label="Full Name *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Mobile Number</label>
        <div style={{ display: 'flex' }}>
          <div style={{ padding: '9px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRight: 'none', borderRadius: '10px 0 0 10px', fontSize: 14, color: '#64748b', fontWeight: 500 }}>+91</div>
          <input
            type="tel" maxLength={10} value={form.phone}
            onChange={e => handlePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            style={{ flex: 1, padding: '9px 12px', border: `1px solid ${phoneErr ? '#dc2626' : '#e2e8f0'}`, borderRadius: '0 10px 10px 0', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        {phoneErr && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{phoneErr}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Select label="Gender" value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="">Select</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </Select>
        <Select label="Blood Group" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
          <option value="">Select</option>
          {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
        </Select>
        <Input label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} max={new Date().toISOString().split('T')[0]} />
        <div /> {/* spacer */}
      </div>

      <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Residential address" />

      {err && <Alert type="danger">{err}</Alert>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="brand" loading={loading} disabled={!form.full_name || !!phoneErr} onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPatients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [historyPatient, setHistoryPatient] = useState(null)
  const [editPatient, setEditPatient] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => api.get(`/patients/?search=${encodeURIComponent(search)}&limit=200`).then(r => r.data),
  })

  const purge = useMutation({
    mutationFn: (id) => api.delete(`/patients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['patients'])
      alert('Patient record purged successfully (Right to be Forgotten).')
    },
    onError: (e) => alert(e.response?.data?.detail || 'Purge failed')
  })

  const handlePurge = (p) => {
    if (window.confirm(`CRITICAL: Purge record for ${p.full_name}? This action is permanent and irrevocable. Required for GDPR compliance.`)) {
      purge.mutate(p.id)
    }
  }

  const columns = [
    {
      key: 'patient_code', label: 'Patient ID',
      render: r => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#eff6ff', padding: '2px 8px', borderRadius: 6, color: '#1e40af', fontWeight: 600 }}>
          {r.patient_code}
        </span>
      )
    },
    {
      key: 'full_name', label: 'Full Name',
      render: r => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {r.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <span style={{ fontWeight: 600 }}>{r.full_name}</span>
        </div>
      )
    },
    { key: 'gender', label: 'Gender', render: r => r.gender || '—' },
    {
      key: 'blood_group', label: 'Blood',
      render: r => r.blood_group
        ? <span style={{ padding: '2px 8px', background: '#fef2f2', borderRadius: 6, color: '#991b1b', fontSize: 12, fontWeight: 700 }}>{r.blood_group}</span>
        : '—'
    },
    { key: 'phone', label: 'Mobile', render: r => r.phone ? `+91 ${r.phone}` : '—' },
    { key: 'email', label: 'Email', render: r => <span style={{ fontSize: 12, color: '#64748b' }}>{r.email}</span> },
    { key: 'dob', label: 'DOB', render: r => r.dob ? new Date(r.dob).toLocaleDateString('en-IN') : '—' },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => setHistoryPatient(r)}>History</Button>
          <Button size="sm" variant="secondary" onClick={() => setEditPatient(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handlePurge(r)} loading={purge.isPending && purge.variables === r.id}>Purge</Button>
        </div>
      )
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Patient Database"
        subtitle={`${data.length} registered patients`}
      />

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by name, patient ID or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={data} emptyMsg="No patients found" />
        }
      </Card>

      {/* History Modal */}
      <Modal
        open={!!historyPatient}
        onClose={() => setHistoryPatient(null)}
        title={`Medical Record — ${historyPatient?.full_name}`}
        width={640}
      >
        {historyPatient && <PatientHistory patientId={historyPatient.id} />}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editPatient}
        onClose={() => setEditPatient(null)}
        title="Edit Patient Details"
        width={520}
      >
        {editPatient && (
          <EditPatientModal
            patient={editPatient}
            onClose={() => setEditPatient(null)}
            onSaved={() => {
              qc.invalidateQueries(['patients'])
              setEditPatient(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
