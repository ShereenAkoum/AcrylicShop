create policy production_items_read on public.order_items for select to authenticated using(public.has_permission('production.view'));
create policy inventory_variants_read on public.product_variants for select to authenticated using(public.has_permission('inventory.view'));
create function public.dashboard_stats() returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb:='{}'; begin
 if public.has_permission('orders.view') then result:=result||jsonb_build_object('new_orders',(select count(*) from public.orders where status='Order Received'),'out_for_delivery',(select count(*) from public.orders where status='Out for Delivery')); end if;
 if public.has_permission('production.view') then result:=result||jsonb_build_object('to_print',(select count(*) from public.production_jobs where stage='Approved'),'ready_to_pack',(select count(*) from public.production_jobs where stage='QC')); end if;
 if public.has_permission('payments.view') then result:=result||jsonb_build_object('revenue',(select coalesce(sum(amount),0) from public.payments where status='Paid')); end if;
 if public.has_permission('inventory.view') then result:=result||jsonb_build_object('low_stock',(select count(*) from public.inventory_items where quantity<=low_stock_threshold)); end if;
 return result;
end $$;
create function public.sales_report(p_from timestamptz,p_to timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not public.has_permission('reports.view') then raise exception 'Forbidden'; end if;
 return jsonb_build_object('summary',(select jsonb_build_object('orders',count(*),'sales',coalesce(sum(total),0),'average_order',coalesce(round(avg(total)),0)) from public.orders where created_at>=p_from and created_at<p_to),
 'payments',(select coalesce(jsonb_agg(x),'[]') from (select status,sum(amount) amount,count(*) records from public.payments where created_at>=p_from and created_at<p_to group by status) x),
 'products',(select coalesce(jsonb_agg(x),'[]') from (select i.title,sum(i.quantity) quantity,sum(i.quantity*i.unit_price) sales from public.order_items i join public.orders o on o.id=i.order_id where o.created_at>=p_from and o.created_at<p_to group by i.product_id,i.title order by sum(i.quantity) desc limit 20) x),
 'designs',(select coalesce(jsonb_agg(x),'[]') from (select d.code,d.title,sum(i.quantity) quantity from public.order_items i join public.orders o on o.id=i.order_id join public.designs d on d.id=i.design_id where o.created_at>=p_from and o.created_at<p_to group by d.id order by sum(i.quantity) desc limit 20) x),
 'production',(select coalesce(jsonb_agg(x),'[]') from (select stage,count(*) jobs from public.production_jobs where created_at>=p_from and created_at<p_to group by stage) x),
 'delivery',(select coalesce(jsonb_agg(x),'[]') from (select status,count(*) deliveries from public.deliveries where created_at>=p_from and created_at<p_to group by status) x));
end $$;
revoke all on function public.dashboard_stats(),public.sales_report(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.dashboard_stats(),public.sales_report(timestamptz,timestamptz) to authenticated;
