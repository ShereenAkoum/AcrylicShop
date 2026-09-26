create extension if not exists pgcrypto with schema extensions;

create table public.roles (id uuid primary key default gen_random_uuid(), name text unique not null, description text not null default '', is_owner boolean not null default false, created_at timestamptz not null default now());
create unique index one_owner_role on public.roles(is_owner) where is_owner;
create table public.permissions (key text primary key, description text not null);
create table public.role_permissions (role_id uuid references public.roles on delete cascade, permission_key text references public.permissions on delete cascade, primary key(role_id,permission_key));
create table public.profiles (id uuid primary key references auth.users on delete restrict, username text unique not null check(username ~ '^[a-z0-9_]{3,32}$'), full_name text not null, email text, phone text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.user_roles (user_id uuid references public.profiles on delete cascade, role_id uuid references public.roles on delete cascade, primary key(user_id,role_id));
create function public.has_permission(p_key text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p join public.user_roles ur on ur.user_id=p.id join public.roles r on r.id=ur.role_id left join public.role_permissions rp on rp.role_id=r.id where p.id=auth.uid() and p.active and (r.is_owner or rp.permission_key=p_key));
$$;
create function public.is_owner() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p join public.user_roles ur on ur.user_id=p.id join public.roles r on r.id=ur.role_id where p.id=auth.uid() and p.active and r.is_owner);
$$;
create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor uuid references public.profiles, action text not null, entity_type text not null, entity_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create index audit_lookup on public.audit_logs(created_at desc,action,entity_type);
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor,action,entity_type,entity_id,metadata) values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(OLD)->>'id'),jsonb_build_object('before',case when TG_OP='INSERT' then null else to_jsonb(OLD) end,'after',case when TG_OP='DELETE' then null else to_jsonb(NEW) end));
 return coalesce(NEW,OLD);
end $$;
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin NEW.updated_at=now(); return NEW; end $$;

create table public.categories (id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '', image_url text, active boolean not null default true, seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.collections (like public.categories including defaults including constraints including indexes);
create sequence public.design_number start 1;
create table public.designs (id uuid primary key default gen_random_uuid(), code text unique not null default 'YQ-D'||lpad(nextval('public.design_number')::text,3,'0'), title text not null, arabic_phrase text not null default '', transliteration text, translation text, type text not null default 'Quote' check(type in ('Quran','Dua','Dhikr','Quote','Custom')), reference text, source_notes text, shape text, supported_sizes text[] not null default '{}', colors text[] not null default '{}', tags text[] not null default '{}', preview_url text, status text not null default 'Draft' check(status in ('Draft','Approved','Archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), sku text unique not null, slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null, arabic_title text not null default '', transliteration text, translation text, description text not null default '', price integer not null check(price>=0), compare_at_price integer check(compare_at_price>=0), category_id uuid references public.categories on delete set null, design_id uuid references public.designs on delete set null, shape text not null default 'Rectangle', status text not null default 'Draft' check(status in ('Draft','Active','Archived')), featured boolean not null default false, bestseller boolean not null default false, new_arrival boolean not null default false, seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index product_catalog on public.products(status,created_at desc);
create table public.product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, sku text unique not null, color text not null, size text not null, stand text not null, price_override integer check(price_override>=0), stock integer not null default 0 check(stock>=0), image_url text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(product_id,color,size,stand));
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, url text not null, alt text not null default '', position integer not null default 0, created_at timestamptz not null default now());
create table public.collection_products (collection_id uuid references public.collections on delete cascade, product_id uuid references public.products on delete cascade, primary key(collection_id,product_id));
create table public.design_assets (id uuid primary key default gen_random_uuid(), design_id uuid not null references public.designs on delete restrict, path text unique not null, title text not null, created_at timestamptz not null default now());
create table public.media (id uuid primary key default gen_random_uuid(), bucket text not null check(bucket in ('product-images','website-media','design-previews')), path text not null, url text not null, title text not null, alt text not null default '', folder text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(bucket,path));

create table public.customers (id uuid primary key default gen_random_uuid(), full_name text not null, phone text not null, email text, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index customer_search on public.customers(phone,email);
create table public.customer_addresses (id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers on delete cascade, address text not null, city text not null, created_at timestamptz not null default now());
create sequence public.order_number start 10001;
create table public.orders (id uuid primary key default gen_random_uuid(), number text unique not null default 'YQ-'||nextval('public.order_number')::text, request_id uuid unique not null, request_fingerprint text not null, tracking_hash text unique not null, customer_id uuid not null references public.customers, customer_name text not null, phone text not null, email text, address text not null, city text not null, instructions text not null default '', notes text not null default '', subtotal integer not null check(subtotal>=0), delivery_fee integer not null check(delivery_fee>=0), discount integer not null default 0 check(discount>=0), total integer not null check(total=subtotal+delivery_fee-discount), currency text not null default 'USD', status text not null default 'Order Received' check(status in ('Order Received','Preparing','Ready','Out for Delivery','Delivered')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index orders_created on public.orders(created_at desc);
create index orders_customer on public.orders(customer_id);
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, variant_id uuid not null references public.product_variants, product_id uuid not null references public.products, design_id uuid references public.designs, title text not null, sku text not null, color text not null, size text not null, stand text not null, image_url text, quantity integer not null check(quantity between 1 and 99), unit_price integer not null check(unit_price>=0), created_at timestamptz not null default now());
create index order_items_order on public.order_items(order_id);
create table public.order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, status text not null, actor uuid references public.profiles, created_at timestamptz not null default now());
create table public.production_jobs (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, order_item_id uuid unique not null references public.order_items, stage text not null default 'New Order' check(stage in ('New Order','Design','Approved','UV DTF','Applied','QC','Packed','Out for Delivery','Completed')), notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.production_status_history (id uuid primary key default gen_random_uuid(), job_id uuid not null references public.production_jobs, stage text not null, actor uuid references public.profiles, created_at timestamptz not null default now());
create table public.inventory_items (id uuid primary key default gen_random_uuid(), sku text unique not null, title text not null, quantity integer not null default 0 check(quantity>=0), low_stock_threshold integer not null default 5 check(low_stock_threshold>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.inventory_movements (id uuid primary key default gen_random_uuid(), inventory_item_id uuid references public.inventory_items, variant_id uuid references public.product_variants, delta integer not null, reason text not null, actor uuid references public.profiles, created_at timestamptz not null default now(), check(num_nonnulls(inventory_item_id,variant_id)=1));
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, method text not null default 'Cash on Delivery', amount integer not null check(amount>=0), status text not null default 'Pending' check(status in ('Pending','Paid','Failed','Refunded','Partially Refunded')), reference text, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.deliveries (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references public.orders, courier text, reference text, fee integer not null default 0 check(fee>=0), notes text not null default '', status text not null default 'Pending' check(status in ('Pending','Assigned','Out for Delivery','Delivered','Failed','Returned')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- Each CMS document has a separate private draft and public snapshot.
create table public.website_documents (id uuid primary key default gen_random_uuid(), key text unique not null check(key ~ '^[a-z0-9-]+$'), title text not null, draft jsonb not null default '{}', published jsonb, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.site_settings (id uuid primary key default gen_random_uuid(), key text unique not null, value jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.rate_limits (key text primary key, hits integer not null, window_start timestamptz not null);
create function public.consume_rate_limit(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare v_hits integer; begin
 insert into public.rate_limits(key,hits,window_start) values(p_key,1,now()) on conflict(key) do update set hits=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else public.rate_limits.hits+1 end, window_start=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else public.rate_limits.window_start end returning hits into v_hits;
 return v_hits<=p_max;
end $$;

-- Permission checks resolve live role membership, including immediate user disable.
do $$ declare t text; module text; begin
 foreach t in array array['roles','permissions','role_permissions','profiles','user_roles','audit_logs','categories','collections','designs','products','product_variants','product_images','collection_products','design_assets','media','customers','customer_addresses','orders','order_items','order_status_history','production_jobs','production_status_history','inventory_items','inventory_movements','payments','deliveries','website_documents','site_settings','rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 module:=case when t in ('products','product_variants','product_images','categories','collections','collection_products') then 'products' when t in ('designs','design_assets') then 'designs' when t in ('customers','customer_addresses') then 'customers' when t in ('orders','order_items','order_status_history') then 'orders' when t in ('production_jobs','production_status_history') then 'production' when t in ('inventory_items','inventory_movements') then 'inventory' when t='website_documents' then 'website' when t='site_settings' then 'settings' when t in ('roles','permissions','role_permissions','profiles','user_roles') then 'users' when t='audit_logs' then 'audit' else t end;
 if t<>'rate_limits' then
 execute format('create policy staff_read on public.%I for select to authenticated using(public.has_permission(%L))',t,module||'.view');
 end if;
 -- Sensitive writes go through narrow RPCs or the server account administration API.
 if t in ('products','product_images','categories','collections','collection_products','designs','design_assets','media','customers','customer_addresses','website_documents','site_settings') then
 execute format('create policy staff_insert on public.%I for insert to authenticated with check(public.has_permission(%L))',t,module||'.edit');
 execute format('create policy staff_update on public.%I for update to authenticated using(public.has_permission(%L)) with check(public.has_permission(%L))',t,module||'.edit',module||'.edit');
 end if;
 if t in ('product_images','collection_products','media') then execute format('create policy staff_delete on public.%I for delete to authenticated using(public.has_permission(%L))',t,module||'.edit'); end if;
 if t not in ('audit_logs','rate_limits','permissions') then execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_change()',t); end if;
 if t in ('profiles','categories','collections','designs','products','product_variants','media','customers','orders','production_jobs','inventory_items','payments','deliveries','website_documents','site_settings') then execute format('create trigger touch_row before update on public.%I for each row execute function public.touch_updated_at()',t); end if;
 end loop;
end $$;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_roles on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy public_products on public.products for select to anon,authenticated using(status='Active');
create policy public_categories on public.categories for select to anon,authenticated using(active);
create policy public_collections on public.collections for select to anon,authenticated using(active);
create policy public_variants on public.product_variants for select to anon,authenticated using(active and exists(select 1 from public.products p where p.id=product_id and p.status='Active'));
create policy public_images on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and p.status='Active'));
create policy public_collection_products on public.collection_products for select to anon,authenticated using(exists(select 1 from public.collections c where c.id=collection_id and c.active) and exists(select 1 from public.products p where p.id=product_id and p.status='Active'));
-- Public CMS access only through this function: draft column never leaves the database.
create function public.published_document(p_key text) returns jsonb language sql stable security definer set search_path='' as $$ select published from public.website_documents where key=p_key; $$;
create function public.publish_document(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('website.publish') then raise exception 'Forbidden'; end if;
 update public.website_documents set published=draft,published_at=now() where id=p_id;
 insert into public.audit_logs(actor,action,entity_type,entity_id) values(auth.uid(),'website.published','website_documents',p_id::text);
end $$;
-- Do not allow editors to bypass publish permission by directly changing the snapshot.
create function public.guard_publish() returns trigger language plpgsql set search_path='' as $$ begin
 if (NEW.published is distinct from OLD.published or NEW.published_at is distinct from OLD.published_at) and current_user not in ('postgres','supabase_admin') and not public.has_permission('website.publish') then raise exception 'Publish permission required'; end if; return NEW;
end $$;
create trigger guard_publish before update on public.website_documents for each row execute function public.guard_publish();
revoke insert,update on public.website_documents from authenticated;
grant insert(key,title,draft),update(title,draft) on public.website_documents to authenticated;

insert into public.permissions(key,description) select module||'.'||operation,initcap(operation)||' '||module from unnest(array['products','designs','orders','production','inventory','customers','payments','deliveries','website','media','settings','users']) module cross join unnest(array['view','edit']) operation;
insert into public.permissions values ('website.publish','Publish website content'),('download_production_files','Download private production artwork'),('audit.view','View audit history'),('reports.view','View business reports');
insert into public.roles(name,description,is_owner) values('Owner','Full access; only owners can manage staff and roles',true),('Admin','Business administration',false),('Production','Production workflow',false),('Customer Service','Customer and order support',false),('Content Editor','Catalog and website content',false),('Viewer','Read-only operations',false);
insert into public.role_permissions select r.id,p.key from public.roles r cross join public.permissions p where (r.name='Admin' and p.key not like 'users.%') or (r.name='Production' and p.key in ('production.view','production.edit','designs.view','download_production_files')) or (r.name='Customer Service' and p.key in ('orders.view','orders.edit','customers.view','customers.edit','deliveries.view','deliveries.edit')) or (r.name='Content Editor' and p.key in ('products.view','products.edit','designs.view','designs.edit','website.view','website.edit','media.view','media.edit')) or (r.name='Viewer' and p.key in ('products.view','production.view','inventory.view'));
insert into public.site_settings(key,value) values('commerce','{"currency":"USD","delivery_fee":300}');

-- Private bucket has no direct SELECT policy: all downloads pass through audited RPC + server signing.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('website-media','website-media',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('design-previews','design-previews',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('production-files','production-files',false,52428800,array['application/pdf','image/png','image/tiff','application/zip']);
create policy upload_public on storage.objects for insert to authenticated with check(bucket_id in ('product-images','website-media','design-previews') and public.has_permission('media.edit'));
create policy delete_public on storage.objects for delete to authenticated using(bucket_id in ('product-images','website-media','design-previews') and public.has_permission('media.edit'));
create policy read_public_metadata on storage.objects for select to authenticated using(bucket_id in ('product-images','website-media','design-previews') and public.has_permission('media.view'));
create policy upload_private on storage.objects for insert to authenticated with check(bucket_id='production-files' and public.has_permission('designs.edit'));
create function public.authorize_download(p_id uuid) returns text language plpgsql security definer set search_path='' as $$ declare v_path text; begin
 if not public.has_permission('download_production_files') then raise exception 'Forbidden'; end if;
 select path into strict v_path from public.design_assets where id=p_id;
 insert into public.audit_logs(actor,action,entity_type,entity_id) values(auth.uid(),'production_file.downloaded','design_assets',p_id::text);
 return v_path;
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly close every function.
revoke all on function public.has_permission(text),public.is_owner(),public.audit_change(),public.touch_updated_at(),public.consume_rate_limit(text,integer,integer),public.published_document(text),public.publish_document(uuid),public.guard_publish(),public.authorize_download(uuid) from public,anon,authenticated;
grant execute on function public.has_permission(text),public.is_owner() to authenticated;
grant execute on function public.published_document(text) to anon,authenticated;
grant execute on function public.publish_document(uuid),public.authorize_download(uuid) to authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant select on public.roles,public.permissions,public.role_permissions,public.profiles,public.user_roles,public.audit_logs,public.categories,public.collections,public.designs,public.products,public.product_variants,public.product_images,public.collection_products,public.design_assets,public.media,public.customers,public.customer_addresses,public.orders,public.order_items,public.order_status_history,public.production_jobs,public.production_status_history,public.inventory_items,public.inventory_movements,public.payments,public.deliveries,public.website_documents,public.site_settings to authenticated;
grant select on public.products,public.product_variants,public.product_images,public.categories,public.collections,public.collection_products to anon;
grant usage,select on public.design_number,public.order_number to authenticated,service_role;
