alter policy public_products on public.products using (
 status='Active' and (category_id is null or exists(select 1 from public.categories c where c.id=category_id and c.active))
);
