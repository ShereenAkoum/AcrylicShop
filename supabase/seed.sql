-- DEVELOPMENT ONLY. Curated text is copied exactly from the business brief.
-- These draft designs and illustrative products are not approved production artwork.
insert into public.categories(id,title,slug,description) values
 ('50000000-0000-4000-8000-000000000001','Quran & Duas','quran-duas','Meaningful words, thoughtfully kept.'),
 ('50000000-0000-4000-8000-000000000002','Desk Reminders','desk-reminders','A little purpose for your everyday space.');
insert into public.collections(id,title,slug,description) values('50000000-0000-4000-8000-000000000003','Meaningful Gifts','gifts','For the people close to your heart.');
insert into public.designs(id,title,arabic_phrase,type,source_notes) values
 ('60000000-0000-4000-8000-000000000001','Yaqeen','يقين','Quote','Development seed. Review and upload approved artwork before production.'),
 ('60000000-0000-4000-8000-000000000002','Dua for goodness','رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ','Dua','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000003','With hardship comes ease','إِنَّ مَعَ الْعُسْرِ يُسْرًا','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000004','Dua for ease','رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي','Dua','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000005','Hearts find rest','أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000006','Success through Allah','وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ','Quran','Copied from owner brief; administrator review required.'),
 ('60000000-0000-4000-8000-000000000007','Sufficient for us','حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ','Quran','Copied from owner brief; administrator review required.');
insert into public.products(id,sku,slug,title,arabic_title,description,price,category_id,design_id,status,featured,bestseller,new_arrival) values
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001','yaqeen-desk-reminder','The Yaqeen Reminder','يقين','A quiet reminder of certainty. Development sample with illustrative artwork; replace images before launch.',1800,'50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001','Active',true,true,true);
insert into public.product_variants(product_id,sku,color,size,stand,stock) values
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-SAGE','Sage','10 × 7 cm','Natural Wood',10),
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-BLUSH','Blush Pink','10 × 7 cm','Ivory Acrylic',8),
 ('70000000-0000-4000-8000-000000000001','YQ-RECT-001-IVORY','Warm Ivory','10 × 7 cm','No Stand',12);
insert into public.collection_products values('50000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000001');
insert into public.inventory_items(sku,title,quantity,low_stock_threshold) values('BLANK-107','10 × 7 acrylic blanks',50,10),('BLANK-55','5 × 5 round acrylic blanks',30,10),('STAND-IVORY','Ivory stands',30,10),('STAND-WOOD','Wood stands',25,10),('PACK-BOX','Packaging boxes',60,15);
