import Link from "next/link";
import { Newspaper } from "lucide-react";

export default function AdminStoriesPage() {
  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Stories</p>
          <h2>Editorial, curated from real trips.</h2>
        </div>
        <span>Stories are composed from delivered galleries — never invented.</span>
      </div>

      <div className="admin-panels">
        <article>
          <p className="eyebrow">Nothing published yet</p>
          <h3>Your first story starts with a trip.</h3>
          <p>
            Once a trip is complete and its private gallery is delivered with marketing consent, it can be shaped into a public story here. Stories always use
            genuine RAFTAR photography and filmmaking output.
          </p>
        </article>
        <article>
          <p className="eyebrow">Consent first</p>
          <h3>Publication is opt-in.</h3>
          <p>Marketing consent is captured separately from photography consent on every booking, and only consented media can ever be published.</p>
        </article>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link className="admin-btn" href="/admin/trips">
          <Newspaper /> View trip events
        </Link>
      </div>
    </section>
  );
}
