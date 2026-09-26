alter table public.product_variants add column if not exists stock_allocation integer not null default 0 check(stock_allocation>=0);
-- Variant stock is an allocation from its selected physical inventory pool, not the physical quantity itself.
