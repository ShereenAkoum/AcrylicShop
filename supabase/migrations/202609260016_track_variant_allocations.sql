alter table public.inventory_movements add column if not exists allocation_delta integer;
alter table public.inventory_movements add column if not exists allocation_variant_id uuid references public.product_variants(id) on delete set null;
-- save_variant now writes an Allocation movement whenever a variant allocation changes.
-- Allocation movements have delta=0 because physical stock does not move until a sale/manual usage occurs.
