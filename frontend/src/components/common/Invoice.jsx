import React from 'react'
import { MCLogo } from './index.jsx'

export default function Invoice({ bill }) {
  if (!bill) return null

  const patient = bill.patient || {}
  const items = bill.items || []

  // ── Helper: Calculate Age ──
  const calculateAge = (dob) => {
    if (!dob) return 'N/A'
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <div id="printable-invoice" style={{ 
      padding: '40px', background: '#fff', color: '#000', 
      fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%', maxWidth: '800px', margin: '0 auto' 
    }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '30px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MCLogo size={40} />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span style={{ color: '#1a5fd4' }}>Max</span><span style={{ color: '#1ad48f' }}>Care+</span>
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Multi-Speciality Hospital</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#1e293b' }}>INVOICE</h1>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>#{bill.id?.toString().slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      {/* ── PATIENT & INVOICE INFO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Patient Details</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{patient.full_name}</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
            <span><strong>ID:</strong> {patient.patient_code}</span>
            <span><strong>Age/Sex:</strong> {calculateAge(patient.dob)} / {patient.gender || 'N/A'}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            <strong>Phone:</strong> +91 {patient.phone}
          </div>
          {patient.address && (
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              <strong>Address:</strong> {patient.address}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Billing Summary</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}><strong>Date:</strong> {new Date(bill.billed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}><strong>Status:</strong> <span style={{ color: bill.payment_status === 'paid' ? '#16a34a' : '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>{bill.payment_status}</span></div>
          {bill.payment_method && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}><strong>Method:</strong> {bill.payment_method}</div>}
        </div>
      </div>

      {/* ── CHARGE BREAKDOWN ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
            <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Description of Services</th>
            <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '12px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
              <td style={{ padding: '16px 0', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{item.description}</td>
              <td style={{ padding: '16px 0', fontSize: '14px', color: '#1e293b', fontWeight: 600, textAlign: 'right' }}>₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTAL ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '280px', background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>Grand Total</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#1a5fd4' }}>₹{parseFloat(bill.total_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '80px', paddingTop: '30px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>This is a digital copy of the medical invoice issued by MaxCare+ Hospital.</div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Hospital Administrator</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>NABH Accredited · NABL Certified Facility</div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
        }
      `}</style>
    </div>
  )
}
