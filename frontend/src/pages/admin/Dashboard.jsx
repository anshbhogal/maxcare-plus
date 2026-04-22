import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../api/client'
import { StatCard, Card, Spinner, MCLogo, MCBrandName } from '../../components/common/index.jsx'
import { useAuthStore } from '../../store/authStore'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 30000,
  })
  const { data: recentAppts = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.get('/appointments/').then(r => r.data),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spinner size="lg" />
    </div>
  )

  const pending = recentAppts.filter(a => a.status === 'pending')
  const apptData = [
    { name: 'Total', value: stats?.appointments?.total || 0 },
    { name: 'Today', value: stats?.appointments?.today || 0 },
    { name: 'Pending', value: stats?.appointments?.pending || 0 },
  ]
  const bedData = [
    { name: 'Available', value: stats?.beds?.available || 0 },
    { name: 'Occupied', value: stats?.beds?.occupied || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <MCLogo size={28} />
            <MCBrandName size={20} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', fontFamily: 'Syne,sans-serif' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Hospital overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, color: '#94a3b8' }}>
          <div>{user?.email}</div>
          <div style={{ color: '#7c3aed', fontWeight: 600 }}>Administrator</div>
        </div>
      </div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: '#92400e' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <span><strong>{pending.length}</strong> appointment request{pending.length > 1 ? 's' : ''} waiting for confirmation</span>
          </div>
          <Link to="/admin/appointments" style={{ fontSize: 13, fontWeight: 600, color: '#d97706', textDecoration: 'none' }}>Review now →</Link>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        <StatCard label="Total Patients" value={stats?.patients || 0} icon="👤" color="#2563eb" />
        <StatCard label="Total Doctors" value={stats?.doctors || 0} icon="🩺" color="#16a34a" />
        <StatCard label="Today's Appointments" value={stats?.appointments?.today || 0} icon="📅" color="#d97706" sub={`${stats?.appointments?.pending || 0} pending review`} />
        <StatCard label="Active Admissions" value={stats?.active_admissions || 0} icon="🛏️" color="#dc2626" sub={`${stats?.beds?.available || 0} beds available`} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20 }}>
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'Syne,sans-serif' }}>Appointments overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={apptData} barSize={36}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Bar dataKey="value" fill="url(#grad)" radius={[6,6,0,0]} />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, fontFamily: 'Syne,sans-serif', alignSelf: 'flex-start' }}>Bed occupancy</h3>
          <PieChart width={150} height={150}>
            <Pie data={bedData} cx={70} cy={70} innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
              <Cell fill="#16a34a" /><Cell fill="#dc2626" />
            </Pie>
            <Tooltip />
          </PieChart>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#16a34a' }} />Free</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#dc2626' }} />Used</div>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, fontFamily: 'Syne,sans-serif' }}>Quick actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'View Appointments', href: '/admin/appointments', icon: '📅', color: '#eff6ff', tc: '#1e40af' },
              { label: 'Add Doctor', href: '/admin/doctors', icon: '🩺', color: '#f0fdf4', tc: '#14532d' },
              { label: 'Patient Records', href: '/admin/patients', icon: '👤', color: '#f5f3ff', tc: '#4c1d95' },
              { label: 'Lab Tests', href: '/admin/lab', icon: '🔬', color: '#ecfeff', tc: '#164e63' },
            ].map(a => (
              <Link key={a.label} to={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: a.color, borderRadius: 9, textDecoration: 'none', color: a.tc, fontWeight: 500, fontSize: 13, transition: 'opacity .15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>{a.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent pending appointments */}
      {pending.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: 'Syne,sans-serif' }}>Pending appointment requests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.slice(0, 5).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                    {a.patient?.full_name || 'Walk-in Patient'}
                    {a.patient?.phone && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>· +91 {a.patient.phone}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {a.doctor?.specialization || 'General'} · {new Date(a.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {a.slot_time?.slice(0,5)}
                  </div>
                  {a.reason && <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>{a.reason.slice(0, 80)}</div>}
                </div>
                <Link to="/admin/appointments" style={{ padding: '6px 14px', background: '#2563eb', borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
