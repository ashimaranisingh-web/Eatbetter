-- Menu-fi shared pack database, update 2. Run once in Supabase → SQL Editor,
-- after food-products.sql. Safe to run more than once.
--
-- Adds:
--   • sugar (g per 100) and sodium (mg per 100) on products and reports
--   • "Report wrong numbers": one flag per person per barcode. The app stops
--     trusting a product once flags outnumber the labels that confirmed it,
--     and a fresh label read replaces it.
--   • submit_food_label_v2(): same as before, plus sugar and sodium.

alter table public.food_products        add column if not exists sugar  numeric check (sugar >= 0 and sugar <= 100);
alter table public.food_products        add column if not exists sodium numeric check (sodium >= 0 and sodium <= 40000);
alter table public.food_products        add column if not exists flags  int not null default 0;
alter table public.food_product_reports add column if not exists sugar  numeric;
alter table public.food_product_reports add column if not exists sodium numeric;

create table if not exists public.food_product_flags (
  barcode     text not null check (barcode ~ '^[0-9]{8,14}$'),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (barcode, user_id)
);
alter table public.food_product_flags enable row level security;
drop policy if exists "own flags: read" on public.food_product_flags;
create policy "own flags: read" on public.food_product_flags for select using (auth.uid() = user_id);

-- "These numbers are wrong" (signed-in people only, once each).
create or replace function public.flag_food_product(p_barcode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_barcode !~ '^[0-9]{8,14}$' then raise exception 'bad barcode'; end if;
  insert into public.food_product_flags (barcode, user_id) values (p_barcode, auth.uid())
    on conflict (barcode, user_id) do nothing;
  update public.food_products
     set flags = (select count(*) from public.food_product_flags f where f.barcode = p_barcode)
   where barcode = p_barcode;
end;
$$;
revoke all on function public.flag_food_product(text) from public, anon;
grant execute on function public.flag_food_product(text) to authenticated;

create or replace function public.submit_food_label_v2(
  p_barcode text, p_name text, p_per text, p_cal numeric,
  p_protein numeric, p_carbs numeric, p_fat numeric, p_fibre numeric,
  p_pack numeric, p_serving numeric, p_sugar numeric, p_sodium numeric
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  cur  public.food_products%rowtype;
  near numeric;
  trusted boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_barcode !~ '^[0-9]{8,14}$' then raise exception 'bad barcode'; end if;
  if p_cal is null or p_cal < 0 or p_cal > 950 then raise exception 'calories out of range'; end if;
  p_name := left(btrim(coalesce(p_name, '')), 120);
  if p_name = '' then raise exception 'name required'; end if;
  if p_per not in ('g', 'ml') then p_per := 'g'; end if;
  if p_sugar  is not null and (p_sugar  < 0 or p_sugar  > 100)   then p_sugar  := null; end if;
  if p_sodium is not null and (p_sodium < 0 or p_sodium > 40000) then p_sodium := null; end if;

  insert into public.food_product_reports as r
    (barcode, user_id, name, per_unit, cal, protein, carbs, fat, fibre, pack, serving, sugar, sodium)
  values (p_barcode, uid, p_name, p_per, p_cal, p_protein, p_carbs, p_fat, p_fibre, p_pack, p_serving, p_sugar, p_sodium)
  on conflict (barcode, user_id) do update set
    name = excluded.name, per_unit = excluded.per_unit, cal = excluded.cal, protein = excluded.protein,
    carbs = excluded.carbs, fat = excluded.fat, fibre = excluded.fibre, pack = excluded.pack,
    serving = excluded.serving, sugar = excluded.sugar, sodium = excluded.sodium, created_at = now();

  -- Someone reading the label again counts as fixing it: clear their own flag.
  delete from public.food_product_flags where barcode = p_barcode and user_id = uid;

  select * into cur from public.food_products where barcode = p_barcode;

  if not found then
    insert into public.food_products (barcode, name, per_unit, cal, protein, carbs, fat, fibre, pack, serving, sugar, sodium, confirmations)
    values (p_barcode, p_name, p_per, p_cal, p_protein, p_carbs, p_fat, p_fibre, p_pack, p_serving, p_sugar, p_sodium, 1);
    return;
  end if;

  near := greatest(5, cur.cal * 0.05);
  -- Confirmed and not disputed: one disagreeing label can't overwrite it.
  trusted := cur.confirmations >= 2 and cur.flags < cur.confirmations;

  if cur.per_unit = p_per and abs(cur.cal - p_cal) <= near then
    update public.food_products set
      confirmations = (select count(*) from public.food_product_reports r
                       where r.barcode = p_barcode and r.per_unit = cur.per_unit and abs(r.cal - cur.cal) <= near),
      protein = coalesce(protein, p_protein), carbs = coalesce(carbs, p_carbs),
      fat = coalesce(fat, p_fat), fibre = coalesce(fibre, p_fibre),
      pack = coalesce(pack, p_pack), serving = coalesce(serving, p_serving),
      sugar = coalesce(sugar, p_sugar), sodium = coalesce(sodium, p_sodium),
      flags = (select count(*) from public.food_product_flags f where f.barcode = p_barcode),
      updated_at = now()
    where barcode = p_barcode;
  elsif not trusted then
    -- Not confirmed, or disputed: the newer label wins and the flags reset.
    near := greatest(5, p_cal * 0.05);
    delete from public.food_product_flags where barcode = p_barcode;
    update public.food_products set
      name = p_name, per_unit = p_per, cal = p_cal, protein = p_protein, carbs = p_carbs,
      fat = p_fat, fibre = p_fibre, pack = p_pack, serving = p_serving, sugar = p_sugar, sodium = p_sodium,
      confirmations = (select count(*) from public.food_product_reports r
                       where r.barcode = p_barcode and r.per_unit = p_per and abs(r.cal - p_cal) <= near),
      flags = 0,
      updated_at = now()
    where barcode = p_barcode;
  end if;
end;
$$;

revoke all on function public.submit_food_label_v2(text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.submit_food_label_v2(text, text, text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;
