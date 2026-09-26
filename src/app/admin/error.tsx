'use client';
export default function AdminError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="card">
      <h1>Unable to open this workspace view.</h1>
      <p>Check that your account has permission and that Supabase is configured correctly.</p>
      <p className="small muted">
        Reference: {'digest' in error ? String(error.digest) : 'Request failed'}
      </p>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
