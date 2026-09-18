import { useEffect, useState, type FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  DAY_LABELS,
  type CompanySettings,
  type Holiday,
  type InvitedUser,
  type LookupItem,
  type Profile,
} from '../lib/types'

const APP_URL = 'https://indwreck.github.io/isw-scheduler/'

export default function SettingsPage() {
  const { isAdmin } = useAuth()

  return (
    <section>
      <h1 className="page-title">Settings</h1>
      {!isAdmin && (
        <div className="notice">
          Settings are view-only for Managers. An Admin can make changes here.
        </div>
      )}
      <WorkScheduleSection canEdit={isAdmin} />
      <HolidaysSection canEdit={isAdmin} />
      <LookupSection
        canEdit={isAdmin}
        table="equipment_categories"
        title="Equipment categories"
        help="Used to group equipment and for category planning blocks (e.g. “Excavator × 2”)."
        placeholder="New category (e.g. Excavator)"
      />
      <LookupSection
        canEdit={isAdmin}
        table="personnel_roles"
        title="Personnel roles"
        help="Each employee has one primary role. Also used for role planning blocks (e.g. “Operators × 2”)."
        placeholder="New role (e.g. Operator)"
      />
      <InvitesSection canEdit={isAdmin} />
      <UsersSection canEdit={isAdmin} />
    </section>
  )
}

/* =========================================================================
   Work schedule
   ========================================================================= */

function WorkScheduleSection({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState('07:00')
  const [end, setEnd] = useState('15:30')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('company_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setErr(error.message)
          return
        }
        const s = data as CompanySettings
        setSettings(s)
        setDays(s.work_days)
        setStart(s.default_start_time.slice(0, 5))
        setEnd(s.default_end_time.slice(0, 5))
      })
  }, [])

  function toggleDay(d: number) {
    setDays((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort(),
    )
  }

  async function save() {
    if (!supabase) return
    setSaving(true)
    setMsg(null)
    setErr(null)
    const { error } = await supabase
      .from('company_settings')
      .update({
        work_days: days,
        default_start_time: start,
        default_end_time: end,
      })
      .eq('id', 1)
    setSaving(false)
    if (error) setErr(error.message)
    else setMsg('Saved.')
  }

  const dirty =
    settings &&
    (days.join() !== settings.work_days.join() ||
      start !== settings.default_start_time.slice(0, 5) ||
      end !== settings.default_end_time.slice(0, 5))

  return (
    <div className="card section">
      <h2 className="section-title">Company work schedule</h2>
      <p className="section-help">
        The default for every project. Individual projects can override this
        (4-10s, weekend work, etc.).
      </p>

      <div className="field">
        <span>Work days</span>
        <div className="check-row">
          {DAY_LABELS.map((label, d) => (
            <label
              key={d}
              className={`check-chip ${days.includes(d) ? 'on' : ''}`}
            >
              <input
                type="checkbox"
                checked={days.includes(d)}
                disabled={!canEdit}
                onChange={() => toggleDay(d)}
                hidden
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <label className="field">
          <span>Default start time</span>
          <input
            type="time"
            step={900}
            value={start}
            disabled={!canEdit}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Default end time</span>
          <input
            type="time"
            step={900}
            value={end}
            disabled={!canEdit}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      {err && <div className="alert-error" style={{ marginTop: 12 }}>{err}</div>}
      {canEdit && (
        <div className="save-bar">
          <button
            className="btn btn-primary"
            disabled={!dirty || saving || days.length === 0}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
          {msg && <span className="save-msg">{msg}</span>}
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   Holidays
   ========================================================================= */

function HolidaysSection({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Holiday[]>([])
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('holiday_date')
    if (error) setErr(error.message)
    else setItems((data as Holiday[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !date) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('holidays')
      .insert({ holiday_date: date, name: name.trim() })
    setBusy(false)
    if (error) {
      setErr(
        /duplicate/i.test(error.message)
          ? 'That date is already in the list.'
          : error.message,
      )
      return
    }
    setDate('')
    setName('')
    load()
  }

  async function remove(h: Holiday) {
    if (!supabase) return
    if (!confirm(`Remove ${h.name || 'this date'} (${fmt(h.holiday_date)})?`)) return
    const { error } = await supabase.from('holidays').delete().eq('id', h.id)
    if (error) setErr(error.message)
    else load()
  }

  // Group past vs upcoming so old dates don't clutter the top
  const today = format(new Date(), 'yyyy-MM-dd')
  const upcoming = items.filter((h) => h.holiday_date >= today)
  const past = items.filter((h) => h.holiday_date < today)

  return (
    <div className="card section">
      <h2 className="section-title">Holidays / non-working days</h2>
      <p className="section-help">
        Any date added here is skipped when the app counts working days. Add or
        remove dates whenever you need to.
      </p>

      {canEdit && (
        <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Name (optional)</span>
            <input
              type="text"
              placeholder="e.g. Thanksgiving"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || !date} type="submit">
            Add
          </button>
        </form>
      )}

      {err && <div className="alert-error">{err}</div>}

      <ul className="list">
        {upcoming.length === 0 && (
          <li className="empty">No upcoming holidays added.</li>
        )}
        {upcoming.map((h) => (
          <li key={h.id}>
            <div className="grow">
              <div>{fmt(h.holiday_date)}</div>
              {h.name && <div className="sub">{h.name}</div>}
            </div>
            {canEdit && (
              <button className="btn btn-sm btn-danger" onClick={() => remove(h)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {past.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="muted" style={{ cursor: 'pointer', fontSize: 14 }}>
            Past dates ({past.length})
          </summary>
          <ul className="list" style={{ marginTop: 8 }}>
            {past.map((h) => (
              <li key={h.id}>
                <div className="grow">
                  <div>{fmt(h.holiday_date)}</div>
                  {h.name && <div className="sub">{h.name}</div>}
                </div>
                {canEdit && (
                  <button className="btn btn-sm btn-danger" onClick={() => remove(h)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function fmt(isoDate: string) {
  return format(parseISO(isoDate), 'EEE, MMM d, yyyy')
}

/* =========================================================================
   Lookup lists (equipment categories, personnel roles)
   ========================================================================= */

function LookupSection({
  canEdit,
  table,
  title,
  help,
  placeholder,
}: {
  canEdit: boolean
  table: 'equipment_categories' | 'personnel_roles'
  title: string
  help: string
  placeholder: string
}) {
  const [items, setItems] = useState<LookupItem[]>([])
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('sort_order')
      .order('name')
    if (error) setErr(error.message)
    else setItems((data as LookupItem[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !newName.trim()) return
    setBusy(true)
    setErr(null)
    const sort = (items.at(-1)?.sort_order ?? 0) + 1
    const { error } = await supabase
      .from(table)
      .insert({ name: newName.trim(), sort_order: sort })
    setBusy(false)
    if (error) {
      setErr(/duplicate/i.test(error.message) ? 'That name already exists.' : error.message)
      return
    }
    setNewName('')
    load()
  }

  async function rename() {
    if (!supabase || !editing) return
    const { error } = await supabase
      .from(table)
      .update({ name: editing.name.trim() })
      .eq('id', editing.id)
    if (error) setErr(error.message)
    setEditing(null)
    load()
  }

  async function toggleActive(item: LookupItem) {
    if (!supabase) return
    const { error } = await supabase
      .from(table)
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
    if (error) setErr(error.message)
    else load()
  }

  return (
    <div className="card section">
      <h2 className="section-title">{title}</h2>
      <p className="section-help">{help}</p>

      {canEdit && (
        <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
          <label className="field">
            <span>Add new</span>
            <input
              type="text"
              placeholder={placeholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || !newName.trim()} type="submit">
            Add
          </button>
        </form>
      )}

      {err && <div className="alert-error">{err}</div>}

      <ul className="list">
        {items.length === 0 && <li className="empty">Nothing here yet.</li>}
        {items.map((item) => (
          <li key={item.id} className={item.is_active ? '' : 'inactive'}>
            {editing?.id === item.id ? (
              <>
                <input
                  type="text"
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ id: item.id, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') rename()
                    if (e.key === 'Escape') setEditing(null)
                  }}
                />
                <button className="btn btn-sm btn-primary" onClick={rename}>
                  Save
                </button>
                <button className="btn btn-sm" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="grow">{item.name}</div>
                {canEdit && (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditing({ id: item.id, name: item.name })}
                    >
                      Rename
                    </button>
                    <button className="btn btn-sm" onClick={() => toggleActive(item)}>
                      {item.is_active ? 'Retire' : 'Restore'}
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <p className="section-help" style={{ marginTop: 8 }}>
          “Retire” hides an item from new pick-lists without deleting history.
        </p>
      )}
    </div>
  )
}

/* =========================================================================
   Invitations (invite-only sign-up)
   ========================================================================= */

function InvitesSection({ canEdit }: { canEdit: boolean }) {
  const { session } = useAuth()
  const [invites, setInvites] = useState<InvitedUser[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitedUser['role']>('manager')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('invited_users')
      .select('*')
      .is('accepted_at', null)
      .order('created_at')
    if (error) setErr(error.message)
    else setInvites((data as InvitedUser[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    const addr = email.trim().toLowerCase()
    if (!addr) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('invited_users')
      .insert({ email: addr, role, invited_by: session?.user.id })
    setBusy(false)
    if (error) {
      setErr(/duplicate/i.test(error.message) ? 'That address is already invited.' : error.message)
      return
    }
    setEmail('')
    setRole('manager')
    load()
  }

  async function remove(inv: InvitedUser) {
    if (!supabase) return
    if (!confirm(`Cancel the invitation for ${inv.email}?`)) return
    const { error } = await supabase.from('invited_users').delete().eq('id', inv.id)
    if (error) setErr(error.message)
    else load()
  }

  function mailto(inv: InvitedUser) {
    const subject = 'Your ISW Scheduler account'
    const body = [
      `You've been set up to use the ISW Scheduler.`,
      ``,
      `1. Go to ${APP_URL}`,
      `2. Tap "New here? Create an account"`,
      `3. Sign up using this exact email address: ${inv.email}`,
      `4. Check your inbox for a confirmation link, then sign in.`,
      ``,
      `On an iPhone, open the link in Safari, tap Share, then "Add to Home Screen" to get the ISW icon.`,
    ].join('\n')
    return `mailto:${inv.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="card section">
      <h2 className="section-title">Invite someone</h2>
      <p className="section-help">
        Accounts are invitation-only. Add a person's email here, then send them the
        invite. They can only sign up with that exact address.
      </p>

      {canEdit && (
        <form className="row" onSubmit={invite} style={{ marginBottom: 12 }}>
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@indwreck.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field" style={{ flex: '0 0 140px' }}>
            <span>Access</span>
            <select value={role} onChange={(e) => setRole(e.target.value as InvitedUser['role'])}>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy || !email.trim()}>
            Invite
          </button>
        </form>
      )}

      {err && <div className="alert-error">{err}</div>}

      <ul className="list">
        {invites.length === 0 && <li className="empty">No pending invitations.</li>}
        {invites.map((inv) => (
          <li key={inv.id}>
            <div className="grow">
              <div>{inv.email}</div>
              <div className="sub">
                {inv.role === 'admin' ? 'Admin' : 'Manager'} · invited{' '}
                {format(parseISO(inv.created_at), 'MMM d')} · waiting for them to sign up
              </div>
            </div>
            <a className="btn btn-sm" href={mailto(inv)}>
              Send invite email
            </a>
            {canEdit && (
              <button className="btn btn-sm btn-danger" onClick={() => remove(inv)}>
                Cancel
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* =========================================================================
   Users
   ========================================================================= */

function UsersSection({ canEdit }: { canEdit: boolean }) {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    if (error) setErr(error.message)
    else setUsers((data as Profile[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function setRole(u: Profile, role: Profile['role']) {
    if (!supabase) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    if (error) setErr(error.message)
    else load()
  }

  async function toggleActive(u: Profile) {
    if (!supabase) return
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !u.is_active })
      .eq('id', u.id)
    if (error) setErr(error.message)
    else load()
  }

  const adminCount = users.filter((u) => u.role === 'admin' && u.is_active).length

  return (
    <div className="card section">
      <h2 className="section-title">Users</h2>
      <p className="section-help">
        Everyone with an account. Deactivating someone locks them out immediately
        without deleting anything.
      </p>

      {err && <div className="alert-error">{err}</div>}

      <ul className="list">
        {users.map((u) => {
          const isMe = u.id === me?.id
          const lastAdmin = u.role === 'admin' && u.is_active && adminCount <= 1
          return (
            <li key={u.id} className={u.is_active ? '' : 'inactive'}>
              <div className="grow">
                <div>
                  {u.full_name || '(no name)'} {isMe && <span className="sub">(you)</span>}
                </div>
                <div className="sub">
                  {u.role === 'admin' ? 'Admin' : 'Manager'}
                  {!u.is_active && ' · deactivated'}
                </div>
              </div>
              {canEdit && (
                <>
                  <select
                    value={u.role}
                    disabled={lastAdmin}
                    title={lastAdmin ? 'There must always be at least one Admin' : undefined}
                    onChange={(e) => setRole(u, e.target.value as Profile['role'])}
                    style={{ width: 'auto', minHeight: 32, padding: '4px 8px', fontSize: 14 }}
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    className="btn btn-sm"
                    disabled={isMe || lastAdmin}
                    onClick={() => toggleActive(u)}
                  >
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
