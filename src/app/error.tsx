'use client';
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="container section">
      <h1>Something interrupted this moment.</h1>
      <p>
        We couldn’t load this page. Please try again. If the problem continues, contact the shop.
      </p>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
