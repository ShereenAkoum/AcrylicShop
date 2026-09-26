import { AddPopup } from '@/components/add-popup';
import { owner } from '@/lib/auth';
import { Title, Field } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { createUser, assignStaff, saveRole, resetPassword } from '@/app/admin/actions';
export default async function Users() {
  const { client } = await owner();
  const [users, roles, permissions, assignments] = await Promise.all([
    client.from('profiles').select('*').order('full_name'),
    client.from('roles').select('*,role_permissions(permission_key)').order('name'),
    client.from('permissions').select('*').order('key'),
    client.from('user_roles').select('*'),
  ]);
  return (
    <>
      <Title title="Users & Roles" eyebrow="The people behind the purpose" />
      <div className="grid grid-2">
        <AddPopup title="Add staff account">
          <ActionForm
            action={createUser}
            label="Create user"
            confirm="Create this staff account with the selected access role?"
          >
            <Field name="full_name" label="Full name" required />
            <Field name="username" label="Username" required />
            <Field name="email" label="Contact email (optional)" type="email" />
            <Field name="phone" label="Phone" />
            <Field
              name="password"
              label="Password (at least 12 characters)"
              type="password"
              required
            />
            <Field name="confirm_password" label="Confirm password" type="password" required />
            <Field name="role_id" label="Role">
              <select name="role_id">
                {roles.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </AddPopup>
        <div className="stack">
          {users.data?.map((user) => (
            <details className="card" key={user.id}>
              <summary>
                {user.full_name} · {user.username} · {user.active ? 'Active' : 'Disabled'}
              </summary>
              <ActionForm
                action={assignStaff}
                confirm="Change this account’s role or active status?"
              >
                <input type="hidden" name="id" value={user.id} />
                <Field name="role_id" label="Role">
                  <select
                    name="role_id"
                    defaultValue={assignments.data?.find((a) => a.user_id === user.id)?.role_id}
                  >
                    {roles.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <label>
                  <input name="active" type="checkbox" defaultChecked={user.active} /> Active
                </label>
              </ActionForm>
              <hr style={{ marginBlock: 20 }} />
              <ActionForm
                action={resetPassword}
                label="Reset password"
                confirm="Replace this staff member’s password?"
              >
                <input type="hidden" name="id" value={user.id} />
                <Field
                  name="password"
                  label="New password (12+ characters)"
                  type="password"
                  required
                />
              </ActionForm>
            </details>
          ))}
        </div>
      </div>
      <section className="section stack">
        <h2>Roles & permissions</h2>
        {[...(roles.data || []), null].map((role) => (
          <AddPopup title="Add role" inline={Boolean(role)} key={role?.id || 'new'}>
            <details className="card" open={!role}>
              <summary>
                {role?.name || '+ Create role'} {role?.is_owner && '· Protected'}
              </summary>
              {role?.is_owner ? (
                <p>Owners have full access. This role cannot be edited.</p>
              ) : (
                <ActionForm
                  action={saveRole}
                  confirm="Save these permissions? Changes apply immediately to every member of this role."
                >
                  <input type="hidden" name="id" value={role?.id || ''} />
                  <Field name="name" label="Role name" value={role?.name || ''} required />
                  <div className="grid grid-3">
                    {permissions.data?.map((p) => (
                      <label key={p.key} className="small">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={p.key}
                          defaultChecked={role?.role_permissions.some(
                            (rp: { permission_key: string }) => rp.permission_key === p.key,
                          )}
                        />{' '}
                        {p.description}
                      </label>
                    ))}
                  </div>
                </ActionForm>
              )}
            </details>
          </AddPopup>
        ))}
      </section>
    </>
  );
}
