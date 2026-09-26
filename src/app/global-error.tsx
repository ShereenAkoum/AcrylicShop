'use client';
import { themeScript, ThemeSwitch } from '@/components/theme';
import './globals.css';
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>YAQEEN — temporarily unavailable</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <main id="main" className="container section">
          <p className="eyebrow">YAQEEN / يقين</p>
          <h1>A moment, please.</h1>
          <p>We couldn’t connect to the shop. Please try again shortly.</p>
          <div className="row">
            <button className="button" onClick={retry}>
              Try again
            </button>
            <ThemeSwitch />
          </div>
        </main>
      </body>
    </html>
  );
}
