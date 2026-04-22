import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Spinner, Button, Modal, Input, Select, Badge } from '../../components/common/index.jsx'

export default function AdminPharmacy() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [newStock, setNewStock] = useState('')
  const [form, setForm] = useState({ name: '', category: '', unit: '', stock_quantity: 0, price: '' })
  const [err, setErr] = useState('')

  const { data: medicines = [], isLoading } = useQuery({ queryKey: ['medicines'], queryFn: () => api.get('/pharmacy/medicines').then(r => r.data) })

  const create = useMutation({
    mutationFn: d => api.post('/pharmacy/medicines', { ...d, stock_quantity: parseInt(d.stock_quantity), price: parseFloat(d.price) }),
    onSuccess: () => { qc.invalidateQueries(['medicines']); setOpen(false) },
    onError: e => setErr(e.response?.data?.detail || 'Failed'),
  })

  const updateStock = useMutation({
    mutationFn: ({ id, qty }) => api.patch(`/pharmacy/medicines/${id}/stock?quantity=${qty}`),
    onSuccess: () => { qc.invalidateQueries(['medicines']); setStockModal(null) },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const stockStatus = qty => qty === 0 ? 'cancelled' : qty < 20 ? 'pending' : 'available'
  const stockLabel = qty => qty === 0 ? 'Out of stock' : qty < 20 ? `Low (${qty})` : `In stock (${qty})`

  const columns = [
    { key: 'name', label: 'Medicine' },
    { key: 'category', label: 'Category', render: r => r.category || '—' },
    { key: 'unit', label: 'Unit', render: r => r.unit || '—' },
    { key: 'price', label: 'Price', render: r => `₹${Number(r.price).toFixed(2)}` },
    { key: 'stock', label: 'Stock', render: r => <Badge status={stockStatus(r.stock_quantity)} label={stockLabel(r.stock_quantity)} /> },
    { key: 'actions', label: '', render: r => <Button size="sm" variant="secondary" onClick={() => { setStockModal(r); setNewStock(r.stock_quantity) }}>Update Stock</Button> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Pharmacy</h1><p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{medicines.length} medicines</p></div>
        <Button onClick={() => setOpen(true)}>+ Add Medicine</Button>
      </div>
      <Card>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          : <Table columns={columns} data={medicines} emptyMsg="No medicines added yet" />}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Medicine">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}><Input label="Medicine Name *" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Select</option>
            {['Analgesic','Antibiotic','Antacid','Antidiabetic','Antihypertensive','Vitamin','Other'].map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)}>
            <option value="">Select</option>
            {['tablet','capsule','syrup','injection','cream','drops'].map(u => <option key={u}>{u}</option>)}
          </Select>
          <Input label="Stock Quantity" type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} />
          <Input label="Price (₹) *" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
          {err && <div style={{ gridColumn: '1/-1', color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={() => create.mutate(form)}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Update Stock — ${stockModal?.name}`} width={360}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="New Quantity" type="number" value={newStock} onChange={e => setNewStock(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setStockModal(null)}>Cancel</Button>
            <Button loading={updateStock.isPending} onClick={() => updateStock.mutate({ id: stockModal.id, qty: parseInt(newStock) })}>Update</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
