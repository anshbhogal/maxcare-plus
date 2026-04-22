import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, Button, Modal, PageHeader, SectionDivider, Input, Alert } from '../../components/common/index.jsx'
import Invoice from '../../components/common/Invoice.jsx'

export default function AdminBilling() {
  const qc = useQueryClient()
  const [selectedBill, setSelectedBill] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [listSearch, setListSearch] = useState('')
  
  // Search state for generator
  const [phoneSearch, setPhoneSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null) // { patient, appointments }
  const [searchErr, setSearchErr] = useState('')

  const [newBill, setNewBill] = useState({ appointment_id: '', items: [{ description: 'Consultation Fee', amount: '500' }] })

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['admin-bills'],
    queryFn: () => api.get('/billing/').then(r => r.data),
  })

  const filteredBills = bills.filter(b => !listSearch || b.patient?.phone?.includes(listSearch))

  const handleSearch = async () => {
    if (phoneSearch.length < 10) return
    setSearching(true)
    setSearchErr('')
    setSearchResult(null)
    try {
      // 1. Find patient by phone
      const pRes = await api.get(`/patients/?phone=${phoneSearch}`)
      const patient = pRes.data.find(p => p.phone === phoneSearch)
      
      if (!patient) {
        setSearchErr('No patient found with this mobile number.')
      } else {
        // 2. Get appointments for this patient
        const aRes = await api.get(`/appointments/?patient_id=${patient.id}`)
        // Filter for completed/confirmed appts without a bill
        const pendingAppts = aRes.data.filter(a => !a.bill && a.status !== 'cancelled')
        setSearchResult({ patient, appointments: pendingAppts })
      }
    } catch (err) {
      setSearchErr('Error searching for patient.')
    } finally {
      setSearching(false)
    }
  }

  const createBill = useMutation({
    mutationFn: (data) => api.post('/billing/', data),
    onSuccess: () => {
      qc.invalidateQueries(['admin-bills'])
      setCreateModal(false)
      setNewBill({ appointment_id: '', items: [{ description: 'Consultation Fee', amount: '500' }] })
      setSearchResult(null)
      setPhoneSearch('')
    }
  })

  const addItem = () => setNewBill(b => ({ ...b, items: [...b.items, { description: '', amount: '' }] }))
  const updateItem = (idx, key, val) => setNewBill(b => {
    const items = [...b.items]
    items[idx] = { ...items[idx], [key]: val }
    return { ...b, items }
  })

  const total = newBill.items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)

  const columns = [
    { key: 'billed_at', label: 'Date', render: r => new Date(r.billed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
    { key: 'patient', label: 'Patient', render: r => <div style={{ fontWeight: 600 }}>{r.patient?.full_name}</div> },
    { key: 'amount', label: 'Total', render: r => <div style={{ fontWeight: 700, color: 'var(--blue)' }}>₹{parseFloat(r.total_amount).toLocaleString('en-IN')}</div> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.payment_status} /> },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => setSelectedBill(r)}>View & Print</Button>
          {r.payment_status !== 'paid' && (
             <Button size="sm" variant="success" onClick={() => api.patch(`/billing/${r.id}/pay?payment_method=Cash`).then(() => qc.invalidateQueries(['admin-bills']))}>Mark Paid</Button>
          )}
        </div>
      )
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PageHeader title="Billing & Invoices" subtitle="Generate bills by patient mobile number" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 280 }}>
            <span className="icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--text-dim)' }}>search</span>
            <input 
              type="text" 
              placeholder="Search mobile number..." 
              value={listSearch}
              onChange={e => setListSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 12, border: '1px solid var(--border)', outline: 'none', fontSize: 13, background: 'white' }}
            />
          </div>
          <Button onClick={() => setCreateModal(true)} icon="add">New Billing Request</Button>
        </div>
      </div>

      <Card>
        {isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : (
          <Table columns={columns} data={filteredBills} emptyMsg="No bills generated yet." />
        )}
      </Card>

      {/* Bill View/Print Modal */}
      <Modal open={!!selectedBill} onClose={() => setSelectedBill(null)} width={800} title="Invoice Preview">
        {selectedBill && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <Button onClick={() => window.print()} icon="print">Print / Save PDF</Button>
            </div>
            <Invoice bill={selectedBill} />
          </div>
        )}
      </Modal>

      {/* Create Bill Modal */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); setSearchResult(null); setPhoneSearch(''); }} title="Generate Bill" width={550}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Step A: Search by Phone */}
          {!searchResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Enter Patient Mobile Number</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid var(--border)', outline: 'none', fontSize: 16, fontWeight: 600 }}
                  placeholder="98765 XXXXX"
                  value={phoneSearch}
                  onChange={e => setPhoneSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button loading={searching} onClick={handleSearch} disabled={phoneSearch.length < 10}>Search</Button>
              </div>
              {searchErr && <Alert type="danger">{searchErr}</Alert>}
            </div>
          )}

          {/* Step B: Select Appointment and Add Items */}
          {searchResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '14px', background: 'var(--navy-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Patient Identified</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{searchResult.patient.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>ID: {searchResult.patient.patient_code} · Phone: +91 {searchResult.patient.phone}</div>
              </div>

              {searchResult.appointments.length === 0 ? (
                <Alert type="warning">No unbilled appointments found for this patient.</Alert>
              ) : (
                <>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Select Appointment to Bill</label>
                    <select 
                      style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', outline: 'none', fontWeight: 600 }}
                      value={newBill.appointment_id}
                      onChange={e => setNewBill({ ...newBill, appointment_id: e.target.value })}
                    >
                      <option value="">Choose appointment date...</option>
                      {searchResult.appointments.map(a => (
                        <option key={a.id} value={a.id}>{new Date(a.appointment_date).toLocaleDateString()} — {a.doctor?.specialization} ({a.status})</option>
                      ))}
                    </select>
                  </div>

                  <SectionDivider label="Itemized Charges" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {newBill.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 10, alignItems: 'center' }}>
                        <input style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} placeholder="e.g. Blood Test" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                        <input style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} placeholder="Amount" type="number" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} />
                        {idx > 0 && <button onClick={() => setNewBill(b => ({ ...b, items: b.items.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', color: '#ef4444' }}><span className="icon" style={{ fontSize: 20 }}>delete</span></button>}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" onClick={addItem}>+ Add Another Charge</Button>
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>Total: ₹{total.toLocaleString('en-IN')}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <Button variant="ghost" onClick={() => setSearchResult(null)}>Back</Button>
                       <Button 
                        loading={createBill.isPending}
                        disabled={!newBill.appointment_id || newBill.items.some(i => !i.description || !i.amount)}
                        onClick={() => createBill.mutate(newBill)}
                      >Generate Invoice</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
