import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, Button, Modal, Input, Select } from '../../components/common/index.jsx'

export function AdminLab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [resultModal, setResultModal] = useState(null)
  const [form, setForm] = useState({ appointment_id: '', test_name: '', notes: '' })
  const [result, setResult] = useState('')

  const { data: tests = [], isLoading } = useQuery({ queryKey: ['lab-tests'], queryFn: () => api.get('/lab/').then(r => r.data) })
  const { data: appts = [] } = useQuery({ queryKey: ['appointments'], queryFn: () => api.get('/appointments/').then(r => r.data) })

  const create = useMutation({
    mutationFn: d => api.post('/lab/', d),
    onSuccess: () => { qc.invalidateQueries(['lab-tests']); setOpen(false) },
  })
  const updateResult = useMutation({
    mutationFn: ({ id, result }) => api.patch(`/lab/${id}`, { result, status: 'completed' }),
    onSuccess: () => { qc.invalidateQueries(['lab-tests']); setResultModal(null) },
  })

  const columns = [
    { key: 'requested_at', label: 'Date', render: r => new Date(r.requested_at).toLocaleDateString() },
    { key: 'test_name', label: 'Test' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'result', label: 'Result', render: r => r.result ? r.result.slice(0, 40) + (r.result.length > 40 ? '...' : '') : '—' },
    { key: 'actions', label: '', render: r => r.status !== 'completed' && (
      <Button size="sm" onClick={() => { setResultModal(r); setResult('') }}>Enter Result</Button>
    )},
  ]

  const confirmedAppts = appts.filter(a => ['confirmed','completed'].includes(a.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Laboratory</h1><p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{tests.length} tests</p></div>
        <Button onClick={() => setOpen(true)}>+ Request Test</Button>
      </div>
      <Card>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          : <Table columns={columns} data={tests} emptyMsg="No lab tests yet" />}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Request Lab Test">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Appointment *" value={form.appointment_id} onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}>
            <option value="">Select appointment</option>
            {confirmedAppts.map(a => <option key={a.id} value={a.id}>{a.id.slice(0,8)}... — {a.appointment_date}</option>)}
          </Select>
          <Input label="Test Name *" value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} placeholder="e.g. CBC, Blood Sugar, X-Ray" />
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={() => create.mutate(form)}>Request</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title={`Enter Result — ${resultModal?.test_name}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Result</label>
            <textarea value={result} onChange={e => setResult(e.target.value)} rows={4}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--gray-300)', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setResultModal(null)}>Cancel</Button>
            <Button loading={updateResult.isPending} onClick={() => updateResult.mutate({ id: resultModal.id, result })}>Save Result</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function AdminIPD() {
  const qc = useQueryClient()
  const [admitOpen, setAdmitOpen] = useState(false)
  const [bedOpen, setBedOpen] = useState(false)
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', bed_id: '', diagnosis: '' })
  const [bedForm, setBedForm] = useState({ ward: '', bed_number: '', bed_type: 'general' })

  const { data: beds = [], isLoading: bedsLoading } = useQuery({ queryKey: ['beds'], queryFn: () => api.get('/ipd/beds').then(r => r.data) })
  const { data: admissions = [] } = useQuery({ queryKey: ['admissions'], queryFn: () => api.get('/ipd/admissions').then(r => r.data) })
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => api.get('/patients/').then(r => r.data) })
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors'], queryFn: () => api.get('/doctors/').then(r => r.data) })

  const admit = useMutation({
    mutationFn: d => api.post('/ipd/admissions', d),
    onSuccess: () => { qc.invalidateQueries(['admissions','beds']); setAdmitOpen(false) },
  })
  const discharge = useMutation({
    mutationFn: id => api.patch(`/ipd/admissions/${id}/discharge`),
    onSuccess: () => qc.invalidateQueries(['admissions','beds']),
  })
  const addBed = useMutation({
    mutationFn: d => api.post('/ipd/beds', d),
    onSuccess: () => { qc.invalidateQueries(['beds']); setBedOpen(false) },
  })

  const bedCols = [
    { key: 'bed_number', label: 'Bed No.' },
    { key: 'ward', label: 'Ward' },
    { key: 'bed_type', label: 'Type' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
  ]

  const admCols = [
    { key: 'admission_date', label: 'Admitted', render: r => new Date(r.admission_date).toLocaleDateString() },
    { key: 'patient_id', label: 'Patient', render: r => patients.find(p => p.id === r.patient_id)?.full_name || r.patient_id?.slice(0,8) },
    { key: 'doctor_id', label: 'Doctor', render: r => doctors.find(d => d.id === r.doctor_id)?.full_name || '—' },
    { key: 'diagnosis', label: 'Diagnosis', render: r => r.diagnosis || '—' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'actions', label: '', render: r => r.status === 'admitted' && (
      <Button size="sm" variant="secondary" onClick={() => discharge.mutate(r.id)}>Discharge</Button>
    )},
  ]

  const availableBeds = beds.filter(b => b.status === 'available')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>IPD — Inpatient</h1></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => setBedOpen(true)}>+ Add Bed</Button>
          <Button onClick={() => setAdmitOpen(true)}>+ Admit Patient</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Bed Status ({beds.length} total)</h3>
          {bedsLoading ? <Spinner /> : <Table columns={bedCols} data={beds} emptyMsg="No beds configured" />}
        </Card>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Current Admissions</h3>
          <Table columns={admCols} data={admissions} emptyMsg="No active admissions" />
        </Card>
      </div>

      <Modal open={admitOpen} onClose={() => setAdmitOpen(false)} title="Admit Patient">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Patient *" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
            <option value="">Select patient</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
          <Select label="Doctor *" value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}>
            <option value="">Select doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </Select>
          <Select label="Bed *" value={form.bed_id} onChange={e => setForm(f => ({ ...f, bed_id: e.target.value }))}>
            <option value="">Select available bed</option>
            {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bed_number} — {b.ward} ({b.bed_type})</option>)}
          </Select>
          <Input label="Diagnosis" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAdmitOpen(false)}>Cancel</Button>
            <Button loading={admit.isPending} onClick={() => admit.mutate(form)}>Admit</Button>
          </div>
        </div>
      </Modal>

      <Modal open={bedOpen} onClose={() => setBedOpen(false)} title="Add Bed" width={380}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Ward Name *" value={bedForm.ward} onChange={e => setBedForm(f => ({ ...f, ward: e.target.value }))} placeholder="General Ward / ICU / Private" />
          <Input label="Bed Number *" value={bedForm.bed_number} onChange={e => setBedForm(f => ({ ...f, bed_number: e.target.value }))} placeholder="G-04" />
          <Select label="Type" value={bedForm.bed_type} onChange={e => setBedForm(f => ({ ...f, bed_type: e.target.value }))}>
            <option value="general">General</option>
            <option value="icu">ICU</option>
            <option value="private">Private</option>
          </Select>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setBedOpen(false)}>Cancel</Button>
            <Button loading={addBed.isPending} onClick={() => addBed.mutate(bedForm)}>Add Bed</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
