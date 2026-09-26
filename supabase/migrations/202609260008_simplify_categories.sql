-- Consolidate catalog placement without deleting products or their artwork.
insert into public.categories(title,slug) values ('Desk Reminders','desk-reminders')
on conflict(slug) do nothing;
update public.products set category_id=(select id from public.categories where slug='desk-reminders');
delete from public.categories where slug <> 'desk-reminders';
update public.categories set title='Desk Reminders', active=true, description='', seo_title=null, seo_description=null where slug='desk-reminders';
delete from public.collections where slug='gifts';

-- Keep the owner's other content while retiring redundant destinations.
update public.website_documents set
 draft=replace(replace(replace(draft::text,'/categories/desk-reminders','/shop?category=desk-reminders'),'/categories/quran-duas','/shop'),'/collections/gifts','/shop')::jsonb,
 published=replace(replace(replace(published::text,'/categories/desk-reminders','/shop?category=desk-reminders'),'/categories/quran-duas','/shop'),'/collections/gifts','/shop')::jsonb;
update public.website_documents set
 draft=jsonb_set(draft,'{links}',(select coalesce(jsonb_agg(link),'[]') from jsonb_array_elements(draft->'links') link where link->>'label' not in ('Desk Reminders','Quran & Duas','Gifts'))),
 published=jsonb_set(published,'{links}',(select coalesce(jsonb_agg(link),'[]') from jsonb_array_elements(published->'links') link where link->>'label' not in ('Desk Reminders','Quran & Duas','Gifts')))
where key='navigation';
update public.website_documents set
 draft=jsonb_set(draft,'{sections}',(select jsonb_agg(section) from jsonb_array_elements(draft->'sections') section where section->>'id' not in ('gifts','categories','collection'))),
 published=jsonb_set(published,'{sections}',(select jsonb_agg(section) from jsonb_array_elements(published->'sections') section where section->>'id' not in ('gifts','categories','collection')))
where key='homepage';
create policy staff_delete_category on public.categories for delete to authenticated using(public.has_permission('products.edit'));
