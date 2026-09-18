import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/lookups'
import type { EntryType, Person } from '../lib/types'

/** per person: counts of the attendance-type entries */
type Counts = Record<number, Partial<Record<EntryType, number>>>

export default function PersonnelPage() {
  const { roles } = useLookups()
  const [people, setPeople] = useState<Person[]>([])
  const [counts, setCounts] = useState<Counts>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('personnel')
      .select('*')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setPeople((data as Person[]) ?? [])
        setLoading(false)
      })
    supabase
      .from('personnel_entries')
      .select('personnel_id,entry_type')
      .then(({ data }) => {
        const c: Counts = {}
        for (const r of (data ?? []) as { personnel_id: number; entry_type: EntryType }[]) {
          const cur = c[r.personnel_id] ?? {}
          cur[r.entry_type] = (cur[r.entry_type] ?? 0) + 1
          c[r.personnel_id] = cur
        }
        setCounts(c)
      })
  }, [])

  const roleName = (id: number | null) => roles.find((r) => r.id === id)?.name ?? '—'

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return people.filter((p) => {
      if (!showInactive && !p.is_active) return false
      if (roleFilter !== 'all' && p.role_id !== roleFilter) return false
      if (needle && !`${p.full_name} ${roleName(p.role_id)}`.toLowerCase().includes(needle))
        return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, showInactive, roleFilter, q, roles])

  const inactiveCount = people.filter((p) => !p.is_active).length
  const activeCount = people.filter((p) => p.is_active).length

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title">Personnel</h1>
        <Link to="/personnel/new" className="btn btn-primary">
          + Add person
        </Link>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="toolbar-search"
        />
        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="toolbar-select"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="toggle-line" style={{ justifyContent: 'space-between' }}>
        <span>
          {activeCount} active
          {roleFilter === 'all' && ' · ' + roleSummary(people, roles)}
        </span>
        {inactiveCount > 0 && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive ({inactiveCount})
          </label>
        )}
      </div>

      {err && <div className="alert-error">{err}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card empty">
          {people.length === 0
            ? 'No personnel yet. Add your crew with “Add person”.'
            : 'Nobody matches this filter.'}
        </div>
      ) : (
        <ul className="project-list">
          {visible.map((p) => {
            const c = counts[p.id] ?? {}
            return (
              <li key={p.id}>
                <Link to={`/personnel/${p.id}`} className={`project-row ${p.is_active ? '' : 'row-inactive'}`}>
                  <div className="project-main">
                    <div className="project-name">{p.full_name}</div>
                    <div className="sub">
                      {roleName(p.role_id)}
                      {!p.is_active && ' · inactive'}
                    </div>
                  </div>
                  <div className="project-meta" style={{ flexDirection: 'row', gap: 4 }}>
                    {c.no_show ? <span className="tag tag-warn">{c.no_show} no-show{c.no_show > 1 ? 's' : ''}</span> : null}
                    {c.late ? <span className="tag">{c.late} late</span> : null}
                    {c.write_up ? <span className="tag tag-warn">{c.write_up} write-up{c.write_up > 1 ? 's' : ''}</span> : null}
                    {c.positive ? <span className="tag tag-ok">{c.positive} positive</span> : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function roleSummary(people: Person[], roles: { id: number; name: string }[]) {
  const byRole = new Map<number | null, number>()
  for (const p of people) if (p.is_active) byRole.set(p.role_id, (byRole.get(p.role_id) ?? 0) + 1)
  return roles
    .filter((r) => byRole.get(r.id))
    .map((r) => `${byRole.get(r.id)} ${r.name.toLowerCase()}${byRole.get(r.id)! > 1 ? 's' : ''}`)
    .join(', ')
}
