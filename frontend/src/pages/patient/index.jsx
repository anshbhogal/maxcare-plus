import React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../api/client'
import { Card, Table, Badge, Spinner, StatCard, PageHeader, MCLogo, MCBrandName, InfoRow, SectionDivider, Alert, Button } from '../../components/common/index.jsx'
import { useAuthStore } from '../../store/authStore'

// ── Patient Dashboard ──────────────────────────────────────────────────────────
export function PatientDashboard() {
  const { user } = useAuthStore()

  const deleteRequest = useMutation({
    mutationFn: () => api.post('/patients/me/request-deletion'),
    onSuccess: () => alert('Deletion request received. Your records will be purged after the mandatory retention period (30-day cooling off period).'),
    onError: (e) => alert(e.response?.data?.detail || 'Request failed')
  })
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
  })
  const { data: prescriptions = [] } = useQuery({
    queryKey: ['my-prescriptions'],
    queryFn: () => api.get('/pharmacy/prescriptions').then(r => r.data),
    retry: false,
  })
  const { data: labTests = [] } = useQuery({
    queryKey: ['my-labs'],
    queryFn: () => api.get('/lab/').then(r => r.data),
    retry: false,
  })

  const upcoming = appts.filter(a => ['pending', 'confirmed'].includes(a.status))
  const completed = appts.filter(a => a.status === 'completed')
  const pendingLabs = labTests.filter(l => l.status !== 'completed' && l.status !== 'cancelled')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Brand welcome header */}
      <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', border: '1px solid #bfdbfe', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <MCLogo size={36} />
          <div>
            <MCBrandName size={18} />
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Patient Portal</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{user?.email?.split('@')[0]}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user?.email}</div>
        </div>
      </div>

      <PageHeader title="My Dashboard" subtitle="Your complete health overview at MaxCare+" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
        <StatCard label="Upcoming Appointments" value={upcoming.length} icon="📅" color="#2563eb" />
        <StatCard label="Visits Completed" value={completed.length} icon="✅" color="#16a34a" />
        <StatCard label="Active Prescriptions" value={prescriptions.length} icon="💊" color="#7c3aed" />
        <StatCard label="Pending Lab Reports" value={pendingLabs.length} icon="🔬" color="#d97706" />
      </div>

      {/* Upcoming appointments */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: 'Syne,sans-serif', color: '#1e293b' }}>Upcoming appointments</h3>
        {isLoading ? <Spinner /> : upcoming.length === 0
          ? (
            <div style={{ padding: '28px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>No upcoming appointments</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                Book one at <a href="/#book" style={{ color: '#2563eb', fontWeight: 600 }}>MaxCare+ website</a>
              </div>
            </div>
          )
          : upcoming.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📅</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    {new Date(a.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    <span style={{ fontFamily: 'monospace', marginLeft: 8, color: '#2563eb' }}>{a.slot_time?.slice(0, 5)}</span>
                  </div>
                  {a.doctor && <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 500, marginTop: 2 }}>{a.doctor.full_name} · {a.doctor.specialization}</div>}
                  {a.reason && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{a.reason.slice(0, 80)}</div>}
                </div>
              </div>
              <Badge status={a.status} />
            </div>
          ))
        }
      </Card>

      {/* Recent lab results */}
      {labTests.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, fontFamily: 'Syne,sans-serif' }}>Recent lab tests</h3>
          {labTests.slice(0, 4).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{t.test_name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(t.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <Badge status={t.status} />
            </div>
          ))}
        </Card>
      )}

      {/* Recent prescriptions */}
      {prescriptions.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, fontFamily: 'Syne,sans-serif' }}>Recent prescriptions</h3>
          {prescriptions.slice(0, 3).map(p => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{p.diagnosis || 'Prescription'}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              {p.items?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {p.items.map((i, idx) => (
                    <span key={idx} style={{ padding: '2px 10px', borderRadius: 100, background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: 12, color: '#5b21b6' }}>{i.medicine?.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* GDPR: Right to be Forgotten */}
      <div style={{ marginTop: 20, padding: '20px', border: '1px solid #fee2e2', background: '#fff5f5', borderRadius: 14 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>GDPR: Right to be Forgotten</h4>
        <p style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.6, marginBottom: 16 }}>
          You can request the deletion of your medical records. Note that for legal compliance (HIPAA/DISHA), some records must be retained for a mandatory period (typically 10-15 years) before permanent purging.
        </p>
        <Button 
          variant="danger" 
          size="sm" 
          loading={deleteRequest.isPending}
          onClick={() => {
            if (window.confirm('Are you sure you want to request permanent deletion of your data? This action is irrevocable after the 30-day cooling off period.')) {
              deleteRequest.mutate()
            }
          }}
        >
          Request Data Deletion
        </Button>
      </div>
    </div>
  )
}

// ── Patient Appointments ──────────────────────────────────────────────────────
export function PatientAppointments() {
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
  })

  const columns = [
    { key: 'appointment_date', label: 'Date', render: r => new Date(r.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'slot_time', label: 'Time', render: r => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>{r.slot_time?.slice(0, 5)}</span> },
    { key: 'doctor', label: 'Doctor', render: r => r.doctor ? <div><div style={{ fontWeight: 500 }}>{r.doctor.full_name}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.doctor.specialization}</div></div> : '—' },
    { key: 'reason', label: 'Reason', render: r => <div style={{ fontSize: 13, color: '#64748b', maxWidth: 200 }}>{r.reason?.slice(0, 60) || 'General consultation'}</div> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="My Appointments" subtitle={`${appts.length} appointments on record`} />
      <Card>
        {isLoading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          : <Table columns={columns} data={appts} emptyMsg="No appointments found. Book from the MaxCare+ website." />}
      </Card>
    </div>
  )
}

// ── Patient Prescriptions ─────────────────────────────────────────────────────
export function PatientPrescriptions() {
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['my-prescriptions'],
    queryFn: () => api.get('/pharmacy/prescriptions').then(r => r.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="My Prescriptions" subtitle={`${prescriptions.length} prescriptions from MaxCare+ doctors`} />
      {isLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        : prescriptions.length === 0
          ? <Card><div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}><div style={{ fontSize: 36, marginBottom: 10 }}>💊</div>No prescriptions yet</div></Card>
          : prescriptions.map(p => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{p.diagnosis || 'Prescription'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ padding: '3px 12px', borderRadius: 100, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#15803d', fontWeight: 600 }}>Active</span>
              </div>
              {p.notes && <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>{p.notes}</div>}
              <SectionDivider label="Medicines" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {p.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{item.medicine?.name || 'Medicine'}</div>
                      <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>{item.dosage} · {item.frequency}{item.duration_days ? ` · ${item.duration_days} days` : ''}</div>
                      {item.instructions && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.instructions}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
      }
    </div>
  )
}

// ── Patient Lab Reports ───────────────────────────────────────────────────────
export function PatientLab() {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['my-labs'],
    queryFn: () => api.get('/lab/').then(r => r.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Lab Reports" subtitle={`${tests.length} lab tests ordered`} />
      {isLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        : tests.length === 0
          ? <Card><div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}><div style={{ fontSize: 36, marginBottom: 10 }}>🔬</div>No lab tests ordered yet</div></Card>
          : tests.map(t => (
            <Card key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{t.test_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Requested: {new Date(t.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {t.completed_at && ` · Completed: ${new Date(t.completed_at).toLocaleDateString('en-IN')}`}
                  </div>
                </div>
                <Badge status={t.status} />
              </div>
              {t.result
                ? (
                  <div style={{ marginTop: 14, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Result</div>
                    <div style={{ fontSize: 14, color: '#166534', lineHeight: 1.7 }}>{t.result}</div>
                  </div>
                )
                : (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, fontSize: 13, color: '#92400e' }}>
                    ⏳ Result is being processed. You will be notified on your mobile number.
                  </div>
                )
              }
              {t.notes && <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>Notes: {t.notes}</div>}
            </Card>
          ))
      }
    </div>
  )
}
