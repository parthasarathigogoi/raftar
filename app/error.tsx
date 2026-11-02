"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="trips-page">
      <section className="shell trips-empty" style={{ minHeight: "70vh", justifyContent: "center" }}>
        <h2>Something went wrong.</h2>
        <p>We hit an unexpected problem loading this page. Please try again.</p>
        <div className="chips" style={{ justifyContent: "center" }}>
          <button className="button button-forest" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="button button-sand" href="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
