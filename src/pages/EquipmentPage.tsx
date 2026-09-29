import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/lookups'
import type { Equipment } from '../lib/types'

export default function EquipmentPage() {
  const { categories } = useLookups()
  const [units, setUnits] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [catFilter, setCatFilter] = useState<number | 'all'>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('equipment')
      .select('*')
      .order('unit_number')
      .order('name')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setUnits((data as Equipment[]) ?? [])
        setLoading(false)
      })
  }, [])

  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return units.filter((u) => {
      if (!showInactive && !u.is_active) return false
      if (catFilter !== 'all' && u.category_id !== catFilter) return false
      if (
        needle &&
        !`${u.name} ${u.unit_number} ${u.make} ${u.model} ${catName(u.category_id)}`
          .toLowerCase()
          .includes(needle)
      )
        return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, showInactive, catFilter, q, categories])

  // Group by category in the Settings order; uncategorized last
  const groups = useMemo(() => {
    const order = [...categories.map((c) => c.id), null]
    const m = new Map<number | null, Equipment[]>()
    for (const u of visible) {
      const key = categories.some((c) => c.id === u.category_id) ? u.category_id : null
      m.set(key, [...(m.get(key) ?? []), u])
    }
    return order.filter((k) => m.has(k)).map((k) => ({ id: k, name: catName(k), items: m.get(k)! }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, categories])

  const activeCount = units.filter((u) => u.is_active).length
  const inactiveCount = units.length - activeCount

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title">Equipment</h1>
        <Link to="/equipment/new" className="btn btn-primary">
          + Add equipment
        </Link>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search name, unit #, make…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="toolbar-search"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="toolbar-select"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="toggle-line" style={{ justifyContent: 'space-between' }}>
        <span>{activeCount} active unit{activeCount === 1 ? '' : 's'}</span>
        {inactiveCount > 0 && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive ({inactiveCount})
          </label>
        )}
      </div>

      {err && <div className="alert-error">{err}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card empty">
          {units.length === 0 ? 'No equipment yet. Add your fleet with “Add equipment”.' : 'Nothing matches this filter.'}
        </div>
      ) : (
        groups.map((g) => (
          <div key={String(g.id)} className="section">
            <h2 className="group-title">
              {g.name} <span className="muted">({g.items.length})</span>
            </h2>
            <ul className="project-list">
              {g.items.map((u) => (
                <li key={u.id}>
                  <Link to={`/equipment/${u.id}`} className={`project-row ${u.is_active ? '' : 'row-inactive'}`}>
                    <div className="project-main">
                      <div className="project-name">
                        {u.unit_number && <span className="unit-no">{u.unit_number}</span>}
                        {u.name}
                      </div>
                      <div className="sub">
                        {[u.make, u.model, u.model_year].filter(Boolean).join(' ')}
                        {!u.is_active && ' · inactive'}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}
