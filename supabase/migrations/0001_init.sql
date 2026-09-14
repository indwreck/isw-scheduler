-- ============================================================================
-- ISW Scheduler — initial database schema
-- Matches "ISW Asset Management App — Working Design Spec" (2026-09-14)
-- Run this in the Supabase SQL editor (or via the Supabase CLI).
-- ============================================================================

-- ---------- Enums ----------------------------------------------------------

create type user_role as enum ('admin', 'manager');

create type project_status as enum (
  'awarded',
  'in_permitting',
  'ready_to_start',
  'active',
  'on_hold',
  'closed'
);

create type start_type as enum ('tentative', 'confirmed');

create type entry_type as enum (
  'time_off',
  'no_show',
  'late',
  'write_up',
  'positive',
  'general'
);

-- How an assignment is expressed (spec §6.3, §6.4, §7.3)
create type assignment_kind as enum (
  'personnel',        -- a specific employee
  'personnel_block',  -- role + quantity planning block
  'labor_crew',       -- labor-service crew (company + quantity)
  'equipment',        -- a specific unit
  'equipment_block'   -- category + quantity planning block
);

-- ---------- Helpers --------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Users / profiles (spec §13) -----------------------------------

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        user_role not null default 'manager',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- First person to sign up becomes Admin; everyone after is a Manager
-- until an Admin changes them in Settings.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select count(*) into n from profiles;
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when n = 0 then 'admin'::user_role else 'manager'::user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function current_role_is(r user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active and role = r
  );
$$;

create or replace function is_admin()
returns boolean language sql stable as $$ select current_role_is('admin'); $$;

create or replace function is_staff()  -- admin OR manager
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

-- ---------- Company settings (spec §4.1, §5, §14) -------------------------

create table company_settings (
  id                 int primary key default 1 check (id = 1),  -- single row
  work_days          smallint[] not null default '{1,2,3,4,5}', -- 0=Sun … 6=Sat
  default_start_time time not null default '07:00',
  default_end_time   time not null default '15:30',
  updated_at         timestamptz not null default now()
);
insert into company_settings default values;

create trigger company_settings_updated before update on company_settings
  for each row execute function set_updated_at();

-- Holidays: fully editable, any date (spec §4.3)
create table holidays (
  id           bigint generated always as identity primary key,
  holiday_date date not null unique,
  name         text not null default ''
);

-- ---------- Lookup lists (spec §6.2, §7.1) --------------------------------

create table personnel_roles (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true
);
insert into personnel_roles (name, sort_order) values
  ('Operator', 1), ('Laborer', 2), ('Foreman', 3),
  ('Superintendent', 4), ('Truck Driver', 5);

create table equipment_categories (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true
);
insert into equipment_categories (name, sort_order) values
  ('Excavator', 1), ('Skid Steer', 2), ('Dozer', 3), ('Truck', 4),
  ('Trailer', 5), ('Attachment', 6), ('Crusher', 7), ('Support Equipment', 8);

-- ---------- Projects (spec §3) --------------------------------------------

create table projects (
  id                  bigint generated always as identity primary key,
  name                text not null,
  address             text not null default '',
  status              project_status not null default 'awarded',
  start_type          start_type not null default 'tentative',
  planned_start       date,
  planned_end         date,
  est_duration_days   int check (est_duration_days is null or est_duration_days > 0),
  -- Work calendar (spec §4.2). null custom_* = use company default
  use_company_calendar boolean not null default true,
  custom_work_days    smallint[],
  custom_start_time   time,
  custom_end_time     time,
  notes               text not null default '',
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint planned_end_after_start
    check (planned_end is null or planned_start is null or planned_end >= planned_start)
);
create index projects_status_idx on projects (status);
create trigger projects_updated before update on projects
  for each row execute function set_updated_at();

create table project_contacts (
  id          bigint generated always as identity primary key,
  project_id  bigint not null references projects(id) on delete cascade,
  name        text not null,
  company     text not null default '',
  role        text not null default '',
  phone       text not null default '',
  email       text not null default '',
  notes       text not null default ''
);
create index project_contacts_project_idx on project_contacts (project_id);

-- ---------- Personnel (spec §6) -------------------------------------------

create table personnel (
  id          bigint generated always as identity primary key,
  full_name   text not null,
  role_id     bigint references personnel_roles(id),
  is_active   boolean not null default true,
  phone       text not null default '',
  email       text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger personnel_updated before update on personnel
  for each row execute function set_updated_at();

-- Dated history entries — append-only for Managers (spec §6.6)
create table personnel_entries (
  id            bigint generated always as identity primary key,
  personnel_id  bigint not null references personnel(id) on delete cascade,
  entry_date    date not null default current_date,
  entry_type    entry_type not null,
  description   text not null default '',
  severity      smallint check (severity is null or severity between 1 and 5),
  entered_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index personnel_entries_person_idx on personnel_entries (personnel_id, entry_date desc);

-- ---------- Equipment (spec §7) -------------------------------------------

create table equipment (
  id           bigint generated always as identity primary key,
  name         text not null,
  category_id  bigint references equipment_categories(id),
  unit_number  text not null default '',
  is_active    boolean not null default true,
  make         text not null default '',
  model        text not null default '',
  model_year   int,
  serial_no    text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger equipment_updated before update on equipment
  for each row execute function set_updated_at();

-- ---------- Assignments (spec §5, §6.3–6.4, §7.3–7.4, §8, §11) -----------

create table assignments (
  id            bigint generated always as identity primary key,
  project_id    bigint not null references projects(id) on delete cascade,
  kind          assignment_kind not null,

  -- Exactly one of these "targets" is set, depending on kind:
  personnel_id  bigint references personnel(id) on delete cascade,      -- personnel
  equipment_id  bigint references equipment(id) on delete cascade,      -- equipment
  role_id       bigint references personnel_roles(id),                  -- personnel_block, labor_crew
  category_id   bigint references equipment_categories(id),             -- equipment_block
  crew_company  text,                                                   -- labor_crew
  quantity      int not null default 1 check (quantity > 0),

  -- Planning-block conversion (spec §7.4): a specific-unit / specific-person
  -- assignment may "fulfill" a block, reducing that block's unassigned qty.
  fulfills_block_id bigint references assignments(id) on delete set null,

  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  notes         text not null default '',
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint ends_after_starts check (ends_at > starts_at),
  constraint kind_shape check (
    (kind = 'personnel'       and personnel_id is not null and equipment_id is null and category_id is null and quantity = 1) or
    (kind = 'equipment'       and equipment_id is not null and personnel_id is null and role_id is null and quantity = 1) or
    (kind = 'personnel_block' and role_id is not null and personnel_id is null and equipment_id is null and category_id is null) or
    (kind = 'labor_crew'      and crew_company is not null and personnel_id is null and equipment_id is null and category_id is null) or
    (kind = 'equipment_block' and category_id is not null and personnel_id is null and equipment_id is null and role_id is null)
  )
);
create index assignments_project_idx   on assignments (project_id);
create index assignments_time_idx      on assignments (starts_at, ends_at);
create index assignments_personnel_idx on assignments (personnel_id) where personnel_id is not null;
create index assignments_equipment_idx on assignments (equipment_id) where equipment_id is not null;
create trigger assignments_updated before update on assignments
  for each row execute function set_updated_at();

-- ============================================================================
-- Row-Level Security (spec §13)
--   Everyone signed in can READ everything.
--   Writes follow the Admin / Manager matrix.
-- ============================================================================

alter table profiles             enable row level security;
alter table company_settings     enable row level security;
alter table holidays             enable row level security;
alter table personnel_roles      enable row level security;
alter table equipment_categories enable row level security;
alter table projects             enable row level security;
alter table project_contacts     enable row level security;
alter table personnel            enable row level security;
alter table personnel_entries    enable row level security;
alter table equipment            enable row level security;
alter table assignments          enable row level security;

-- Read: any active staff member
create policy read_profiles     on profiles             for select using (is_staff());
create policy read_settings     on company_settings     for select using (is_staff());
create policy read_holidays     on holidays             for select using (is_staff());
create policy read_roles        on personnel_roles      for select using (is_staff());
create policy read_categories   on equipment_categories for select using (is_staff());
create policy read_projects     on projects             for select using (is_staff());
create policy read_contacts     on project_contacts     for select using (is_staff());
create policy read_personnel    on personnel            for select using (is_staff());
create policy read_entries      on personnel_entries    for select using (is_staff());
create policy read_equipment    on equipment            for select using (is_staff());
create policy read_assignments  on assignments          for select using (is_staff());

-- Settings, holidays, lookup lists, user roles: Admin only
create policy admin_profiles    on profiles             for all using (is_admin()) with check (is_admin());
create policy admin_settings    on company_settings     for all using (is_admin()) with check (is_admin());
create policy admin_holidays    on holidays             for all using (is_admin()) with check (is_admin());
create policy admin_roles       on personnel_roles      for all using (is_admin()) with check (is_admin());
create policy admin_categories  on equipment_categories for all using (is_admin()) with check (is_admin());

-- Projects: staff create/edit; Admin delete
create policy staff_insert_projects on projects for insert with check (is_staff());
create policy staff_update_projects on projects for update using (is_staff()) with check (is_staff());
create policy admin_delete_projects on projects for delete using (is_admin());

-- Project contacts: staff full control
create policy staff_contacts on project_contacts for all using (is_staff()) with check (is_staff());

-- Personnel: staff create/edit; Admin delete
create policy staff_insert_personnel on personnel for insert with check (is_staff());
create policy staff_update_personnel on personnel for update using (is_staff()) with check (is_staff());
create policy admin_delete_personnel on personnel for delete using (is_admin());

-- Personnel entries: staff add; Admin edit/delete (append-only for Managers)
create policy staff_insert_entries on personnel_entries for insert with check (is_staff());
create policy admin_update_entries on personnel_entries for update using (is_admin()) with check (is_admin());
create policy admin_delete_entries on personnel_entries for delete using (is_admin());

-- Equipment: staff full control incl. delete (spec §7.6)
create policy staff_equipment on equipment for all using (is_staff()) with check (is_staff());

-- Assignments: staff full control
create policy staff_assignments on assignments for all using (is_staff()) with check (is_staff());
