import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLookups } from '../lib/lookups'
import { countWorkingDays, endAfterWorkingDays } from '../lib/workdays'
import {
  DAY_LABELS,
  PERMIT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  TOTAL_DEMO_PERMIT_ITEMS,
  WORK_TYPE_LABELS,
  WORK_TYPE_ORDER,
  type PermitStatus,
  type Project,
  type ProjectContact,
  type ProjectPermit,
  type ProjectStatus,
  type StartType,
  type WorkType,
} from '../lib/types'

type Draft = {
  name: string
  address: string
  status: ProjectStatus
  start_type: StartType
  work_types: WorkType[]
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
  work_types: [],
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
    work_types: p.work_types ?? [],
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
      work_types: draft.work_types,
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
      if (!error && draft.work_types.includes('total')) {
        await supabase.from('project_permits').insert(
          TOTAL_DEMO_PERMIT_ITEMS.map((item, i) => ({
            project_id: data.id,
            item,
            sort_order: i + 1,
          })),
        )
      }
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
            <div className="field span-2">
              <span>Type of work (pick all that apply)</span>
              <div className="check-row">
                {WORK_TYPE_ORDER.map((w) => {
                  const on = draft.work_types.includes(w)
                  return (
                    <label key={w} className={`check-chip ${on ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        hidden
                        checked={on}
                        onChange={() =>
                          set(
                            'work_types',
                            on
                              ? draft.work_types.filter((x) => x !== w)
                              : WORK_TYPE_ORDER.filter((x) => x === w || draft.work_types.includes(x)),
                          )
                        }
                      />
                      {WORK_TYPE_LABELS[w]}
                    </label>
                  )
                })}
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

      {!isNew && (
        <PermitsSection projectId={Number(id)} isTotalDemo={orig.work_types.includes('total')} />
      )}

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
   Permits & utility disconnects
   ========================================================================= */

const PERMIT_STATUS_ORDER: PermitStatus[] = ['not_started', 'requested', 'complete', 'not_required']
// short labels for the segmented control (full labels live in PERMIT_STATUS_LABELS)
const PERMIT_SHORT: Record<PermitStatus, string> = {
  not_started: 'To do',
  requested: 'Requested',
  complete: 'Done',
  not_required: 'N/A',
}

function PermitsSection({ projectId, isTotalDemo }: { projectId: number; isTotalDemo: boolean }) {
  const [items, setItems] = useState<ProjectPermit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [editingNote, setEditingNote] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('project_permits')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('id')
    if (error) setErr(error.message)
    else setItems((data as ProjectPermit[]) ?? [])
    setLoaded(true)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function addStandard() {
    if (!supabase) return
    setBusy(true)
    const existing = new Set(items.map((i) => i.item.toLowerCase()))
    const rows = TOTAL_DEMO_PERMIT_ITEMS.filter((n) => !existing.has(n.toLowerCase())).map(
      (item, i) => ({ project_id: projectId, item, sort_order: items.length + i + 1 }),
    )
    if (rows.length) {
      const { error } = await supabase.from('project_permits').insert(rows)
      if (error) setErr(error.message)
    }
    setBusy(false)
    load()
  }

  async function addCustom(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !newItem.trim()) return
    setBusy(true)
    const { error } = await supabase.from('project_permits').insert({
      project_id: projectId,
      item: newItem.trim(),
      sort_order: (items.at(-1)?.sort_order ?? 0) + 1,
    })
    setBusy(false)
    if (error) return setErr(error.message)
    setNewItem('')
    load()
  }

  async function patch(p: ProjectPermit, changes: Partial<ProjectPermit>) {
    if (!supabase) return
    // optimistic update so the row doesn't flicker
    setItems((cur) => cur.map((x) => (x.id === p.id ? { ...x, ...changes } : x)))
    const { error } = await supabase.from('project_permits').update(changes).eq('id', p.id)
    if (error) {
      setErr(error.message)
      load()
    }
  }

  function setStatus(p: ProjectPermit, status: PermitStatus) {
    const today = format(new Date(), 'yyyy-MM-dd')
    // stamp today's date when moving to requested/complete and no date set yet
    const status_date =
      status === 'requested' || status === 'complete' ? (p.status_date ?? today) : p.status_date
    patch(p, { status, status_date })
  }

  async function remove(p: ProjectPermit) {
    if (!supabase) return
    if (!confirm(`Remove "${p.item}" from this checklist?`)) return
    const { error } = await supabase.from('project_permits').delete().eq('id', p.id)
    if (error) setErr(error.message)
    else load()
  }

  const needed = items.filter((i) => i.status !== 'not_required').length
  const doneNeeded = items.filter((i) => i.status === 'complete').length

  return (
    <div className="card section">
      <div className="page-head" style={{ marginBottom: 4 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Permits &amp; disconnects
        </h2>
        {items.length > 0 && (
          <span className={`status-pill ${doneNeeded === needed ? 'status-active' : 'status-in_permitting'}`}>
            {doneNeeded} of {needed} done
          </span>
        )}
      </div>
      <p className="section-help">
        Everything that has to be cleared before the job can start. Tap a status to change it.
      </p>

      {err && <div className="alert-error">{err}</div>}

      {loaded && items.length === 0 && (
        <div className="empty" style={{ textAlign: 'left', padding: '4px 0 12px' }}>
          {isTotalDemo
            ? 'No checklist yet for this total demo.'
            : 'Nothing tracked. Selective and interior jobs usually need no permits — add items only if this one does.'}
          {isTotalDemo && (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={addStandard}>
                Add standard total-demo items
              </button>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <ul className="list permit-list">
          {items.map((p) => (
            <li key={p.id} className={p.status === 'not_required' ? 'inactive' : ''}>
              <div className="grow">
                <div className="permit-item">{p.item}</div>
                <div className="sub">
                  {p.status_date && <span>{fmtShort(p.status_date)}</span>}
                  {p.status_date && p.note && ' · '}
                  {editingNote === p.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={noteDraft}
                      placeholder="Confirmation #, who you spoke to…"
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={() => {
                        patch(p, { note: noteDraft.trim() })
                        setEditingNote(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingNote(null)
                      }}
                      style={{ marginTop: 4 }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setNoteDraft(p.note)
                        setEditingNote(p.id)
                      }}
                    >
                      {p.note || 'add note'}
                    </button>
                  )}
                </div>
              </div>
              <div className="permit-controls">
                <div className="seg">
                  {PERMIT_STATUS_ORDER.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`seg-btn seg-${st} ${p.status === st ? 'on' : ''}`}
                      onClick={() => setStatus(p, st)}
                      title={PERMIT_STATUS_LABELS[st]}
                    >
                      {PERMIT_SHORT[st]}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  className="permit-date"
                  value={p.status_date ?? ''}
                  onChange={(e) => patch(p, { status_date: e.target.value || null })}
                  title="Date requested / completed"
                />
                <button type="button" className="btn btn-sm" onClick={() => remove(p)} title="Remove">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="row" onSubmit={addCustom} style={{ marginTop: 12 }}>
        <label className="field">
          <span>Add another permit or disconnect</span>
          <input
            type="text"
            placeholder="e.g. Right-of-way permit, Sewer cap"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
        </label>
        <button type="submit" className="btn" disabled={busy || !newItem.trim()}>
          Add
        </button>
        {isTotalDemo && items.length > 0 && items.length < TOTAL_DEMO_PERMIT_ITEMS.length && (
          <button type="button" className="btn" disabled={busy} onClick={addStandard}>
            Add missing standard items
          </button>
        )}
      </form>
    </div>
  )
}

function fmtShort(iso: string) {
  return format(parseISO(iso), 'MMM d')
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
