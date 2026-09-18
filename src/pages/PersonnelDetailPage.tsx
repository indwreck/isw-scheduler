import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLookups } from '../lib/lookups'
import {
  ENTRY_TYPE_LABELS,
  ENTRY_TYPE_ORDER,
  type EntryType,
  type Person,
  type PersonnelEntry,
} from '../lib/types'

type Draft = {
  full_name: string
  role_id: string
  is_active: boolean
  phone: string
  email: string
  notes: string
}

const EMPTY: Draft = { full_name: '', role_id: '', is_active: true, phone: '', email: '', notes: '' }

function toDraft(p: Person): Draft {
  return {
    full_name: p.full_name,
    role_id: p.role_id ? String(p.role_id) : '',
    is_active: p.is_active,
    phone: p.phone,
    email: p.email,
    notes: p.notes,
  }
}

export default function PersonnelDetailPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { roles } = useLookups()

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [orig, setOrig] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !supabase) return
    supabase
      .from('personnel')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setErr(error?.message ?? 'Person not found.')
        else {
          const d = toDraft(data as Person)
          setDraft(d)
          setOrig(d)
        }
        setLoading(false)
      })
  }, [id, isNew])

  const dirty = JSON.stringify(draft) !== JSON.stringify(orig)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setMsg(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setErr(null)
    const row = {
      full_name: draft.full_name.trim(),
      role_id: draft.role_id ? Number(draft.role_id) : null,
      is_active: draft.is_active,
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      notes: draft.notes,
    }
    if (isNew) {
      const { data, error } = await supabase.from('personnel').insert(row).select('id').single()
      setSaving(false)
      if (error) return setErr(error.message)
      navigate(`/personnel/${data.id}`, { replace: true })
    } else {
      const { error } = await supabase.from('personnel').update(row).eq('id', Number(id))
      setSaving(false)
      if (error) return setErr(error.message)
      setOrig(draft)
      setMsg('Saved.')
    }
  }

  async function remove() {
    if (!supabase || isNew) return
    if (
      !confirm(
        `Delete ${orig.full_name}?\n\nThis removes their history log and every schedule assignment. Prefer marking them inactive.`,
      )
    )
      return
    const { error } = await supabase.from('personnel').delete().eq('id', Number(id))
    if (error) return setErr(error.message)
    navigate('/personnel', { replace: true })
  }

  if (loading) return <p className="muted">Loading…</p>

  const activeRoles = roles.filter((r) => r.is_active || String(r.id) === draft.role_id)

  return (
    <section>
      <Link to="/personnel" className="back-link">
        ‹ Personnel
      </Link>
      <h1 className="page-title">{isNew ? 'Add person' : orig.full_name}</h1>

      {err && <div className="alert-error">{err}</div>}

      <form id="person-form" onSubmit={save}>
        <div className="card section">
          <h2 className="section-title">Details</h2>
          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                required
                autoFocus={isNew}
                autoComplete="off"
                value={draft.full_name}
                onChange={(e) => set('full_name', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Primary role</span>
              <select value={draft.role_id} onChange={(e) => set('role_id', e.target.value)}>
                <option value="">— pick a role —</option>
                {activeRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                autoComplete="off"
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="off"
                value={draft.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </label>
            <div className="field span-2">
              <span>Status</span>
              <div className="radio-row">
                <label className={`check-chip ${draft.is_active ? 'on' : ''}`}>
                  <input type="radio" name="active" hidden checked={draft.is_active} onChange={() => set('is_active', true)} />
                  Active
                </label>
                <label className={`check-chip ${!draft.is_active ? 'on' : ''}`}>
                  <input type="radio" name="active" hidden checked={!draft.is_active} onChange={() => set('is_active', false)} />
                  Inactive
                </label>
              </div>
              <p className="hint" style={{ marginTop: 6 }}>
                Inactive people are hidden from scheduling but their history is kept.
              </p>
            </div>
            <label className="field span-2">
              <span>Notes</span>
              <textarea
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Certifications, licenses, anything the office should know."
              />
            </label>
          </div>
        </div>
      </form>

      <div className="save-bar sticky" style={{ marginBottom: 20 }}>
        <button
          type="submit"
          form="person-form"
          className="btn btn-primary"
          disabled={saving || !draft.full_name.trim() || (!isNew && !dirty)}
        >
          {saving ? 'Saving…' : isNew ? 'Add person' : 'Save changes'}
        </button>
        {!isNew && dirty && (
          <button type="button" className="btn" onClick={() => setDraft(orig)}>
            Discard
          </button>
        )}
        {msg && <span className="save-msg">{msg}</span>}
      </div>

      {!isNew && <HistorySection personId={Number(id)} />}

      {!isNew && isAdmin && (
        <div className="card section danger-zone">
          <h2 className="section-title">Delete person</h2>
          <p className="section-help">
            Removes the record, the history log, and all schedule assignments. Use Inactive instead
            unless this was entered by mistake.
          </p>
          <button type="button" className="btn btn-danger" onClick={remove}>
            Delete this person
          </button>
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   History log — dated entries. Managers add; Admins edit/delete.
   ========================================================================= */

function HistorySection({ personId }: { personId: number }) {
  const { isAdmin, session, profile } = useAuth()
  const [entries, setEntries] = useState<PersonnelEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [type, setType] = useState<EntryType>('general')
  const [desc, setDesc] = useState('')
  const [severity, setSeverity] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('personnel_entries')
      .select('*, profiles:entered_by(full_name)')
      .eq('personnel_id', personId)
      .order('entry_date', { ascending: false })
      .order('id', { ascending: false })
    if (error) setErr(error.message)
    else setEntries((data as PersonnelEntry[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  function reset() {
    setEditing(null)
    setShowForm(false)
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setType('general')
    setDesc('')
    setSeverity('')
  }

  function startEdit(en: PersonnelEntry) {
    setEditing(en.id)
    setShowForm(true)
    setDate(en.entry_date)
    setType(en.entry_type)
    setDesc(en.description)
    setSeverity(en.severity ? String(en.severity) : '')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setErr(null)
    const row = {
      personnel_id: personId,
      entry_date: date,
      entry_type: type,
      description: desc.trim(),
      severity: type === 'write_up' && severity ? Number(severity) : null,
    }
    const { error } =
      editing === null
        ? await supabase.from('personnel_entries').insert({ ...row, entered_by: session?.user.id })
        : await supabase.from('personnel_entries').update(row).eq('id', editing)
    setBusy(false)
    if (error) return setErr(error.message)
    reset()
    load()
  }

  async function remove(en: PersonnelEntry) {
    if (!supabase) return
    if (!confirm(`Delete this ${ENTRY_TYPE_LABELS[en.entry_type].toLowerCase()} entry from ${fmt(en.entry_date)}?`)) return
    const { error } = await supabase.from('personnel_entries').delete().eq('id', en.id)
    if (error) setErr(error.message)
    else load()
  }

  const counts = ENTRY_TYPE_ORDER.map((t) => [t, entries.filter((e) => e.entry_type === t).length] as const).filter(
    ([, n]) => n > 0,
  )

  return (
    <div className="card section">
      <div className="page-head" style={{ marginBottom: 6 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          History
        </h2>
        {!showForm && (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowForm(true)}>
            + Add entry
          </button>
        )}
      </div>
      <p className="section-help">
        Dated record of time off, attendance, write-ups and positive notes.
        {isAdmin ? ' Entries can be corrected or removed by an Admin.' : ' Once saved, an entry can only be changed by an Admin.'}
      </p>

      {counts.length > 0 && (
        <div className="count-row">
          {counts.map(([t, n]) => (
            <span key={t} className="count-chip">
              <strong>{n}</strong>
              {ENTRY_TYPE_LABELS[t]}
            </span>
          ))}
        </div>
      )}

      {err && <div className="alert-error">{err}</div>}

      {showForm && (
        <form onSubmit={submit} className="section" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <label className="field">
              <span>Date</span>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as EntryType)}>
                {ENTRY_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {ENTRY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            {type === 'write_up' && (
              <label className="field">
                <span>Severity (optional)</span>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">—</option>
                  <option value="1">1 · Verbal reminder</option>
                  <option value="2">2 · Verbal warning</option>
                  <option value="3">3 · Written warning</option>
                  <option value="4">4 · Final warning</option>
                  <option value="5">5 · Termination-level</option>
                </select>
              </label>
            )}
            <label className="field span-2">
              <span>What happened</span>
              <textarea
                autoFocus
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={
                  type === 'time_off'
                    ? 'e.g. Requested off, approved'
                    : type === 'late'
                      ? 'e.g. 25 min late, no call'
                      : 'Keep it factual.'
                }
              />
            </label>
          </div>
          <div className="save-bar" style={{ marginTop: 4 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !date}>
              {editing === null ? 'Save entry' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-sm" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="list">
        {entries.length === 0 && !showForm && <li className="empty">No entries yet.</li>}
        {entries.map((en) => (
          <li key={en.id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`entry-pill entry-${en.entry_type}`}>{ENTRY_TYPE_LABELS[en.entry_type]}</span>
                <span>{fmt(en.entry_date)}</span>
                {en.severity && <span className="severity">severity {en.severity}</span>}
              </div>
              {en.description && <div style={{ marginTop: 4 }}>{en.description}</div>}
              <div className="sub">
                {en.profiles?.full_name
                  ? `Entered by ${en.profiles.full_name}`
                  : en.entered_by === profile?.id
                    ? 'Entered by you'
                    : ''}
              </div>
            </div>
            {isAdmin && (
              <>
                <button type="button" className="btn btn-sm" onClick={() => startEdit(en)}>
                  Edit
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(en)}>
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmt(iso: string) {
  return format(parseISO(iso), 'EEE, MMM d, yyyy')
}
