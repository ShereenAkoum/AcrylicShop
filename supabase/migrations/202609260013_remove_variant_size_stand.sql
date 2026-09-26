alter table public.product_variants drop column if exists size;
alter table public.product_variants drop column if exists stand;
-- save_variant and checkout no longer read variant size/stand. Checkout keeps historical order_items fields as empty strings for compatibility.
create or replace function public.save_variant(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 if not public.has_permission('products.edit') then raise exception 'Forbidden'; end if;
 if p_id is null then insert into public.product_variants(product_id,sku,color,price_override,image_url,active,inventory_item_id) values((p_data->>'product_id')::uuid,p_data->>'sku',p_data->>'color',nullif(p_data->>'price_override','')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,true),nullif(p_data->>'inventory_item_id','')::uuid) returning id into v_id;
 else update public.product_variants set sku=p_data->>'sku',color=p_data->>'color',price_override=nullif(p_data->>'price_override','')::integer,image_url=nullif(p_data->>'image_url',''),active=coalesce((p_data->>'active')::boolean,true),inventory_item_id=nullif(p_data->>'inventory_item_id','')::uuid,updated_at=now() where id=p_id returning id into v_id; end if; return v_id; end $$;
