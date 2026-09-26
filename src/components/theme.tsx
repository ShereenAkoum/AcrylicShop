'use client';
import { useSyncExternalStore } from 'react';
const subscribe = (fn: () => void) => {
  window.addEventListener('themechange', fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener('themechange', fn);
    window.removeEventListener('storage', fn);
  };
};
export function ThemeSwitch() {
  const value = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem('yaqeen-theme') || 'system',
    () => 'system',
  );
  return (
    <select
      className="theme-select"
      aria-label="Color theme"
      value={value}
      onChange={(e) => {
        localStorage.setItem('yaqeen-theme', e.target.value);
        window.dispatchEvent(new Event('themechange'));
      }}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
export const themeScript = `(()=>{function apply(){let t='system';try{t=localStorage.getItem('yaqeen-theme')||'system'}catch{};document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}apply();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);window.addEventListener('themechange',apply);window.addEventListener('storage',apply)})()`;
