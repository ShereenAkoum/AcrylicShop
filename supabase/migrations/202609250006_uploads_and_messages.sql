create table public.upload_requests(id uuid primary key default gen_random_uuid(), actor uuid not null references public.profiles, bucket text not null check(bucket in ('product-images','website-media','design-previews','production-files')), path text unique not null, title text not null, folder text not null default '', entity_id uuid, completed boolean not null default false, created_at timestamptz not null default now());
alter table public.upload_requests enable row level security;
create policy own_upload_read on public.upload_requests for select to authenticated using(actor=auth.uid());
create policy own_upload_insert on public.upload_requests for insert to authenticated with check(actor=auth.uid() and ((bucket='production-files' and public.has_permission('designs.edit')) or (bucket<>'production-files' and public.has_permission('media.edit'))));
create function public.complete_upload(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare r public.upload_requests; v_url text;
begin
 select * into strict r from public.upload_requests where id=p_id and actor=auth.uid() and created_at>now()-interval '2 hours' for update;
 if r.completed then return r.path; end if;
 if r.bucket='production-files' then
 if not public.has_permission('designs.edit') then raise exception 'Forbidden'; end if;
 else
 if not public.has_permission('media.edit') then raise exception 'Forbidden'; end if;
 end if;
 if not exists(select 1 from storage.objects where bucket_id=r.bucket and name=r.path) then raise exception 'Upload not found'; end if;
 if r.bucket='production-files' then insert into public.design_assets(design_id,path,title) values(r.entity_id,r.path,r.title);
 else
 v_url:='/storage/v1/object/public/'||r.bucket||'/'||r.path;
 insert into public.media(bucket,path,url,title,alt,folder) values(r.bucket,r.path,v_url,r.title,r.title,r.folder);
 if r.bucket='product-images' and r.entity_id is not null then
 if not public.has_permission('products.edit') then raise exception 'Product edit permission required'; end if;
 insert into public.product_images(product_id,url,alt) values(r.entity_id,v_url,r.title);
 end if;
 end if;
 update public.upload_requests set completed=true where id=r.id;
 return r.path;
end $$;
revoke all on function public.complete_upload(uuid) from public,anon,authenticated;
grant execute on function public.complete_upload(uuid) to authenticated;
grant select,insert on public.upload_requests to authenticated;
create table public.contact_messages(id uuid primary key default gen_random_uuid(), full_name text not null, email text not null, message text not null, created_at timestamptz not null default now());
create table public.newsletter_subscribers(id uuid primary key default gen_random_uuid(), email text unique not null, consent_at timestamptz not null default now());
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
create policy contact_read on public.contact_messages for select to authenticated using(public.has_permission('customers.view'));
create policy newsletter_read on public.newsletter_subscribers for select to authenticated using(public.has_permission('customers.view'));
grant select on public.contact_messages,public.newsletter_subscribers to authenticated;
