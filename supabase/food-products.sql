-- Menu-fi shared pack database. Run once in Supabase → SQL Editor.
--
-- When someone reads a pack's nutrition label in the app, the barcode and its
-- numbers are shared so the next person who scans that pack gets it instantly.
--
--   food_products         one row per barcode: name + nutrition. Readable by
--                         everyone using the app (it's public pack information).
--   food_product_reports  one row per person per barcode. Only that person can
--                         read their own rows. Used so one person can't confirm
--                         a product twice.
--
-- Clients never write food_products directly: everything goes through
-- submit_food_label(), which checks the values and decides what to keep.
-- Two people's labels agreeing (calories within 5%) marks a product confirmed;
-- one disagreeing label can't overwrite a confirmed product.

create table if not exists public.food_products (
  barcode        text primary key check (barcode ~ '^[0-9]{8,14}$'),
  name           text not null check (char_length(name) between 1 and 120),
  per_unit       text not null default 'g' check (per_unit in ('g', 'ml')),
  cal            numeric not null check (cal >= 0 and cal <= 950),
  protein        numeric check (protein >= 0 and protein <= 100),
  carbs          numeric check (carbs >= 0 and carbs <= 100),
  fat            numeric check (fat >= 0 and fat <= 100),
  fibre          numeric check (fibre >= 0 and fibre <= 100),
  pack           numeric check (pack > 0 and pack <= 100000),
  serving        numeric check (serving > 0 and serving <= 5000),
  confirmations  int not null default 1,
  updated_at     timestamptz not null default now()
);

create table if not exists public.food_product_reports (
  barcode     text not null check (barcode ~ '^[0-9]{8,14}$'),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  per_unit    text not null,
  cal         numeric not null,
  protein     numeric,
  carbs       numeric,
  fat         numeric,
  fibre       numeric,
  pack        numeric,
  serving     numeric,
  created_at  timestamptz not null default now(),
  primary key (barcode, user_id)
);

alter table public.food_products enable row level security;
alter table public.food_product_reports enable row level security;

drop policy if exists "anyone: read products" on public.food_products;
create policy "anyone: read products" on public.food_products for select using (true);

drop policy if exists "own reports: read" on public.food_product_reports;
create policy "own reports: read" on public.food_product_reports for select using (auth.uid() = user_id);
-- No insert/update/delete policies: writes only happen inside submit_food_label().

create or replace function public.submit_food_label(
  p_barcode text, p_name text, p_per text, p_cal numeric,
  p_protein numeric, p_carbs numeric, p_fat numeric, p_fibre numeric,
  p_pack numeric, p_serving numeric
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  cur  public.food_products%rowtype;
  near numeric;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_barcode !~ '^[0-9]{8,14}$' then raise exception 'bad barcode'; end if;
  if p_cal is null or p_cal < 0 or p_cal > 950 then raise exception 'calories out of range'; end if;
  p_name := left(btrim(coalesce(p_name, '')), 120);
  if p_name = '' then raise exception 'name required'; end if;
  if p_per not in ('g', 'ml') then p_per := 'g'; end if;

  -- One report per person per barcode (a newer label replaces their older one).
  insert into public.food_product_reports as r
    (barcode, user_id, name, per_unit, cal, protein, carbs, fat, fibre, pack, serving)
  values (p_barcode, uid, p_name, p_per, p_cal, p_protein, p_carbs, p_fat, p_fibre, p_pack, p_serving)
  on conflict (barcode, user_id) do update set
    name = excluded.name, per_unit = excluded.per_unit, cal = excluded.cal, protein = excluded.protein,
    carbs = excluded.carbs, fat = excluded.fat, fibre = excluded.fibre, pack = excluded.pack,
    serving = excluded.serving, created_at = now();

  select * into cur from public.food_products where barcode = p_barcode;

  if not found then
    insert into public.food_products (barcode, name, per_unit, cal, protein, carbs, fat, fibre, pack, serving, confirmations)
    values (p_barcode, p_name, p_per, p_cal, p_protein, p_carbs, p_fat, p_fibre, p_pack, p_serving, 1);
    return;
  end if;

  near := greatest(5, cur.cal * 0.05);
  if cur.per_unit = p_per and abs(cur.cal - p_cal) <= near then
    -- Agrees: count everyone whose label matches, fill in anything missing.
    update public.food_products set
      confirmations = (select count(*) from public.food_product_reports r
                       where r.barcode = p_barcode and r.per_unit = cur.per_unit and abs(r.cal - cur.cal) <= near),
      protein = coalesce(protein, p_protein), carbs = coalesce(carbs, p_carbs),
      fat = coalesce(fat, p_fat), fibre = coalesce(fibre, p_fibre),
      pack = coalesce(pack, p_pack), serving = coalesce(serving, p_serving),
      updated_at = now()
    where barcode = p_barcode;
  elsif cur.confirmations < 2 then
    -- Not confirmed yet: the newer label wins.
    near := greatest(5, p_cal * 0.05);
    update public.food_products set
      name = p_name, per_unit = p_per, cal = p_cal, protein = p_protein, carbs = p_carbs,
      fat = p_fat, fibre = p_fibre, pack = p_pack, serving = p_serving,
      confirmations = (select count(*) from public.food_product_reports r
                       where r.barcode = p_barcode and r.per_unit = p_per and abs(r.cal - p_cal) <= near),
      updated_at = now()
    where barcode = p_barcode;
  end if;
  -- Confirmed and this label disagrees: keep the confirmed values (the report is still stored).
end;
$$;

revoke all on function public.submit_food_label(text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.submit_food_label(text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;
