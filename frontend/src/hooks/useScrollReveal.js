import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useScrollReveal(trigger) {
  const { pathname } = useLocation()

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          // Once visible, we can stop observing this specific element
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

    const elements = document.querySelectorAll('.reveal')
    elements.forEach(el => {
      // If it's already visible (from a previous step/render), don't re-observe
      if (!el.classList.contains('visible')) {
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [pathname, trigger]) // Re-run on route change OR custom trigger (like step change)
}
