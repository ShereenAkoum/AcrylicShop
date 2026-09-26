'use client';
import { useEffect } from 'react';
export function PreviewTheme({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
