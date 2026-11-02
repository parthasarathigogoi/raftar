"use client";

import { useEffect, useState } from "react";
import { humanise } from "@/lib/format";

type ProjectRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  tripTitle: string | null;
  customerName: string | null;
  customerEmail: string | null;
  deliverables: Array<{ name?: string }>;
  assignedPhotographer: string | null;
  assignedVideographer: string | null;
  assignedEditor: string | null;
};

const tone: Record<string, string> = { not_started: "grey", assigned: "blue", capturing: "amber", uploaded: "amber", editing: "amber", review: "blue", delivered: "green" };

export default function MediaStudioPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/media");
      const payload = await response.json();
      if (response.ok) setProjects(payload.data.projects);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Media Studio</p>
          <h2>Capture, craft, deliver.</h2>
        </div>
        <span>Private media stays private by default.</span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading media projects…</div>
        ) : projects.length === 0 ? (
          <div className="admin-empty">No media projects yet. They are created automatically when a confirmed booking includes a photography or filmmaking add-on.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Trip</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Crew</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    {project.title}
                    {project.deliverables.length > 0 && <div className="muted">{project.deliverables.map((item) => item.name).filter(Boolean).join(", ")}</div>}
                  </td>
                  <td>{project.tripTitle ?? "—"}</td>
                  <td>
                    {project.customerName ?? "—"}
                    <div className="muted">{project.customerEmail ?? ""}</div>
                  </td>
                  <td>{humanise(project.type)}</td>
                  <td>
                    {project.assignedPhotographer ?? "—"}
                    <div className="muted">
                      {[project.assignedVideographer, project.assignedEditor].filter(Boolean).join(" · ") || "Unassigned"}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${tone[project.status] ?? "grey"}`}>{humanise(project.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
