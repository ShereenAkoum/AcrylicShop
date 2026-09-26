create policy staff_delete_product on public.products for delete to authenticated
using(public.has_permission('products.edit'));
