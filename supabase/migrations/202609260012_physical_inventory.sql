-- Physical inventory is the single source of stock for product variants.
alter table public.product_variants add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete restrict;
alter table public.inventory_movements drop constraint if exists inventory_movements_variant_id_fkey;
alter table public.inventory_movements drop column if exists variant_id;
alter table public.product_variants drop column if exists stock;
delete from public.inventory_movements;
delete from public.inventory_items;
insert into public.inventory_items(sku,title,quantity,low_stock_threshold) values
 ('ACRYLIC-L-10X10','L shape acrylic — 10 × 10 cm',20,5),
 ('ACRYLIC-V-10X7','V shape acrylic — 10 × 7 cm',20,5);
drop function if exists public.adjust_inventory(uuid,integer,text,boolean);
drop function if exists public.create_inventory(text,text,integer);
create or replace function public.adjust_inventory(p_id uuid,p_delta integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('inventory.edit') or length(trim(p_reason))<3 or p_delta=0 or abs(p_delta)>100000 then raise exception 'Invalid or unauthorized adjustment'; end if;
 update public.inventory_items set quantity=quantity+p_delta,updated_at=now() where id=p_id and quantity+p_delta>=0;
 if not found then raise exception 'Inventory record not found or insufficient stock'; end if;
 insert into public.inventory_movements(inventory_item_id,delta,reason,actor) values(p_id,p_delta,p_reason,auth.uid());
end $$;
revoke execute on function public.adjust_inventory(uuid,integer,text) from anon;
create or replace function public.save_variant(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 if not public.has_permission('products.edit') then raise exception 'Forbidden'; end if;
 if p_id is null then
  insert into public.product_variants(product_id,sku,color,size,stand,price_override,image_url,active,inventory_item_id) values((p_data->>'product_id')::uuid,p_data->>'sku',p_data->>'color',p_data->>'size',p_data->>'stand',nullif(p_data->>'price_override','')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,true),nullif(p_data->>'inventory_item_id','')::uuid) returning id into v_id;
 else
  update public.product_variants set sku=p_data->>'sku',color=p_data->>'color',size=p_data->>'size',stand=p_data->>'stand',price_override=nullif(p_data->>'price_override','')::integer,image_url=nullif(p_data->>'image_url',''),active=coalesce((p_data->>'active')::boolean,true),inventory_item_id=nullif(p_data->>'inventory_item_id','')::uuid,updated_at=now() where id=p_id returning id into v_id;
 end if; return v_id;
end $$;
create index if not exists product_variants_inventory_item_idx on public.product_variants(inventory_item_id);
create or replace function public.variant_availability(p_ids uuid[]) returns table(variant_id uuid, stock integer) language sql stable security definer set search_path='' as $$
 select v.id,i.quantity from public.product_variants v join public.inventory_items i on i.id=v.inventory_item_id join public.products p on p.id=v.product_id where v.id=any(p_ids) and v.active and p.status='Active'
$$;
revoke all on function public.variant_availability(uuid[]) from public;
grant execute on function public.variant_availability(uuid[]) to anon,authenticated;

create or replace function public.checkout(p_request uuid,p_customer jsonb,p_items jsonb,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_variant public.product_variants; v_product public.products; v_inventory public.inventory_items; v_item jsonb; v_customer uuid; v_order_id uuid:=gen_random_uuid(); v_item_id uuid; v_total integer:=0; v_fee integer; v_currency text; v_qty integer; v_fingerprint text;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 or length(p_token)<40 then raise exception 'Invalid checkout'; end if;
 if length(p_customer->>'full_name') not between 2 and 120 or length(p_customer->>'phone') not between 6 and 30 or length(p_customer->>'address') not between 5 and 500 or length(p_customer->>'city') not between 2 and 120 then raise exception 'Invalid customer'; end if;
 v_fingerprint:=encode(extensions.digest((p_customer::text||p_items::text),'sha256'),'hex'); perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_order from public.orders where request_id=p_request;
 if found then if v_order.request_fingerprint<>v_fingerprint or v_order.tracking_hash<>encode(extensions.digest(p_token,'sha256'),'hex') then raise exception 'Checkout request conflict'; end if; return jsonb_build_object('number',v_order.number,'total',v_order.total,'currency',v_order.currency); end if;
 select (value->>'delivery_fee')::integer,value->>'currency' into strict v_fee,v_currency from public.site_settings where key='commerce';
 for v_item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
  v_qty:=(v_item->>'quantity')::integer; if v_qty not between 1 and 99 then raise exception 'Invalid quantity'; end if;
  select * into strict v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid for update;
  select * into strict v_product from public.products where id=v_variant.product_id for share;
  if not v_variant.active or v_product.status<>'Active' or v_variant.inventory_item_id is null then raise exception 'An item is unavailable or out of stock'; end if;
  select * into strict v_inventory from public.inventory_items where id=v_variant.inventory_item_id for update;
  if v_inventory.quantity<v_qty then raise exception 'An item is unavailable or out of stock'; end if;
  update public.inventory_items set quantity=quantity-v_qty,updated_at=now() where id=v_inventory.id;
  insert into public.inventory_movements(inventory_item_id,delta,reason) values(v_inventory.id,-v_qty,'Checkout reservation');
  v_total:=v_total+coalesce(v_variant.price_override,v_product.price)*v_qty;
 end loop;
 insert into public.customers(full_name,phone,email) values(p_customer->>'full_name',p_customer->>'phone',nullif(p_customer->>'email','')) returning id into v_customer;
 insert into public.customer_addresses(customer_id,address,city) values(v_customer,p_customer->>'address',p_customer->>'city');
 insert into public.orders(id,request_id,request_fingerprint,tracking_hash,customer_id,customer_name,phone,email,address,city,instructions,notes,subtotal,delivery_fee,total,currency) values(v_order_id,p_request,v_fingerprint,encode(extensions.digest(p_token,'sha256'),'hex'),v_customer,p_customer->>'full_name',p_customer->>'phone',nullif(p_customer->>'email',''),p_customer->>'address',p_customer->>'city',coalesce(p_customer->>'instructions',''),coalesce(p_customer->>'notes',''),v_total,v_fee,v_total+v_fee,v_currency) returning * into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
  select * into strict v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid; select * into strict v_product from public.products where id=v_variant.product_id;
  insert into public.order_items(order_id,variant_id,product_id,design_id,title,sku,color,size,stand,image_url,quantity,unit_price) values(v_order_id,v_variant.id,v_product.id,v_product.design_id,v_product.title,v_variant.sku,v_variant.color,v_variant.size,v_variant.stand,v_variant.image_url,(v_item->>'quantity')::integer,coalesce(v_variant.price_override,v_product.price)) returning id into v_item_id;
  insert into public.production_jobs(order_id,order_item_id) values(v_order_id,v_item_id);
 end loop;
 insert into public.order_status_history(order_id,status) values(v_order_id,'Order Received'); insert into public.payments(order_id,amount) values(v_order_id,v_order.total); insert into public.deliveries(order_id,fee) values(v_order_id,v_fee);
 return jsonb_build_object('number',v_order.number,'total',v_order.total,'currency',v_currency);
end $$;
