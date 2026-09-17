-- ============================================================================
-- 0002 — Work types + permit / utility-disconnect tracker on projects
-- Run in the Supabase SQL editor after 0001_init.sql.
-- ============================================================================

-- What kind of demolition the job is. A project may be more than one.
alter table projects
  add column if not exists work_types text[] not null default '{}';

-- Permits and utility disconnects that must be cleared before work starts.
create type permit_status as enum ('not_started', 'requested', 'complete', 'not_required');

create table project_permits (
  id           bigint generated always as identity primary key,
  project_id   bigint not null references projects(id) on delete cascade,
  item         text not null,                       -- e.g. "Water disconnect"
  status       permit_status not null default 'not_started',
  status_date  date,                                -- when requested / completed
  note         text not null default '',            -- confirmation #, contact, etc.
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index project_permits_project_idx on project_permits (project_id, sort_order);
create trigger project_permits_updated before update on project_permits
  for each row execute function set_updated_at();

alter table project_permits enable row level security;
create policy read_permits  on project_permits for select using (is_staff());
create policy staff_permits on project_permits for all using (is_staff()) with check (is_staff());
