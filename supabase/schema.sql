-- Menu-fi accounts + sync. Run once in Supabase → SQL Editor.
-- One row per person holding their app snapshot. Row-level security means
-- the public anon key can only ever read or write the signed-in person's row.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  email      text,   -- filled by trigger (see add-name-email.sql)
  name       text,   -- filled by trigger
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "own row: read"   on public.user_data;
drop policy if exists "own row: insert" on public.user_data;
drop policy if exists "own row: update" on public.user_data;
drop policy if exists "own row: delete" on public.user_data;

create policy "own row: read"   on public.user_data for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.user_data for delete using (auth.uid() = user_id);

-- In-app account deletion (required by App Store guideline 5.1.1(v)).
-- Deleting the auth user cascades to user_data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Readable name + email columns, filled automatically on every save.

create or replace function public.user_data_fill_labels()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.email into new.email from auth.users u where u.id = new.user_id;
  begin
    new.name := nullif(((new.data -> 'keys' ->> 'eb_profile')::jsonb ->> 'name'), '');
  exception when others then
    new.name := null;   -- a damaged profile never blocks the backup
  end;
  return new;
end;
$$;

drop trigger if exists user_data_fill_labels on public.user_data;
create trigger user_data_fill_labels
  before insert or update on public.user_data
  for each row execute function public.user_data_fill_labels();

-- Fill the columns for rows that already exist.
update public.user_data set updated_at = updated_at;
