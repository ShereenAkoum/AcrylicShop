insert into public.website_documents(key,title,draft,published,published_at) values('theme','Theme','{"light_primary":"#3F5038","dark_primary":"#B1C09F"}','{"light_primary":"#3F5038","dark_primary":"#B1C09F"}',now());
create function public.unpublish_document(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.has_permission('website.publish') then raise exception 'Forbidden'; end if;
 update public.website_documents set published=null,published_at=null where id=p_id;
 insert into public.audit_logs(actor,action,entity_type,entity_id) values(auth.uid(),'website.unpublished','website_documents',p_id::text);
end $$;
create function public.production_board() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not public.has_permission('production.view') then raise exception 'Forbidden'; end if;
 return (select coalesce(jsonb_agg(x),'[]') from (select j.id,j.stage,j.created_at,o.number order_number,i.title,i.sku,i.color,i.size,i.stand,i.quantity,i.image_url,d.code design_code,case when public.has_permission('customers.view') then o.customer_name end customer_name,case when public.has_permission('payments.view') then (select p.status from public.payments p where p.order_id=o.id order by p.created_at desc limit 1) end payment_status from public.production_jobs j join public.order_items i on i.id=j.order_item_id join public.orders o on o.id=j.order_id left join public.designs d on d.id=i.design_id where j.stage<>'Completed' order by j.created_at limit 250) x);
end $$;
revoke all on function public.unpublish_document(uuid),public.production_board() from public,anon,authenticated;
grant execute on function public.unpublish_document(uuid),public.production_board() to authenticated;
