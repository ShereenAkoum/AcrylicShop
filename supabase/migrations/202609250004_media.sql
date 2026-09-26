create function public.media_in_use(p_url text) returns boolean language plpgsql stable security definer set search_path='' as $$ begin
 if not public.has_permission('media.edit') then raise exception 'Forbidden'; end if;
 return exists(select 1 from public.product_images where url=p_url) or exists(select 1 from public.product_variants where image_url=p_url) or exists(select 1 from public.categories where image_url=p_url) or exists(select 1 from public.collections where image_url=p_url) or exists(select 1 from public.designs where preview_url=p_url) or exists(select 1 from public.website_documents where position(p_url in draft::text)>0 or position(p_url in published::text)>0);
end $$;
revoke all on function public.media_in_use(text) from public,anon,authenticated;
grant execute on function public.media_in_use(text) to authenticated;
