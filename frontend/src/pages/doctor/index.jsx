import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, StatCard, Button, Modal, Input, Select, Textarea, PageHeader, MCLogo, MCBrandName, SectionDivider, Alert, InfoRow } from '../../components/common/index.jsx'
import { useAuthStore } from '../../store/authStore'

// ── Doctor Dashboard ──────────────────────────────────────────────────────────
export function DoctorDashboard() {
  const { user } = useAuthStore()
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
    refetchInterval: 60000,
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppts = appts.filter(a => a.appointment_date === todayStr)
  const pending = appts.filter(a => a.status === 'pending')
  const confirmed = appts.filter(a => a.status === 'confirmed')
  const completed = appts.filter(a => a.status === 'completed')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Brand header */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#ecfeff,#eff6ff)', border: '1px solid #a5f3fc', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MCLogo size={34} />
          <div>
            <MCBrandName size={17} />
            <div style={{ fontSize: 12, color: '#0891b2', fontWeight: 600, marginTop: 1 }}>Doctor Portal</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{user?.email?.split('@')[0]}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      <PageHeader title="Dashboard" subtitle="Your clinical overview for today" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
        <StatCard label="Today's Schedule" value={todayAppts.length} icon="📅" color="#2563eb" sub="appointments" />
        <StatCard label="Pending Review" value={pending.length} icon="⏳" color="#d97706" />
        <StatCard label="Confirmed Today" value={confirmed.filter(a => a.appointment_date === todayStr).length} icon="✅" color="#16a34a" />
        <StatCard label="Total Completed" value={completed.length} icon="📋" color="#7c3aed" />
      </div>

      {pending.length > 0 && (
        <Alert type="warning">
          ⏳ You have <strong>{pending.length}</strong> appointment{pending.length > 1 ? 's' : ''} pending confirmation. Visit <strong>Appointments</strong> to review.
        </Alert>
      )}

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: 'Syne,sans-serif', color: '#1e293b' }}>
          Today's schedule
          <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 10 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </h3>
        {isLoading ? <Spinner /> : todayAppts.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗓️</div>
              <div style={{ fontWeight: 500 }}>No appointments scheduled for today</div>
            </div>
          )
          : todayAppts.sort((a, b) => a.slot_time?.localeCompare(b.slot_time)).map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#2563eb', minWidth: 48, paddingTop: 2 }}>{a.slot_time?.slice(0, 5)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{a.patient?.full_name || 'Patient'}</div>
                  {a.patient?.phone && <div style={{ fontSize: 12, color: '#94a3b8' }}>+91 {a.patient.phone}</div>}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.reason?.slice(0, 60) || 'General consultation'}</div>
                </div>
              </div>
              <Badge status={a.status} />
            </div>
          ))
        }
      </Card>
    </div>
  )
}

// ── Doctor Appointments ───────────────────────────────────────────────────────
export function DoctorAppointments() {
  const qc = useQueryClient()
  const [prescModal, setPrescModal] = useState(null)
  const [labModal, setLabModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const [pForm, setPForm] = useState({ diagnosis: '', notes: '', items: [] })
  const [lForm, setLForm] = useState({ test_name: '', notes: '' })
  const [pErr, setPErr] = useState('')
  const [lErr, setLErr] = useState('')

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
  })
  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => api.get('/pharmacy/medicines').then(r => r.data),
  })
  const { data: history } = useQuery({
    queryKey: ['patient-history', historyModal?.patient?.id || historyModal?.patient_id],
    queryFn: () => api.get(`/appointments/patient/${historyModal?.patient?.id || historyModal?.patient_id}/history`).then(r => r.data),
    enabled: !!historyModal,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status?new_status=${status}`),
    onSuccess: () => qc.invalidateQueries(['appointments']),
  })

  const createPrx = useMutation({
    mutationFn: d => api.post('/pharmacy/prescriptions', d),
    onSuccess: () => { qc.invalidateQueries(['prescriptions']); setPrescModal(null); setPErr('') },
    onError: e => setPErr(e.response?.data?.detail || 'Failed to save prescription'),
  })

  const updatePrx = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/pharmacy/prescriptions/${id}`, d),
    onSuccess: () => { qc.invalidateQueries(['prescriptions']); setPrescModal(null); setPErr('') },
    onError: e => setPErr(e.response?.data?.detail || 'Update failed'),
  })

  const requestLab = useMutation({
    mutationFn: d => api.post('/lab/', d),
    onSuccess: () => { qc.invalidateQueries(['lab-tests']); setLabModal(null); setLErr('') },
    onError: e => setLErr(e.response?.data?.detail || 'Failed to request test'),
  })

  const addRxItem = () => setPForm(f => ({ ...f, items: [...f.items, { medicine_id: '', dosage: '', frequency: '', duration_days: '', instructions: '' }] }))
  const setRxItem = (i, k, v) => setPForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items } })
  const removeRxItem = i => setPForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const sorted = [...appts].sort((a, b) => {
    const order = { pending: 0, confirmed: 1, completed: 2, cancelled: 3 }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
  })

  const columns = [
    {
      key: 'dt', label: 'Date & Time',
      render: r => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(r.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div style={{ fontSize: 12, color: '#2563eb', fontFamily: 'monospace' }}>{r.slot_time?.slice(0, 5)}</div>
        </div>
      )
    },
    {
      key: 'patient', label: 'Patient',
      render: r => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{r.patient?.full_name || 'Unknown'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {r.patient?.patient_code}
            {r.patient?.blood_group && <span style={{ marginLeft: 8, color: '#dc2626' }}>🩸 {r.patient.blood_group}</span>}
          </div>
          {r.patient?.phone && <div style={{ fontSize: 11, color: '#94a3b8' }}>+91 {r.patient.phone}</div>}
        </div>
      )
    },
    { key: 'reason', label: 'Reason', render: r => <div style={{ fontSize: 12, color: '#64748b', maxWidth: 180 }}>{r.reason?.slice(0, 60) || '—'}</div> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <Button size="sm" variant="ghost" onClick={() => setHistoryModal(r)}>History</Button>
          {r.status === 'pending' && <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'confirmed' })}>Confirm</Button>}
          {r.status === 'confirmed' && (
            <>
              <Button size="sm" variant="success" onClick={() => updateStatus.mutate({ id: r.id, status: 'completed' })}>Complete</Button>
              {r.prescription ? (
                 <Button size="sm" variant="secondary" onClick={() => { 
                   setPrescModal(r); 
                   setPForm({ 
                     diagnosis: r.prescription.diagnosis || '', 
                     notes: r.prescription.notes || '', 
                     items: r.prescription.items?.map(i => ({ 
                       medicine_id: i.medicine_id, 
                       dosage: i.dosage, 
                       frequency: i.frequency, 
                       duration_days: i.duration_days, 
                       instructions: i.instructions 
                     })) || [] 
                   }); 
                   setPErr('');
                 }}>Edit Rx</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => { setPrescModal(r); setPForm({ diagnosis: '', notes: '', items: [] }); setPErr('') }}>Prescribe</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => { setLabModal(r); setLForm({ test_name: '', notes: '' }); setLErr('') }}>Lab Test</Button>
            </>
          )}
        </div>
      )
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Appointments" subtitle={`${appts.length} appointments assigned`} />
      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={sorted} emptyMsg="No appointments assigned yet" />
        }
      </Card>

      {/* Patient History Modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`Patient History — ${historyModal?.patient?.full_name || 'Patient'}`} width={600}>
        {historyModal && !history && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
        {history && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Patient card */}
            <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', fontFamily: 'Syne,sans-serif' }}>{history.patient.full_name}</div>
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>{history.patient.patient_code}</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginTop: 6, flexWrap: 'wrap' }}>
                {history.patient.blood_group && <span>🩸 {history.patient.blood_group}</span>}
                {history.patient.gender && <span>👤 {history.patient.gender}</span>}
                {history.patient.phone && <span>📞 +91 {history.patient.phone}</span>}
                {history.patient.dob && <span>🎂 {new Date(history.patient.dob).toLocaleDateString('en-IN')}</span>}
              </div>
            </div>

            {/* Past appointments */}
            {history.appointments.length > 0 && (
              <div>
                <SectionDivider label={`${history.appointments.length} Past Visits`} />
                {history.appointments.slice(0, 6).map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 9, marginBottom: 6, border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {a.time}</div>
                      {a.doctor && <div style={{ fontSize: 11, color: '#7c3aed' }}>{a.doctor.name} · {a.doctor.spec}</div>}
                      {a.reason && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.reason.slice(0, 80)}</div>}
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Past prescriptions */}
            {history.prescriptions.length > 0 && (
              <div>
                <SectionDivider label={`${history.prescriptions.length} Prescriptions`} />
                {history.prescriptions.slice(0, 4).map(p => (
                  <div key={p.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 9, marginBottom: 6, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{p.diagnosis || 'Prescription'} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {p.date}</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {p.medicines.map((m, i) => <span key={i} style={{ padding: '2px 9px', borderRadius: 100, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 11, color: '#5b21b6' }}>{m.name} ({m.dosage})</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {history.appointments.length === 0 && history.prescriptions.length === 0 && (
              <Alert type="info">No prior medical history recorded for this patient at MaxCare+.</Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Prescription Modal */}
      <Modal open={!!prescModal} onClose={() => setPrescModal(null)} title={`Prescription — ${prescModal?.patient?.full_name || 'Patient'}`} width={640}>
        {prescModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Diagnosis *" value={pForm.diagnosis} onChange={e => setPForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Primary diagnosis" required />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 8 }}>Medicines</div>
              {pForm.items.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>No medicines added yet. Click below to add.</div>}
              {pForm.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 60px auto', gap: 7, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Medicine</div>}
                    <select value={item.medicine_id} onChange={e => setRxItem(i, 'medicine_id', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }}>
                      <option value="">Select medicine</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Dosage</div>}
                    <input placeholder="500mg" value={item.dosage} onChange={e => setRxItem(i, 'dosage', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Frequency</div>}
                    <input placeholder="Twice daily" value={item.frequency} onChange={e => setRxItem(i, 'frequency', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    {i === 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Days</div>}
                    <input type="number" placeholder="7" value={item.duration_days} onChange={e => setRxItem(i, 'duration_days', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>
                  <button onClick={() => removeRxItem(i)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', cursor: 'pointer', padding: '8px 10px', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={addRxItem}>+ Add medicine</Button>
            </div>
            <Textarea label="Additional Notes for Patient" rows={2} value={pForm.notes} onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} placeholder="Take after meals. Complete the full course." />
            {pErr && <Alert type="danger">{pErr}</Alert>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setPrescModal(null)}>Cancel</Button>
              <Button variant="brand" loading={createPrx.isPending || updatePrx.isPending} disabled={!pForm.diagnosis || pForm.items.length === 0 || pForm.items.some(i => !i.medicine_id)}
                onClick={() => {
                  const payload = {
                    appointment_id: prescModal.id, diagnosis: pForm.diagnosis, notes: pForm.notes,
                    items: pForm.items.map(i => ({ medicine_id: i.medicine_id, dosage: i.dosage, frequency: i.frequency, duration_days: parseInt(i.duration_days) || null, instructions: i.instructions || null }))
                  };
                  if (prescModal.prescription) {
                    updatePrx.mutate({ id: prescModal.prescription.id, ...payload });
                  } else {
                    createPrx.mutate(payload);
                  }
                }}>
                {prescModal.prescription ? 'Update (New Version)' : 'Save Prescription'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lab Test Modal */}
      <Modal open={!!labModal} onClose={() => setLabModal(null)} title={`Request Lab Test — ${labModal?.patient?.full_name || 'Patient'}`} width={420}>
        {labModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Test Name *" value={lForm.test_name} onChange={e => setLForm(f => ({ ...f, test_name: e.target.value }))} placeholder="CBC, Blood Glucose, X-Ray, MRI..." required />
            <Textarea label="Clinical Indication" rows={2} value={lForm.notes} onChange={e => setLForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for ordering this test" />
            {lErr && <Alert type="danger">{lErr}</Alert>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setLabModal(null)}>Cancel</Button>
              <Button variant="brand" loading={requestLab.isPending} disabled={!lForm.test_name}
                onClick={() => requestLab.mutate({ appointment_id: labModal.id, ...lForm })}>
                Request Test
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Doctor Prescriptions ──────────────────────────────────────────────────────
export function DoctorPrescriptions() {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get('/pharmacy/prescriptions').then(r => r.data),
  })

  const columns = [
    { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'diagnosis', label: 'Diagnosis', render: r => <span style={{ fontWeight: 500 }}>{r.diagnosis || '—'}</span> },
    { key: 'medicines', label: 'Medicines', render: r => <div style={{ fontSize: 12, color: '#64748b' }}>{r.items?.map(i => i.medicine?.name).filter(Boolean).join(', ') || '—'}</div> },
    { key: 'notes', label: 'Notes', render: r => r.notes ? <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 160 }}>{r.notes.slice(0, 60)}</div> : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Prescriptions Written" subtitle={`${prescriptions.length} prescriptions`} />
      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={prescriptions} emptyMsg="No prescriptions written yet" />}
      </Card>
    </div>
  )
}

// ── Doctor Lab Tests ──────────────────────────────────────────────────────────
export function DoctorLab() {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['lab-tests'],
    queryFn: () => api.get('/lab/').then(r => r.data),
  })

  const columns = [
    { key: 'requested_at', label: 'Date', render: r => new Date(r.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
    { key: 'test_name', label: 'Test Name', render: r => <span style={{ fontWeight: 500 }}>{r.test_name}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'result', label: 'Result', render: r => r.result ? <div style={{ fontSize: 12, maxWidth: 200, color: '#16a34a' }}>{r.result.slice(0, 80)}</div> : <span style={{ color: '#94a3b8', fontSize: 12 }}>Awaiting</span> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Lab Tests Requested" subtitle={`${tests.length} tests`} />
      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={tests} emptyMsg="No lab tests requested yet" />}
      </Card>
    </div>
  )
}

// ── Doctor — My Patients (all patients with history access) ───────────────────
export function DoctorPatients() {
  const [historyPatientId, setHistoryPatientId] = useState(null)
  const [historyName, setHistoryName] = useState('')

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients/').then(r => r.data),
  })

  const { data: history } = useQuery({
    queryKey: ['patient-history', historyPatientId],
    queryFn: () => api.get(`/appointments/patient/${historyPatientId}/history`).then(r => r.data),
    enabled: !!historyPatientId,
  })

  const columns = [
    { key: 'patient_code', label: 'ID', render: r => <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#eff6ff', padding: '2px 8px', borderRadius: 6, color: '#1e40af' }}>{r.patient_code}</span> },
    { key: 'full_name', label: 'Name', render: r => <span style={{ fontWeight: 600 }}>{r.full_name}</span> },
    { key: 'blood_group', label: 'Blood', render: r => r.blood_group ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.blood_group}</span> : '—' },
    { key: 'phone', label: 'Mobile', render: r => r.phone ? `+91 ${r.phone}` : '—' },
    { key: 'gender', label: 'Gender', render: r => r.gender || '—' },
    { key: 'actions', label: 'History', render: r => <Button size="sm" variant="ghost" onClick={() => { setHistoryPatientId(r.id); setHistoryName(r.full_name) }}>View →</Button> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="My Patients" subtitle={`${patients.length} registered patients`} />
      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={patients} emptyMsg="No patients yet" />}
      </Card>

      <Modal open={!!historyPatientId} onClose={() => setHistoryPatientId(null)} title={`Medical Record — ${historyName}`} width={600}>
        {!history && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
        {history && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Syne,sans-serif' }}>{history.patient.full_name}</div>
              <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{history.patient.patient_code}</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginTop: 6, flexWrap: 'wrap' }}>
                {history.patient.blood_group && <span>🩸 {history.patient.blood_group}</span>}
                {history.patient.gender && <span>👤 {history.patient.gender}</span>}
                {history.patient.phone && <span>📞 +91 {history.patient.phone}</span>}
              </div>
            </div>
            {history.appointments.length > 0 && (
              <>
                <SectionDivider label={`${history.appointments.length} Visits`} />
                {history.appointments.slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {a.reason && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{a.reason.slice(0, 80)}</div>}
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))}
              </>
            )}
            {history.prescriptions.length > 0 && (
              <>
                <SectionDivider label={`${history.prescriptions.length} Prescriptions`} />
                {history.prescriptions.slice(0, 4).map(p => (
                  <div key={p.id} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid #f1f5f9', marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.diagnosis} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {p.date}</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                      {p.medicines.map((m, i) => <span key={i} style={{ padding: '2px 8px', borderRadius: 100, background: '#f5f3ff', fontSize: 11, color: '#5b21b6' }}>{m.name}</span>)}
                    </div>
                  </div>
                ))}
              </>
            )}
            {history.appointments.length === 0 && <Alert type="info">No prior history at MaxCare+ for this patient.</Alert>}
          </div>
        )}
      </Modal>
    </div>
  )
}
