import { createClient } from '@supabase/supabase-js';
const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SECRET_KEY: key,
  OWNER_USERNAME: raw,
  OWNER_PASSWORD: password,
  OWNER_NAME: full_name,
} = process.env;
const username = raw?.trim().toLowerCase();
if (
  !url ||
  !key ||
  !username ||
  !password ||
  !full_name ||
  !/^[a-z0-9_]{3,32}$/.test(username) ||
  password.length < 12
)
  throw new Error(
    'Set Supabase URL/secret and OWNER_USERNAME, OWNER_PASSWORD (12+ characters), OWNER_NAME in .env.local.',
  );
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: role, error: roleError } = await client
  .from('roles')
  .select('id')
  .eq('is_owner', true)
  .single();
if (roleError) throw new Error('Apply migrations before bootstrapping.');
const { count, error: countError } = await client
  .from('user_roles')
  .select('*', { count: 'exact', head: true })
  .eq('role_id', role.id);
if (countError || count)
  throw new Error('An owner already exists or its state cannot be verified. Bootstrap refused.');
const { data, error } = await client.auth.admin.createUser({
  email: `${username}@staff.yaqeen.invalid`,
  password,
  email_confirm: true,
});
if (error || !data.user)
  throw new Error('Auth account creation failed. Check that the username is unused.');
const { error: profileError } = await client
  .from('profiles')
  .insert({ id: data.user.id, username, full_name });
if (profileError) {
  await client.auth.admin.deleteUser(data.user.id);
  throw new Error('Profile creation failed; Auth account rolled back.');
}
const { error: assignError } = await client
  .from('user_roles')
  .insert({ user_id: data.user.id, role_id: role.id });
if (assignError)
  throw new Error('Role assignment failed. Use the trusted SQL recovery procedure in README.');
console.log('Owner created. Remove OWNER_PASSWORD from .env.local and sign in at /login.');
