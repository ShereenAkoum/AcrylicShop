import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container section">
      <p className="eyebrow">404</p>
      <h1>This page has moved on.</h1>
      <Link className="button" href="/">
        Back to Yaqeen
      </Link>
    </main>
  );
}
