-- PREVIEW: tablas products/categories (mismas columnas que database.types.ts) + datos ficticios.
-- No toca nada existente. user_id = usuario ficticio del preview.

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid,
  user_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text,
  barcode text,
  name text not null,
  description text,
  category_id uuid,
  user_id uuid not null,
  product_type text not null default 'simple',
  price numeric not null default 0,
  cost numeric not null default 0,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  max_stock numeric not null default 0,
  image_url text,
  active boolean not null default true,
  available_in_digital_menu boolean not null default true,
  available_in_pos boolean not null default true,
  currency text default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS permisivo (preview): anon puede leer/escribir. El rol privilegiado ya tiene acceso propio.
alter table public.categories enable row level security;
alter table public.products enable row level security;
do $$ begin
  create policy "preview_all_categories" on public.categories for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "preview_all_products" on public.products for all using (true) with check (true);
exception when duplicate_object then null; end $$;
grant all on public.categories to anon, authenticated;
grant all on public.products to anon, authenticated;

-- ===== DATOS FICTICIOS (menú de taquería) =====
do $$
declare
  uid uuid := '00000000-0000-0000-0000-000000000001';
  c_tacos uuid; c_beb uuid; c_post uuid;
begin
  if not exists (select 1 from public.products where user_id = uid) then
    insert into public.categories (name, user_id) values ('Tacos', uid) returning id into c_tacos;
    insert into public.categories (name, user_id) values ('Bebidas', uid) returning id into c_beb;
    insert into public.categories (name, user_id) values ('Postres', uid) returning id into c_post;

    insert into public.products (name, sku, barcode, price, cost, stock, category_id, user_id, description, image_url) values
      ('Taco al Pastor','TAC-001','1000000000001',22,8,200,c_tacos,uid,'Con piña, cebolla y cilantro','https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400'),
      ('Taco de Bistec','TAC-002','1000000000002',25,10,180,c_tacos,uid,'Bistec a la plancha','https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400'),
      ('Quesadilla de Queso','TAC-003','1000000000003',30,12,120,c_tacos,uid,'Tortilla de maiz con queso oaxaca','https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400'),
      ('Coca-Cola 600ml','BEB-001','2000000000001',20,12,300,c_beb,uid,'Refresco frio','https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400'),
      ('Agua de Horchata','BEB-002','2000000000002',18,6,90,c_beb,uid,'1 litro, natural','https://images.unsplash.com/photo-1497534446932-c925b458314a?w=400'),
      ('Flan Napolitano','POS-001','3000000000001',28,10,40,c_post,uid,'Casero con caramelo','https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400');
  end if;
end $$;
