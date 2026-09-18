-- ============================================================================
-- 0003 — Invite-only sign-up
-- Only email addresses an Admin has invited can create an account.
-- Run in the Supabase SQL editor after 0002.
-- ============================================================================

create table invited_users (
  id           bigint generated always as identity primary key,
  email        text not null,
  role         user_role not null default 'manager',
  invited_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  constraint invited_email_lower check (email = lower(email))
);
create unique index invited_users_email_idx on invited_users (email);

alter table invited_users enable row level security;
create policy read_invites  on invited_users for select using (is_staff());
create policy admin_invites on invited_users for all using (is_admin()) with check (is_admin());

-- Runs when someone tries to create an account. If the email was not
-- invited, raise an error — Supabase then refuses to create the account.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv invited_users%rowtype;
  n int;
begin
  select count(*) into n from profiles;

  -- The very first account (the company owner) is always allowed and is Admin.
  if n = 0 then
    insert into profiles (id, full_name, role)
    values (new.id,
            coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
            'admin');
    return new;
  end if;

  select * into inv from invited_users
   where email = lower(new.email) and accepted_at is null;

  if not found then
    raise exception 'NOT_INVITED: % has not been invited to ISW Scheduler', new.email
      using errcode = 'P0001';
  end if;

  insert into profiles (id, full_name, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          inv.role);

  update invited_users set accepted_at = now() where id = inv.id;
  return new;
end $$;

-- Lets the sign-up form check an address before submitting, so the person
-- gets a clear message instead of a generic database error. Callable
-- without being signed in; only reveals yes/no for a specific address.
create or replace function is_invited(check_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from invited_users
    where email = lower(trim(check_email)) and accepted_at is null
  );
$$;
grant execute on function is_invited(text) to anon, authenticated;
