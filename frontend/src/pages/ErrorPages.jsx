import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

function ErrorPage({ code, title, desc, actions }) {
  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 120, fontWeight: 800, background: 'linear-gradient(135deg,#1a5fd4,#1ad48f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: 24 }}>{code}</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#e8edf5', marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 16, color: '#7b8fa8', fontWeight: 300, lineHeight: 1.7, marginBottom: 36 }}>{desc}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {actions.map(a => (
            <Link key={a.label} to={a.to} style={{ padding: '12px 28px', background: a.primary ? 'linear-gradient(135deg,#1a5fd4,#1ad48f)' : 'transparent', border: a.primary ? 'none' : '1px solid rgba(26,95,212,0.3)', borderRadius: 10, color: a.primary ? '#fff' : '#7b8fa8', textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>{a.label}</Link>
          ))}
        </div>
        <div style={{ marginTop: 48, padding: '20px 28px', background: 'rgba(9,21,38,0.9)', border: '1px solid rgba(26,95,212,0.18)', borderRadius: 14, fontSize: 14, color: '#7b8fa8' }}>
          Need help? Call us at <a href="tel:+919876511111" style={{ color: '#1ad48f', textDecoration: 'none' }}>+91 98765 11111</a> or email <a href="mailto:care@maxcareplus.in" style={{ color: '#1ad48f', textDecoration: 'none' }}>care@maxcareplus.in</a>
        </div>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      desc="The page you're looking for doesn't exist or has been moved. Head back to the homepage or use the navigation above."
      actions={[
        { label: 'Go to Homepage', to: '/', primary: true },
        { label: 'Book Appointment', to: '/#book', primary: false },
      ]}
    />
  )
}

export function Unauthorized() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      desc="You don't have permission to view this page. Please log in with the correct account type, or contact the hospital administrator."
      actions={[
        { label: 'Login Again', to: '/login', primary: true },
        { label: 'Go to Homepage', to: '/', primary: false },
      ]}
    />
  )
}
