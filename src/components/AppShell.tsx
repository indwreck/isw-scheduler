import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { isDarkNow, THEME_LABELS, useTheme, type ThemeChoice } from '../lib/theme'

const NAV = [
  { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
  { to: '/projects', label: 'Projects', icon: FolderIcon },
  { to: '/personnel', label: 'Personnel', icon: PeopleIcon },
  { to: '/equipment', label: 'Equipment', icon: TruckIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
]

export default function AppShell() {
  const { profile, signOut } = useAuth()
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <img src={`${import.meta.env.BASE_URL}logo-mark-white.png`} alt="ISW" />
          <span>Scheduler</span>
        </span>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <span className="spacer" />
        <ThemeMenu />
        {profile && (
          <span className="topbar-user">
            <span className="topbar-name">{profile.full_name}</span>
            <span className={`role-pill role-${profile.role}`}>
              {profile.role === 'admin' ? 'Admin' : 'Manager'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              Sign out
            </button>
          </span>
        )}
      </header>

      <main className="content">
        {!isSupabaseConfigured && (
          <div className="notice">
            Not connected to a database yet. Data shown here is placeholder
            only until the Supabase project is linked.
          </div>
        )}
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to}>
            <n.icon />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

/* ---- Light / dark switcher ---- */

const THEME_ORDER: ThemeChoice[] = ['system', 'light', 'dark']

function ThemeMenu() {
  const [choice, setChoice] = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const dark = isDarkNow(choice)
  return (
    <span className="theme-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm theme-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Appearance: ${THEME_LABELS[choice]}`}
      >
        {dark ? <MoonIcon /> : <SunIcon />}
      </button>
      {open && (
        <div className="theme-pop" role="menu">
          <div className="theme-pop-title">Appearance</div>
          {THEME_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitemradio"
              aria-checked={choice === c}
              className={`theme-opt ${choice === c ? 'on' : ''}`}
              onClick={() => {
                setChoice(c)
                setOpen(false)
              }}
            >
              <span className="theme-check">{choice === c ? '✓' : ''}</span>
              {THEME_LABELS[c]}
            </button>
          ))}
          <div className="theme-pop-note">Saved on this device only.</div>
        </div>
      )}
    </span>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

/* ---- Simple inline icons (no icon library needed) ---- */

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" />
    </svg>
  )
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 7h11v10H2zM13 11h5l3 3v3h-8z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
