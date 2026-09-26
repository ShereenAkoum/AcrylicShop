import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const viewer = '10000000-0000-4000-8000-000000000002';
const editor = '10000000-0000-4000-8000-000000000003';
const product = '20000000-0000-4000-8000-000000000001';
const variant = '30000000-0000-4000-8000-000000000001';
const request = '40000000-0000-4000-8000-000000000001';
const token = 'a'.repeat(64);
const customer = {
  full_name: 'Test Customer',
  phone: '12345678',
  email: '',
  address: '123 Road',
  city: 'Beirut',
  notes: '',
  instructions: '',
};
async function role(name: string, user = '') {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role ${name};`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create role supabase_admin; create schema auth; create schema storage; create schema extensions; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security; grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role; grant all on all tables in schema storage to anon,authenticated,service_role; alter default privileges in schema public grant all on tables to anon,authenticated,service_role; alter default privileges in schema public grant all on sequences to anon,authenticated,service_role; create function extensions.digest(value text,algorithm text) returns bytea language sql immutable as $$ select sha256(convert_to(value,'UTF8')) $$;`,
  );
  // PGlite lacks pgcrypto; SHA-256 uses PostgreSQL's built-in implementation above.
  for (const file of readdirSync('supabase/migrations').sort()) {
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
      'create extension if not exists pgcrypto with schema extensions;',
      '',
    );
    await db.exec(sql);
  }
  await db.exec(
    `insert into auth.users values('${owner}'),('${viewer}'),('${editor}'); insert into public.profiles(id,username,full_name) values('${owner}','owner','Owner'),('${viewer}','viewer','Viewer'),('${editor}','editor','Editor'); insert into public.user_roles select '${owner}',id from public.roles where is_owner; insert into public.user_roles select '${viewer}',id from public.roles where name='Viewer'; insert into public.user_roles select '${editor}',id from public.roles where name='Content Editor'; insert into public.products(id,sku,slug,title,price,status) values('${product}','TEST','test','Test product',1800,'Active'); insert into public.product_variants(id,product_id,sku,color,size,stand,stock) values('${variant}','${product}','TEST-SAGE','Sage','10 × 7 cm','Wood',3);`,
  );
}, 60000);
afterAll(async () => {
  await db.close();
});
describe('migrations, RLS, and transactional workflows', () => {
  it('hides private records and draft content from anonymous users', async () => {
    await role('anon');
    expect((await db.query('select * from public.orders')).rows).toHaveLength(0);
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(0);
    expect((await db.query('select * from public.products')).rows).toHaveLength(1);
    expect((await db.query('select * from public.design_assets')).rows).toHaveLength(0);
    await expect(
      db.query(`select public.checkout($1,$2,$3,$4)`, [
        request,
        customer,
        [{ variant_id: variant, quantity: 1 }],
        token,
      ]),
    ).rejects.toThrow();
  });
  it('enforces viewer authorization even for direct SQL writes', async () => {
    await role('authenticated', viewer);
    expect(
      (await db.query<{ has_permission: boolean }>(`select public.has_permission('products.edit')`))
        .rows[0].has_permission,
    ).toBe(false);
    await expect(
      db.query(`insert into public.products(sku,slug,title,price) values('EVIL','evil','No',1)`),
    ).rejects.toThrow();
    await expect(
      db.query(`select public.adjust_inventory($1,1,'test',true)`, [variant]),
    ).rejects.toThrow();
    await expect(
      db.query(`select public.save_role(null,'Escalated',array['users.edit'])`),
    ).rejects.toThrow();
  });
  it('creates order, payment, delivery, job and reserves stock with authoritative prices', async () => {
    await role('service_role');
    const { rows } = await db.query<{ checkout: { number: string; total: number } }>(
      'select public.checkout($1,$2,$3,$4)',
      [request, customer, [{ variant_id: variant, quantity: 2, price: 1 }], token],
    );
    expect(rows[0].checkout.total).toBe(3900);
    expect(
      (
        await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
          variant,
        ])
      ).rows[0].stock,
    ).toBe(1);
    for (const table of ['orders', 'order_items', 'production_jobs', 'payments', 'deliveries'])
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(1);
  });
  it('makes retry idempotent and rejects changed requests', async () => {
    await role('service_role');
    await db.query('select public.checkout($1,$2,$3,$4)', [
      request,
      customer,
      [{ variant_id: variant, quantity: 2, price: 1 }],
      token,
    ]);
    expect((await db.query('select * from public.orders')).rows).toHaveLength(1);
    await expect(
      db.query('select public.checkout($1,$2,$3,$4)', [
        request,
        customer,
        [{ variant_id: variant, quantity: 1 }],
        token,
      ]),
    ).rejects.toThrow();
  });
  it('rolls back an out-of-stock checkout', async () => {
    await role('service_role');
    await expect(
      db.query('select public.checkout($1,$2,$3,$4)', [
        crypto.randomUUID(),
        customer,
        [{ variant_id: variant, quantity: 2 }],
        token,
      ]),
    ).rejects.toThrow();
    expect(
      (
        await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
          variant,
        ])
      ).rows[0].stock,
    ).toBe(1);
  });
  it('tracking returns status only and requires a secret', async () => {
    await role('service_role');
    const number = (await db.query<{ number: string }>('select number from public.orders')).rows[0]
      .number;
    const wrong = await db.query<{ track_order: unknown }>('select public.track_order($1,$2)', [
      number,
      'wrong',
    ]);
    expect(wrong.rows[0].track_order).toBeNull();
    const correct = await db.query<{ track_order: Record<string, unknown> }>(
      'select public.track_order($1,$2)',
      [number, token],
    );
    expect(correct.rows[0].track_order.status).toBe('Order Received');
    expect(correct.rows[0].track_order).not.toHaveProperty('phone');
    expect(correct.rows[0].track_order).not.toHaveProperty('address');
  });
  it('publishes snapshots while protecting draft and publish permissions', async () => {
    await role('authenticated', editor);
    const result = await db.query<{ id: string }>(
      `insert into public.website_documents(key,title,draft) values('test','Test','{"heading":"Draft"}') returning id`,
    );
    const id = result.rows[0].id;
    await expect(db.query('select public.publish_document($1)', [id])).rejects.toThrow();
    await expect(
      db.query(`update public.website_documents set published='{}' where id=$1`, [id]),
    ).rejects.toThrow();
    await role('authenticated', owner);
    await db.query('select public.publish_document($1)', [id]);
    await role('authenticated', editor);
    await db.query(
      `update public.website_documents set draft='{"heading":"Unpublished change"}' where id=$1`,
      [id],
    );
    await role('anon');
    expect(
      (
        await db.query<{ published_document: { heading: string } }>(
          `select public.published_document('test')`,
        )
      ).rows[0].published_document.heading,
    ).toBe('Draft');
    expect((await db.query('select * from public.website_documents')).rows).toHaveLength(0);
  });
  it('records transitions, prevents skipping and honors disabled staff immediately', async () => {
    await role('authenticated', owner);
    const job = (await db.query<{ id: string }>('select id from public.production_jobs')).rows[0]
      .id;
    await expect(
      db.query('select public.move_production($1,$2)', [job, 'Completed']),
    ).rejects.toThrow();
    await db.query('select public.move_production($1,$2)', [job, 'Design']);
    expect(
      (await db.query<{ status: string }>('select status from public.orders')).rows[0].status,
    ).toBe('Preparing');
    expect((await db.query('select * from public.production_status_history')).rows).toHaveLength(1);
    await role('service_role');
    await db.query(`update public.profiles set active=false where id=$1`, [editor]);
    await role('authenticated', editor);
    expect(
      (await db.query<{ has_permission: boolean }>(`select public.has_permission('products.edit')`))
        .rows[0].has_permission,
    ).toBe(false);
  });
  it('keeps production assets private and logs authorized downloads', async () => {
    await role('service_role');
    const design = (
      await db.query<{ id: string }>(
        `insert into public.designs(title) values('Private artwork') returning id`,
      )
    ).rows[0].id;
    const asset = (
      await db.query<{ id: string }>(
        `insert into public.design_assets(design_id,path,title) values($1,'private.pdf','Master') returning id`,
        [design],
      )
    ).rows[0].id;
    await db.query(
      `insert into storage.objects(bucket_id,name) values('production-files','private.pdf')`,
    );
    await role('authenticated', viewer);
    expect(
      (await db.query(`select * from storage.objects where bucket_id='production-files'`)).rows,
    ).toHaveLength(0);
    await expect(db.query('select public.authorize_download($1)', [asset])).rejects.toThrow();
    await role('authenticated', owner);
    await db.query('select public.authorize_download($1)', [asset]);
    expect(
      (await db.query(`select * from public.audit_logs where action='production_file.downloaded'`))
        .rows,
    ).toHaveLength(1);
  });
  it('prevents negative inventory and owner demotion', async () => {
    await role('authenticated', owner);
    await expect(
      db.query(`select public.adjust_inventory($1,-100,'invalid stock',true)`, [variant]),
    ).rejects.toThrow();
    await db.query(`select public.adjust_inventory($1,5,'received shipment',true)`, [variant]);
    expect(
      (
        await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
          variant,
        ])
      ).rows[0].stock,
    ).toBe(6);
    const roleId = (
      await db.query<{ id: string }>(`select id from public.roles where name='Viewer'`)
    ).rows[0].id;
    await expect(
      db.query('select public.assign_staff($1,$2,false)', [owner, roleId]),
    ).rejects.toThrow();
  });
  it('finalizes product uploads atomically without a media library', async () => {
    await role('authenticated', owner);
    const intent = (
      await db.query<{ id: string }>(
        `insert into public.upload_requests(actor,bucket,path,title,entity_id) values($1,'product-images','test-upload.png','Test image',$2) returning id`,
        [owner, product],
      )
    ).rows[0].id;
    await expect(db.query('select public.complete_upload($1)', [intent])).rejects.toThrow();
    await db.query(
      `insert into storage.objects(bucket_id,name) values('product-images','test-upload.png')`,
    );
    await db.query('select public.complete_upload($1)', [intent]);
    await db.query('select public.complete_upload($1)', [intent]);
    expect(
      (
        await db.query(
          `select * from public.product_images where url='/storage/v1/object/public/product-images/test-upload.png'`,
        )
      ).rows,
    ).toHaveLength(1);
    await role('authenticated', viewer);
    await expect(db.query('select public.complete_upload($1)', [intent])).rejects.toThrow();
  });
  it('creates actual variants without permitting arbitrary stock updates', async () => {
    await role('authenticated', owner);
    const saved = await db.query<{ save_variant: string }>(`select public.save_variant(null,$1)`, [
      {
        product_id: product,
        sku: 'TEST-BLUSH',
        color: 'Blush',
        size: '5 cm',
        stand: 'No Stand',
        price_override: 1500,
        image_url: '',
        active: true,
      },
    ]);
    const id = saved.rows[0].save_variant;
    await db.query('update public.product_variants set stock=999 where id=$1', [id]);
    expect(
      (
        await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
          id,
        ])
      ).rows[0].stock,
    ).toBe(0);
    await db.query(`select public.adjust_inventory($1,3,'Initial stock',true)`, [id]);
    expect(
      (
        await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
          id,
        ])
      ).rows[0].stock,
    ).toBe(3);
  });
  it('unpublishes without deleting drafts and denies anonymous report access', async () => {
    await role('authenticated', owner);
    const id = (
      await db.query<{ id: string }>(`select id from public.website_documents where key='test'`)
    ).rows[0].id;
    await db.query('select public.unpublish_document($1)', [id]);
    expect(
      (
        await db.query<{ draft: { heading: string } }>(
          'select draft from public.website_documents where id=$1',
          [id],
        )
      ).rows[0].draft.heading,
    ).toBe('Unpublished change');
    await role('anon');
    expect(
      (await db.query<{ published_document: unknown }>(`select public.published_document('test')`))
        .rows[0].published_document,
    ).toBeNull();
    await expect(db.query('select public.production_board()')).rejects.toThrow();
    await expect(
      db.query(`select public.sales_report(now()-interval '30 days',now())`),
    ).rejects.toThrow();
  });
  it('loads development seed with draft Arabic designs and no staff credentials', async () => {
    await role('service_role');
    await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
    expect(
      (
        await db.query<{ arabic_phrase: string }>(
          `select arabic_phrase from public.designs where title='Dua for ease'`,
        )
      ).rows[0].arabic_phrase,
    ).toBe('رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي');
    expect(
      (await db.query(`select * from public.designs where status='Approved'`)).rows,
    ).toHaveLength(0);
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(3);
  });
});

it('hides inactive categories and keeps uncategorized active products visible', async () => {
  await role('service_role');
  const cat = '91000000-0000-4000-8000-000000000001';
  await db.exec(
    `insert into public.categories(id,title,slug,active) values ('${cat}','Hidden','hidden-test',false); insert into public.products(sku,slug,title,price,status,category_id) values ('VIS-HIDDEN','vis-hidden','Hidden',100,'Active','${cat}'),('VIS-NONE','vis-none','None',100,'Active',null),('VIS-DRAFT','vis-draft','Draft',100,'Draft',null);`,
  );
  await role('anon');
  const result = await db.query<{ sku: string }>(
    "select sku from public.products where sku like 'VIS-%'",
  );
  expect(result.rows.map((r) => r.sku)).toEqual(['VIS-NONE']);
  await role('service_role');
  await db.exec(`update public.categories set active=true where id='${cat}';`);
  await role('anon');
  expect(
    (await db.query("select sku from public.products where sku='VIS-HIDDEN'")).rows,
  ).toHaveLength(1);
});
