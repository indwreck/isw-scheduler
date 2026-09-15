import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLookups } from '../lib/lookups'
import { countWorkingDays, endAfterWorkingDays } from '../lib/workdays'
import {
  DAY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  type Project,
  type ProjectContact,
  type ProjectStatus,
  type StartType,
} from '../lib/types'

type Draft = {
  name: string
  address: string
  status: ProjectStatus
  start_type: StartType
  planned_start: string
  planned_end: string
  est_duration_days: string
  use_company_calendar: boolean
  custom_work_days: number[]
  custom_start_time: string
  custom_end_time: string
  notes: string
}

const EMPTY: Draft = {
  name: '',
  address: '',
  status: 'awarded',
  start_type: 'tentative',
  planned_start: '',
  planned_end: '',
  est_duration_days: '',
  use_company_calendar: true,
  custom_work_days: [1, 2, 3, 4, 5],
  custom_start_time: '',
  custom_end_time: '',
  notes: '',
}

function toDraft(p: Project): Draft {
  return {
    name: p.name,
    address: p.address,
    status: p.status,
    start_type: p.start_type,
    planned_start: p.planned_start ?? '',
    planned_end: p.planned_end ?? '',
    est_duration_days: p.est_duration_days ? String(p.est_duration_days) : '',
    use_company_calendar: p.use_company_calendar,
    custom_work_days: p.custom_work_days ?? [1, 2, 3, 4, 5],
    custom_start_time: p.custom_start_time?.slice(0, 5) ?? '',
    custom_end_time: p.custom_end_time?.slice(0, 5) ?? '',
    notes: p.notes,
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { isAdmin, session } = useAuth()
  const { settings, companyCalendar } = useLookups()

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [orig, setOrig] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !supabase) return
    supabase
      .from('projects')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setErr(error?.message ?? 'Project not found.')
        } else {
          const d = toDraft(data as Project)
          setDraft(d)
          setOrig(d)
        }
        setLoading(false)
      })
  }, [id, isNew])

  const dirty = JSON.stringify(draft) !== JSON.stringify(orig)

  // Calendar in effect for this project (for projected-end math)
  const cal = useMemo(
    () =>
      draft.use_company_calendar
        ? companyCalendar
        : { ...companyCalendar, workDays: draft.custom_work_days },
    [draft.use_company_calendar, draft.custom_work_days, companyCalendar],
  )

  const projectedEnd =
    draft.planned_start && draft.est_duration_days && !draft.planned_end
      ? endAfterWorkingDays(draft.planned_start, Number(draft.est_duration_days), cal)
      : null
  const impliedDays =
    draft.planned_start && draft.planned_end
      ? countWorkingDays(draft.planned_start, draft.planned_end, cal)
      : null

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
      name: draft.name.trim(),
      address: draft.address.trim(),
      status: draft.status,
      start_type: draft.start_type,
      planned_start: draft.planned_start || null,
      planned_end: draft.planned_end || null,
      est_duration_days: draft.est_duration_days ? Number(draft.est_duration_days) : null,
      use_company_calendar: draft.use_company_calendar,
      custom_work_days: draft.use_company_calendar ? null : draft.custom_work_days,
      custom_start_time: draft.use_company_calendar ? null : draft.custom_start_time || null,
      custom_end_time: draft.use_company_calendar ? null : draft.custom_end_time || null,
      notes: draft.notes,
    }
    if (isNew) {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...row, created_by: session?.user.id })
        .select('id')
        .single()
      setSaving(false)
      if (error) return setErr(friendly(error.message))
      navigate(`/projects/${data.id}`, { replace: true })
    } else {
      const { error } = await supabase.from('projects').update(row).eq('id', Number(id))
      setSaving(false)
      if (error) return setErr(friendly(error.message))
      setOrig(draft)
      setMsg('Saved.')
    }
  }

  async function remove() {
    if (!supabase || isNew) return
    if (
      !confirm(
        `Delete "${orig.name}"?\n\nThis also removes all of its contacts and scheduled assignments. This cannot be undone.`,
      )
    )
      return
    const { error } = await supabase.from('projects').delete().eq('id', Number(id))
    if (error) return setErr(error.message)
    navigate('/projects', { replace: true })
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <section>
      <Link to="/projects" className="back-link">
        ‹ Projects
      </Link>
      <h1 className="page-title">{isNew ? 'New project' : orig.name}</h1>

      {err && <div className="alert-error">{err}</div>}

      <form onSubmit={save}>
        <div className="card section">
          <h2 className="section-title">Project</h2>
          <div className="form-grid">
            <label className="field span-2">
              <span>Project name</span>
              <input
                type="text"
                required
                autoFocus={isNew}
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </label>
            <label className="field span-2">
              <span>Location / address</span>
              <input
                type="text"
                value={draft.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={draft.status}
                onChange={(e) => set('status', e.target.value as ProjectStatus)}
              >
                {PROJECT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Start date is</span>
              <div className="radio-row">
                {(['tentative', 'confirmed'] as StartType[]).map((t) => (
                  <label
                    key={t}
                    className={`check-chip ${draft.start_type === t ? 'on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="start_type"
                      hidden
                      checked={draft.start_type === t}
                      onChange={() => set('start_type', t)}
                    />
                    {t === 'tentative' ? 'Tentative' : 'Confirmed'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card section">
          <h2 className="section-title">Dates</h2>
          <p className="section-help">
            Give a planned end date, or a start date plus an estimated duration in
            working days and the end date is figured for you.
          </p>
          <div className="form-grid">
            <label className="field">
              <span>Planned start</span>
              <input
                type="date"
                value={draft.planned_start}
                onChange={(e) => set('planned_start', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Planned end (optional)</span>
              <input
                type="date"
                min={draft.planned_start || undefined}
                value={draft.planned_end}
                onChange={(e) => set('planned_end', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Estimated duration (working days)</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="e.g. 15"
                value={draft.est_duration_days}
                onChange={(e) => set('est_duration_days', e.target.value)}
              />
            </label>
            <div className="field">
              <span>Projected end</span>
              <div style={{ minHeight: 42, display: 'flex', alignItems: 'center' }}>
                {draft.planned_end ? (
                  <span>
                    {fmt(draft.planned_end)}
                    {impliedDays !== null && (
                      <span className="muted"> · {impliedDays} working days</span>
                    )}
                  </span>
                ) : projectedEnd ? (
                  <strong>{fmt(projectedEnd)}</strong>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card section">
          <h2 className="section-title">Work schedule</h2>
          <div className="radio-row" style={{ marginBottom: 12 }}>
            <label className={`check-chip ${draft.use_company_calendar ? 'on' : ''}`}>
              <input
                type="radio"
                name="cal"
                hidden
                checked={draft.use_company_calendar}
                onChange={() => set('use_company_calendar', true)}
              />
              Company default
            </label>
            <label className={`check-chip ${!draft.use_company_calendar ? 'on' : ''}`}>
              <input
                type="radio"
                name="cal"
                hidden
                checked={!draft.use_company_calendar}
                onChange={() => set('use_company_calendar', false)}
              />
              Custom schedule
            </label>
          </div>

          {draft.use_company_calendar ? (
            <p className="hint">
              {settings ? (
                <>
                  <strong>{settings.work_days.map((d) => DAY_LABELS[d]).join(', ')}</strong>
                  {' · '}
                  {t12(settings.default_start_time)} – {t12(settings.default_end_time)}
                </>
              ) : (
                'Uses the schedule set in Settings.'
              )}
            </p>
          ) : (
            <>
              <div className="field">
                <span>Work days</span>
                <div className="check-row">
                  {DAY_LABELS.map((label, d) => {
                    const on = draft.custom_work_days.includes(d)
                    return (
                      <label key={d} className={`check-chip ${on ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          hidden
                          checked={on}
                          onChange={() =>
                            set(
                              'custom_work_days',
                              on
                                ? draft.custom_work_days.filter((x) => x !== d)
                                : [...draft.custom_work_days, d].sort(),
                            )
                          }
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Daily start (optional)</span>
                  <input
                    type="time"
                    step={900}
                    value={draft.custom_start_time}
                    onChange={(e) => set('custom_start_time', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Daily end (optional)</span>
                  <input
                    type="time"
                    step={900}
                    value={draft.custom_end_time}
                    onChange={(e) => set('custom_end_time', e.target.value)}
                  />
                </label>
              </div>
              <p className="hint">Leave times blank to use the company default times.</p>
            </>
          )}
        </div>

        <div className="card section">
          <h2 className="section-title">Notes</h2>
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything the crew or office should know about this job."
          />
        </div>

        <div className="save-bar" style={{ marginBottom: 20 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !draft.name.trim() || (!isNew && !dirty)}
          >
            {saving ? 'Saving…' : isNew ? 'Create project' : 'Save changes'}
          </button>
          {!isNew && dirty && (
            <button type="button" className="btn" onClick={() => setDraft(orig)}>
              Discard
            </button>
          )}
          {msg && <span className="save-msg">{msg}</span>}
        </div>
      </form>

      {!isNew && <ContactsSection projectId={Number(id)} />}

      {!isNew && isAdmin && (
        <div className="card section danger-zone">
          <h2 className="section-title">Delete project</h2>
          <p className="section-help">
            Removes the project, its contacts and every assignment on the schedule.
            Prefer setting the status to Closed unless it was entered by mistake.
          </p>
          <button type="button" className="btn btn-danger" onClick={remove}>
            Delete this project
          </button>
        </div>
      )}
    </section>
  )
}

/* =========================================================================
   Contacts
   ========================================================================= */

const EMPTY_CONTACT = { name: '', company: '', role: '', phone: '', email: '', notes: '' }
type ContactDraft = typeof EMPTY_CONTACT

const ROLE_SUGGESTIONS = [
  'Project Manager',
  'Superintendent',
  'Owner Rep',
  'GC Rep',
  'Safety',
  'Engineer',
  'Inspector',
]

function ContactsSection({ projectId }: { projectId: number }) {
  const [contacts, setContacts] = useState<ProjectContact[]>([])
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_CONTACT)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('project_contacts')
      .select('*')
      .eq('project_id', projectId)
      .order('id')
    if (error) setErr(error.message)
    else setContacts((data as ProjectContact[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  function startNew() {
    setDraft(EMPTY_CONTACT)
    setEditing('new')
  }
  function startEdit(c: ProjectContact) {
    setDraft({
      name: c.name,
      company: c.company,
      role: c.role,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
    })
    setEditing(c.id)
  }

  async function saveContact(e: FormEvent) {
    e.preventDefault()
    if (!supabase || editing === null) return
    setBusy(true)
    setErr(null)
    const row = { ...draft, name: draft.name.trim(), project_id: projectId }
    const { error } =
      editing === 'new'
        ? await supabase.from('project_contacts').insert(row)
        : await supabase.from('project_contacts').update(row).eq('id', editing)
    setBusy(false)
    if (error) return setErr(error.message)
    setEditing(null)
    load()
  }

  async function removeContact(c: ProjectContact) {
    if (!supabase) return
    if (!confirm(`Remove ${c.name} from this project's contacts?`)) return
    const { error } = await supabase.from('project_contacts').delete().eq('id', c.id)
    if (error) setErr(error.message)
    else load()
  }

  return (
    <div className="card section">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Contacts
        </h2>
        {editing === null && (
          <button type="button" className="btn btn-sm" onClick={startNew}>
            + Add contact
          </button>
        )}
      </div>

      {err && <div className="alert-error">{err}</div>}

      {editing !== null && (
        <form onSubmit={saveContact} className="section" style={{ marginBottom: 12 }}>
          <div className="form-grid">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                required
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Company</span>
              <input
                type="text"
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Role</span>
              <input
                type="text"
                list="contact-roles"
                placeholder="e.g. Superintendent"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              />
              <datalist id="contact-roles">
                {ROLE_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <input
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="save-bar" style={{ marginTop: 4 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {editing === 'new' ? 'Add' : 'Save'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="list">
        {contacts.length === 0 && editing === null && (
          <li className="empty">No contacts yet.</li>
        )}
        {contacts.map((c) => (
          <li key={c.id}>
            <div className="grow">
              <div>
                {c.name}
                {c.role && <span className="sub"> · {c.role}</span>}
              </div>
              <div className="sub">
                {[c.company, c.phone && <a key="p" href={`tel:${c.phone}`}>{c.phone}</a>, c.email && <a key="e" href={`mailto:${c.email}`}>{c.email}</a>]
                  .filter(Boolean)
                  .map((x, i) => (
                    <span key={i}>
                      {i > 0 && ' · '}
                      {x}
                    </span>
                  ))}
              </div>
              {c.notes && <div className="sub">{c.notes}</div>}
            </div>
            <button type="button" className="btn btn-sm" onClick={() => startEdit(c)}>
              Edit
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeContact(c)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmt(iso: string) {
  return format(parseISO(iso), 'EEE, MMM d, yyyy')
}
function t12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`
}
function friendly(msg: string) {
  if (/planned_end_after_start/.test(msg)) return 'Planned end must be on or after planned start.'
  return msg
}
