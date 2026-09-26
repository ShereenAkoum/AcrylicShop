create function public.checkout(p_request uuid,p_customer jsonb,p_items jsonb,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_variant public.product_variants; v_product public.products; v_item jsonb; v_customer uuid; v_order_id uuid:=gen_random_uuid(); v_item_id uuid; v_total integer:=0; v_fee integer; v_currency text; v_qty integer; v_fingerprint text;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 or length(p_token)<40 then raise exception 'Invalid checkout'; end if;
 if length(p_customer->>'full_name') not between 2 and 120 or length(p_customer->>'phone') not between 6 and 30 or length(p_customer->>'address') not between 5 and 500 or length(p_customer->>'city') not between 2 and 120 then raise exception 'Invalid customer'; end if;
 v_fingerprint:=encode(extensions.digest((p_customer::text||p_items::text),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_order from public.orders where request_id=p_request;
 if found then
 if v_order.request_fingerprint<>v_fingerprint or v_order.tracking_hash<>encode(extensions.digest(p_token,'sha256'),'hex') then raise exception 'Checkout request conflict'; end if;
 return jsonb_build_object('number',v_order.number,'total',v_order.total,'currency',v_order.currency);
 end if;
 select (value->>'delivery_fee')::integer,value->>'currency' into strict v_fee,v_currency from public.site_settings where key='commerce';
 if v_fee<0 or v_currency!~'^[A-Z]{3}$' then raise exception 'Invalid commerce settings'; end if;
 -- Lock variants in deterministic order to prevent overselling and deadlocks.
 for v_item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
 v_qty:=(v_item->>'quantity')::integer;
 if v_qty not between 1 and 99 then raise exception 'Invalid quantity'; end if;
 select * into strict v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid for update;
 select * into strict v_product from public.products where id=v_variant.product_id for share;
 if not v_variant.active or v_product.status<>'Active' or v_variant.stock<v_qty then raise exception 'An item is unavailable or out of stock'; end if;
 update public.product_variants set stock=stock-v_qty where id=v_variant.id;
 insert into public.inventory_movements(variant_id,delta,reason) values(v_variant.id,-v_qty,'Checkout reservation');
 v_total:=v_total+coalesce(v_variant.price_override,v_product.price)*v_qty;
 end loop;
 insert into public.customers(full_name,phone,email) values(p_customer->>'full_name',p_customer->>'phone',nullif(p_customer->>'email','')) returning id into v_customer;
 insert into public.customer_addresses(customer_id,address,city) values(v_customer,p_customer->>'address',p_customer->>'city');
 insert into public.orders(id,request_id,request_fingerprint,tracking_hash,customer_id,customer_name,phone,email,address,city,instructions,notes,subtotal,delivery_fee,total,currency) values(v_order_id,p_request,v_fingerprint,encode(extensions.digest(p_token,'sha256'),'hex'),v_customer,p_customer->>'full_name',p_customer->>'phone',nullif(p_customer->>'email',''),p_customer->>'address',p_customer->>'city',coalesce(p_customer->>'instructions',''),coalesce(p_customer->>'notes',''),v_total,v_fee,v_total+v_fee,v_currency) returning * into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
 select * into strict v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid;
 select * into strict v_product from public.products where id=v_variant.product_id;
 insert into public.order_items(order_id,variant_id,product_id,design_id,title,sku,color,size,stand,image_url,quantity,unit_price) values(v_order_id,v_variant.id,v_product.id,v_product.design_id,v_product.title,v_variant.sku,v_variant.color,v_variant.size,v_variant.stand,v_variant.image_url,(v_item->>'quantity')::integer,coalesce(v_variant.price_override,v_product.price)) returning id into v_item_id;
 insert into public.production_jobs(order_id,order_item_id) values(v_order_id,v_item_id);
 end loop;
 insert into public.order_status_history(order_id,status) values(v_order_id,'Order Received');
 insert into public.payments(order_id,amount) values(v_order_id,v_order.total);
 insert into public.deliveries(order_id,fee) values(v_order_id,v_fee);
 return jsonb_build_object('number',v_order.number,'total',v_order.total,'currency',v_currency);
end $$;
create function public.track_order(p_number text,p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('number',o.number,'status',o.status,'created_at',o.created_at,'history',(select coalesce(jsonb_agg(jsonb_build_object('status',h.status,'created_at',h.created_at) order by h.created_at),'[]') from public.order_status_history h where h.order_id=o.id)) from public.orders o where o.number=p_number and o.tracking_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;
create function public.move_production(p_id uuid,p_stage text) returns void language plpgsql security definer set search_path='' as $$
declare v_job public.production_jobs; v_stages text[]:=array['New Order','Design','Approved','UV DTF','Applied','QC','Packed','Out for Delivery','Completed']; v_min integer; v_status text;
begin
 if not public.has_permission('production.edit') then raise exception 'Forbidden'; end if;
 select * into strict v_job from public.production_jobs where id=p_id;
 perform 1 from public.orders where id=v_job.order_id for update;
 select * into strict v_job from public.production_jobs where id=p_id for update;
 if array_position(v_stages,p_stage) is null or abs(array_position(v_stages,p_stage)-array_position(v_stages,v_job.stage))<>1 then raise exception 'Move one stage at a time'; end if;
 update public.production_jobs set stage=p_stage where id=p_id;
 insert into public.production_status_history(job_id,stage,actor) values(p_id,p_stage,auth.uid());
 select min(array_position(v_stages,stage)) into v_min from public.production_jobs where order_id=v_job.order_id;
 v_status:=case when v_min=9 then 'Delivered' when v_min=8 then 'Out for Delivery' when v_min=7 then 'Ready' when v_min>1 then 'Preparing' else 'Order Received' end;
 update public.orders set status=v_status where id=v_job.order_id and status<>v_status;
 if found then insert into public.order_status_history(order_id,status,actor) values(v_job.order_id,v_status,auth.uid()); end if;
end $$;
create function public.adjust_inventory(p_id uuid,p_delta integer,p_reason text,p_variant boolean default false) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('inventory.edit') or length(trim(p_reason))<3 or p_delta=0 or abs(p_delta)>100000 then raise exception 'Invalid or unauthorized adjustment'; end if;
 if p_variant then update public.product_variants set stock=stock+p_delta where id=p_id; else update public.inventory_items set quantity=quantity+p_delta where id=p_id; end if;
 if not found then raise exception 'Inventory record not found'; end if;
 insert into public.inventory_movements(inventory_item_id,variant_id,delta,reason,actor) values(case when not p_variant then p_id end,case when p_variant then p_id end,p_delta,p_reason,auth.uid());
end $$;
create function public.save_variant(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 if not public.has_permission('products.edit') then raise exception 'Forbidden'; end if;
 if p_id is null then
 insert into public.product_variants(product_id,sku,color,size,stand,price_override,image_url,active) values((p_data->>'product_id')::uuid,p_data->>'sku',p_data->>'color',p_data->>'size',p_data->>'stand',nullif(p_data->>'price_override','')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,true)) returning id into v_id;
 else
 update public.product_variants set sku=p_data->>'sku',color=p_data->>'color',size=p_data->>'size',stand=p_data->>'stand',price_override=nullif(p_data->>'price_override','')::integer,image_url=nullif(p_data->>'image_url',''),active=coalesce((p_data->>'active')::boolean,true) where id=p_id returning id into v_id;
 end if;
 return v_id;
end $$;
create function public.create_inventory(p_sku text,p_title text,p_threshold integer) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('inventory.edit') then raise exception 'Forbidden'; end if;
 insert into public.inventory_items(sku,title,low_stock_threshold) values(p_sku,p_title,p_threshold);
end $$;
create function public.update_payment(p_id uuid,p_status text,p_reference text,p_notes text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('payments.edit') then raise exception 'Forbidden'; end if;
 update public.payments set status=p_status,reference=p_reference,notes=p_notes where id=p_id;
end $$;
create function public.update_delivery(p_id uuid,p_status text,p_courier text,p_reference text,p_notes text) returns void language plpgsql security definer set search_path='' as $$ declare v_order uuid; v_status text; begin
 if not public.has_permission('deliveries.edit') then raise exception 'Forbidden'; end if;
 update public.deliveries set status=p_status,courier=p_courier,reference=p_reference,notes=p_notes where id=p_id returning order_id into strict v_order;
 if p_status in ('Out for Delivery','Delivered') then
 v_status:=p_status;
 update public.orders set status=v_status where id=v_order and status<>v_status;
 if found then insert into public.order_status_history(order_id,status,actor) values(v_order,v_status,auth.uid()); end if;
 end if;
end $$;
create function public.update_order_notes(p_id uuid,p_notes text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('orders.edit') then raise exception 'Forbidden'; end if;
 update public.orders set notes=p_notes where id=p_id;
end $$;
create function public.my_permissions() returns setof text language sql stable security definer set search_path='' as $$
 select key from public.permissions where public.has_permission(key);
$$;
-- Owner-only transactional role editing; owning role is immutable.
create function public.save_role(p_id uuid,p_name text,p_permissions text[]) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 if not public.is_owner() then raise exception 'Only an owner can manage roles'; end if;
 if exists(select 1 from public.roles where id=p_id and is_owner) then raise exception 'Owner role is immutable'; end if;
 if p_id is null then insert into public.roles(name) values(p_name) returning id into v_id;
 else update public.roles set name=p_name where id=p_id returning id into strict v_id; end if;
 delete from public.role_permissions where role_id=v_id;
 insert into public.role_permissions(role_id,permission_key) select v_id,unnest(p_permissions);
 return v_id;
end $$;
create function public.assign_staff(p_id uuid,p_role uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_owner() then raise exception 'Only an owner can manage staff'; end if;
 -- Owners cannot be disabled or demoted through the application, preserving recovery access.
 if exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=p_id and r.is_owner) then raise exception 'Owner accounts are protected'; end if;
 update public.profiles set active=p_active where id=p_id;
 delete from public.user_roles where user_id=p_id;
 insert into public.user_roles(user_id,role_id) values(p_id,p_role);
end $$;
revoke all on function public.checkout(uuid,jsonb,jsonb,text),public.track_order(text,text),public.move_production(uuid,text),public.adjust_inventory(uuid,integer,text,boolean),public.save_variant(uuid,jsonb),public.create_inventory(text,text,integer),public.update_payment(uuid,text,text,text),public.update_delivery(uuid,text,text,text,text),public.update_order_notes(uuid,text),public.my_permissions(),public.save_role(uuid,text,text[]),public.assign_staff(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.checkout(uuid,jsonb,jsonb,text),public.track_order(text,text) to service_role;
grant execute on function public.move_production(uuid,text),public.adjust_inventory(uuid,integer,text,boolean),public.save_variant(uuid,jsonb),public.create_inventory(text,text,integer),public.update_payment(uuid,text,text,text),public.update_delivery(uuid,text,text,text,text),public.update_order_notes(uuid,text),public.my_permissions(),public.save_role(uuid,text,text[]),public.assign_staff(uuid,uuid,boolean) to authenticated;
