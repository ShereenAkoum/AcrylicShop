import type { Metadata } from 'next';
import { siteUrl } from '@/lib/env';
import { document } from '@/lib/catalog';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'YAQEEN — A more meaningful life', template: '%s | YAQEEN' },
  description: 'Thoughtful Islamic acrylic reminders for a more peaceful and purposeful life.',
  openGraph: { siteName: 'YAQEEN', type: 'website' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await document('theme');
  return (
    <html lang="en" data-theme="light">
      <head>
        {theme && <style>{`:root{--primary:${theme.light_primary}}`}</style>}
      </head>
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
