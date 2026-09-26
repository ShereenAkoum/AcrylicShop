import { Brand, Field } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { ThemeSwitch } from '@/components/theme';
import { configured } from '@/lib/env';
import { login } from './actions';
export const metadata = { title: 'Staff sign in', robots: { index: false } };
export default function Login() {
  return (
    <main id="main" className="container section" style={{ maxWidth: 520 }}>
      <div className="row between">
        <Brand />
        <ThemeSwitch />
      </div>
      <div className="card stack" style={{ marginTop: 40 }}>
        <p className="eyebrow">YAQEEN WORKSPACE</p>
        <h1 style={{ fontSize: 40 }}>Welcome back.</h1>
        <p className="muted">A little care behind every meaningful reminder.</p>
        {configured() ? (
          <ActionForm action={login} label="Sign in">
            <Field name="username" label="Username" required />
            <Field name="password" label="Password" type="password" required />
          </ActionForm>
        ) : (
          <p className="notice">
            Connect Supabase, apply the migrations, and bootstrap your first owner using the README
            to open your workspace.
          </p>
        )}
      </div>
    </main>
  );
}
