create or replace function public.complete_upload(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
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
 if r.bucket='product-images' and r.entity_id is not null then
 if not public.has_permission('products.edit') then raise exception 'Product edit permission required'; end if;
 insert into public.product_images(product_id,url,alt) values(r.entity_id,v_url,r.title);
 end if;
 end if;
 update public.upload_requests set completed=true where id=r.id;
 return r.path;
end $$;

drop function public.media_in_use(text);
drop table public.media;
create policy staff_delete_variant on public.product_variants for delete to authenticated using(public.has_permission('products.edit'));
