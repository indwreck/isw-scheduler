-- ============================================================================
-- 0005 — Personnel details + skills / certifications
-- Run in the Supabase SQL editor after 0004.
-- ============================================================================

alter table personnel
  add column if not exists birth_date      date,
  add column if not exists hire_date       date,
  add column if not exists emergency_name  text not null default '',
  add column if not exists emergency_phone text not null default '';

-- Skills / certifications list (Admin-managed in Settings, like roles)
create table skills (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true
);
insert into skills (name, sort_order) values
  ('CDL Class A', 1), ('CDL Class B', 2), ('Excavator', 3), ('Dozer', 4),
  ('Skid steer', 5), ('Crusher', 6), ('Aerial lift', 7), ('Forklift', 8),
  ('OSHA 10', 9), ('OSHA 30', 10), ('Lead worker', 11), ('Competent person', 12),
  ('First aid / CPR', 13), ('Torch cutting', 14);

-- Which people have which skills; expires_on is optional (cards that lapse)
create table personnel_skills (
  personnel_id bigint not null references personnel(id) on delete cascade,
  skill_id     bigint not null references skills(id) on delete cascade,
  expires_on   date,
  primary key (personnel_id, skill_id)
);
create index personnel_skills_skill_idx on personnel_skills (skill_id);

alter table skills           enable row level security;
alter table personnel_skills enable row level security;
create policy read_skills   on skills for select using (is_staff());
create policy admin_skills  on skills for all using (is_admin()) with check (is_admin());
create policy read_pskills  on personnel_skills for select using (is_staff());
create policy staff_pskills on personnel_skills for all using (is_staff()) with check (is_staff());
