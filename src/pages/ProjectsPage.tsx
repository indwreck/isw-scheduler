import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/lookups'
import { endAfterWorkingDays } from '../lib/workdays'
import {
  LIST_HIDDEN_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  WORK_TYPE_LABELS,
  type Project,
  type ProjectStatus,
} from '../lib/types'

/** permits per project: [done, needed] (not-required items are excluded) */
type PermitProgress = Record<number, [number, number]>

export default function ProjectsPage() {
  const { companyCalendar } = useLookups()
  const [projects, setProjects] = useState<Project[]>([])
  const [permits, setPermits] = useState<PermitProgress>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('projects')
      .select('*')
      .order('planned_start', { ascending: true, nullsFirst: false })
      .order('name')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setProjects((data as Project[]) ?? [])
        setLoading(false)
      })
    supabase
      .from('project_permits')
      .select('project_id,status')
      .then(({ data }) => {
        const prog: PermitProgress = {}
        for (const r of (data ?? []) as { project_id: number; status: string }[]) {
          if (r.status === 'not_required') continue
          const cur = prog[r.project_id] ?? [0, 0]
          cur[1]++
          if (r.status === 'complete') cur[0]++
          prog[r.project_id] = cur
        }
        setPermits(prog)
      })
  }, [])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false
      if (filter === 'all' && !showAll && LIST_HIDDEN_STATUSES.includes(p.status))
        return false
      if (needle && !`${p.name} ${p.address}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [projects, filter, showAll, q])

  const hiddenCount = projects.filter(
    (p) => LIST_HIDDEN_STATUSES.includes(p.status),
  ).length

  return (
    <section>
      <div className="page-head">
        <h1 className="page-title">Projects</h1>
        <Link to="/projects/new" className="btn btn-primary">
          + New project
        </Link>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search name or address…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="toolbar-search"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ProjectStatus | 'all')}
          className="toolbar-select"
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {filter === 'all' && hiddenCount > 0 && (
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show On Hold &amp; Closed ({hiddenCount})
        </label>
      )}

      {err && <div className="alert-error">{err}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card empty">
          {projects.length === 0
            ? 'No projects yet. Add your first awarded job with “New project”.'
            : 'No projects match this filter.'}
        </div>
      ) : (
        <ul className="project-list">
          {visible.map((p) => (
            <ProjectRow key={p.id} p={p} calendar={companyCalendar} permits={permits[p.id]} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ProjectRow({
  p,
  calendar,
  permits,
}: {
  p: Project
  calendar: ReturnType<typeof useLookups>['companyCalendar']
  permits?: [number, number]
}) {
  const cal = p.use_company_calendar || !p.custom_work_days
    ? calendar
    : { ...calendar, workDays: p.custom_work_days }
  const end =
    p.planned_end ??
    (p.planned_start && p.est_duration_days
      ? endAfterWorkingDays(p.planned_start, p.est_duration_days, cal)
      : null)

  return (
    <li>
      <Link to={`/projects/${p.id}`} className="project-row">
        <div className="project-main">
          <div className="project-name">{p.name}</div>
          {p.address && <div className="sub">{p.address}</div>}
          {(p.work_types?.length > 0 || permits) && (
            <div className="tag-row">
              {p.work_types?.map((w) => (
                <span key={w} className="tag">
                  {WORK_TYPE_LABELS[w]}
                </span>
              ))}
              {permits && permits[1] > 0 && (
                <span className={`tag ${permits[0] === permits[1] ? 'tag-ok' : 'tag-warn'}`}>
                  Permits {permits[0]} of {permits[1]}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="project-meta">
          <span className={`status-pill status-${p.status}`}>
            {PROJECT_STATUS_LABELS[p.status]}
          </span>
          <span className="sub">
            {p.planned_start ? fmt(p.planned_start) : 'No start date'}
            {end ? ` → ${fmt(end)}` : ''}
            {p.planned_start && p.start_type === 'tentative' ? ' · tentative' : ''}
          </span>
        </div>
      </Link>
    </li>
  )
}

function fmt(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy')
}
