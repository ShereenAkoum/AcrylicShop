-- DEVELOPMENT ONLY. Curated text is copied exactly from the business brief.
-- These draft designs and illustrative products are not approved production artwork.
insert into public.categories(title,slug) values('Desk Reminders','desk-reminders') on conflict(slug) do nothing;
insert into public.designs(id,title,arabic_phrase,type,source_notes) values
 ('60000000-0000-4000-8000-000000000001','Yaqeen','يقين','Quote','Development seed. Review and upload approved artwork before production.'),
 ('60000000-0000-4000-8000-000000000002','Dua for goodness','رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ','Dua','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000003','With hardship comes ease','إِنَّ مَعَ الْعُسْرِ يُسْرًا','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000004','Dua for ease','رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي','Dua','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000005','Hearts find rest','أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000006','Success through Allah','وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000007','Sufficient for us','حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ','Quran','Copied from owner brief; administrator review required.');
insert into public.products(id,sku,slug,title,arabic_title,description,price,category_id,design_id,status,featured,bestseller,new_arrival) values
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001','yaqeen-desk-reminder','The Yaqeen Reminder','يقين','A quiet reminder of certainty. Development sample with illustrative artwork; replace images before launch.',1800,(select id from public.categories where slug='desk-reminders'),'60000000-0000-4000-8000-000000000001','Active',true,true,true);
insert into public.inventory_items(sku,title,quantity,low_stock_threshold) values
 ('ACRYLIC-L-10X10','L shape acrylic — 10 × 10 cm',20,5),
 ('ACRYLIC-V-10X7','V shape acrylic — 10 × 7 cm',20,5)
on conflict(sku) do nothing;
insert into public.product_variants(product_id,sku,color,size,stand,inventory_item_id) values
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-SAGE','Sage','10 × 7 cm','Natural Wood',(select id from public.inventory_items where sku='ACRYLIC-V-10X7')),
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-BLUSH','Blush Pink','10 × 7 cm','Ivory Acrylic',(select id from public.inventory_items where sku='ACRYLIC-V-10X7')),
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-IVORY','Warm Ivory','10 × 7 cm','No Stand',(select id from public.inventory_items where sku='ACRYLIC-V-10X7'));
