export function assetUrl(path: string) {
  return path.startsWith('/storage/v1/object/public/')
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`
    : path;
}
