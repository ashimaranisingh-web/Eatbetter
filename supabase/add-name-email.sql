-- Adds readable name + email columns to user_data. Run once in SQL Editor.
-- Both are filled by the database on every save, never sent by the app:
--   email comes from the person's login (auth.users), so it can't be faked;
--   name is read out of the profile inside the synced snapshot.

alter table public.user_data add column if not exists email text;
alter table public.user_data add column if not exists name  text;

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
