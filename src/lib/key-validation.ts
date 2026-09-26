// Format checks catch configuration mistakes; Supabase still authenticates the credential.
export function legacyKeyRole(value: string): string | null {
  try {
    const payload = value.split('.')[1];
    if (!payload) return null;
    const decoded: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded === 'object' &&
      decoded !== null &&
      'role' in decoded &&
      typeof decoded.role === 'string'
      ? decoded.role
      : null;
  } catch {
    return null;
  }
}
export function isPrivilegedKey(value: string): boolean {
  return value.startsWith('sb_secret_') || legacyKeyRole(value) === 'service_role';
}
