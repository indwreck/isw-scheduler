import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/lookups'
import type { Equipment } from '../lib/types'

type Draft = {
  name: string
  category_id: string
  unit_number: string
  is_active: boolean
  make: string
  model: string
  model_year: string
  serial_no: string
  notes: string
}

const EMPTY: Draft = {
  name: '',
  category_id: '',
  unit_number: '',
  is_active: true,
  make: '',
  model: '',
  model_year: '',
  serial_no: '',
  notes: '',
}

function toDraft(e: Equipment): Draft {
  return {
    name: e.name,
    category_id: e.category_id ? String(e.category_id) : '',
    unit_number: e.unit_number,
    is_active: e.is_active,
    make: e.make,
    model: e.model,
    model_year: e.model_year ? String(e.model_year) : '',
    serial_no: e.serial_no,
    notes: e.notes,
  }
}

export default function EquipmentDetailPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { categories } = useLookups()

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [orig, setOrig] = useState<Draft>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isNew || !supabase) return
    supabase
      .from('equipment')
      .select('*')
      .eq('id', Number(id))
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setErr(error?.message ?? 'Equipment not found.')
        else {
          const d = toDraft(data as Equipment)
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

  // Auto-fill the name from make + model when the user hasn't typed one
  function autoName(next: Partial<Draft>) {
    const d = { ...draft, ...next }
    const suggested = [d.make, d.model].filter(Boolean).join(' ').trim()
    const prevSuggested = [draft.make, draft.model].filter(Boolean).join(' ').trim()
    if (!draft.name || draft.name === prevSuggested) d.name = suggested
    setDraft(d)
    setMsg(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setErr(null)
    const row = {
      name: draft.name.trim(),
      category_id: draft.category_id ? Number(draft.category_id) : null,
      unit_number: draft.unit_number.trim(),
      is_active: draft.is_active,
      make: draft.make.trim(),
      model: draft.model.trim(),
      model_year: draft.model_year ? Number(draft.model_year) : null,
      serial_no: draft.serial_no.trim(),
      notes: draft.notes,
    }
    if (isNew) {
      const { data, error } = await supabase.from('equipment').insert(row).select('id').single()
      setSaving(false)
      if (error) return setErr(error.message)
      navigate(`/equipment/${data.id}`, { replace: true })
    } else {
      const { error } = await supabase.from('equipment').update(row).eq('id', Number(id))
      setSaving(false)
      if (error) return setErr(error.message)
      setOrig(draft)
      setMsg('Saved.')
    }
  }

  async function remove() {
    if (!supabase || isNew) return
    const label = [orig.unit_number, orig.name].filter(Boolean).join(' ')
    if (
      !confirm(
        `Delete ${label}?\n\nEvery past and future schedule assignment for this unit will be removed. If it was sold or scrapped, mark it Inactive instead so history stays.`,
      )
    )
      return
    const { error } = await supabase.from('equipment').delete().eq('id', Number(id))
    if (error) return setErr(error.message)
    navigate('/equipment', { replace: true })
  }

  if (loading) return <p className="muted">Loading…</p>

  const cats = categories.filter((c) => c.is_active || String(c.id) === draft.category_id)
  const title = isNew ? 'Add equipment' : [orig.unit_number, orig.name].filter(Boolean).join(' · ')

  return (
    <section>
      <Link to="/equipment" className="back-link">
        ‹ Equipment
      </Link>
      <h1 className="page-title">{title}</h1>

      {err && <div className="alert-error">{err}</div>}

      <form id="equipment-form" onSubmit={save}>
        <div className="card section">
          <h2 className="section-title">Unit</h2>
          <div className="form-grid">
            <label className="field">
              <span>Category</span>
              <select
                required
                value={draft.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                autoFocus={isNew}
              >
                <option value="">— pick a category —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Unit number</span>
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. E12"
                value={draft.unit_number}
                onChange={(e) => set('unit_number', e.target.value.toUpperCase())}
              />
            </label>
            <label className="field">
              <span>Make</span>
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. CAT"
                value={draft.make}
                onChange={(e) => autoName({ make: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Model</span>
              <input
                type="text"
                autoComplete="off"
                placeholder="e.g. 336"
                value={draft.model}
                onChange={(e) => autoName({ model: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Name (how it shows on the schedule)</span>
              <input type="text" required autoComplete="off" value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="field">
              <span>Year</span>
              <input
                type="number"
                inputMode="numeric"
                min={1950}
                max={2100}
                value={draft.model_year}
                onChange={(e) => set('model_year', e.target.value)}
              />
            </label>
            <label className="field span-2">
              <span>Serial / VIN</span>
              <input type="text" autoComplete="off" value={draft.serial_no} onChange={(e) => set('serial_no', e.target.value)} />
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
                Inactive units (sold, down long-term) don't count toward what you own for capacity warnings.
              </p>
            </div>
            <label className="field span-2">
              <span>Notes</span>
              <textarea
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Attachments it carries, quirks, where it's parked, etc."
              />
            </label>
          </div>
        </div>
      </form>

      <div className="save-bar sticky" style={{ marginBottom: 20 }}>
        <button
          type="submit"
          form="equipment-form"
          className="btn btn-primary"
          disabled={saving || !draft.name.trim() || !draft.category_id || (!isNew && !dirty)}
        >
          {saving ? 'Saving…' : isNew ? 'Add equipment' : 'Save changes'}
        </button>
        {!isNew && dirty && (
          <button type="button" className="btn" onClick={() => setDraft(orig)}>
            Discard
          </button>
        )}
        {msg && <span className="save-msg">{msg}</span>}
      </div>

      {!isNew && (
        <div className="card section danger-zone">
          <h2 className="section-title">Delete equipment</h2>
          <p className="section-help">
            Removes the unit and all of its schedule assignments. Use Inactive for units you sold or scrapped.
          </p>
          <button type="button" className="btn btn-danger" onClick={remove}>
            Delete this unit
          </button>
        </div>
      )}
    </section>
  )
}
