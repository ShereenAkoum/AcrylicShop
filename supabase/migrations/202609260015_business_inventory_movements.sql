alter table public.inventory_movements add column if not exists movement_type text not null default 'Adjustment';
alter table public.inventory_movements add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.inventory_movements add column if not exists order_number text;
alter table public.inventory_movements add column if not exists product_title text;
alter table public.inventory_movements add column if not exists variant_sku text;
alter table public.inventory_movements drop constraint if exists inventory_movements_actor_fkey;
alter table public.inventory_movements add constraint inventory_movements_actor_fkey foreign key(actor) references public.profiles(id) on delete set null;
create index if not exists inventory_movements_order_idx on public.inventory_movements(order_id);
create index if not exists inventory_movements_item_created_idx on public.inventory_movements(inventory_item_id,created_at desc);
-- Live Supabase migration also updates adjust_inventory and checkout so manual movements have clear types,
-- and successful checkout deducts both physical quantity and the variant allocation while recording order/product/SKU context.
