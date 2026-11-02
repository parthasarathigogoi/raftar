"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/format";

type AuditLogRow = {
  id: string;
  action: string;
  module: string;
  recordId: string | null;
  description: string | null;
  metadata: unknown;
  timestamp: string;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
};

type Filters = { search: string; module: string; from: string; to: string };

const EMPTY_FILTERS: Filters = { search: "", module: "", from: "", to: "" };

/** Compact, bounded JSON preview of a log's metadata. */
function metadataText(metadata: unknown) {
  if (metadata == null) return "";
  try {
    const text = JSON.stringify(metadata);
    if (!text || text === "{}") return "";
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  } catch {
    return "";
  }
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [form, setForm] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) params.set("search", filters.search);
    if (filters.module) params.set("module", filters.module);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error?.message ?? "Could not load audit logs.");
      setLogs([]);
      setTotal(0);
    } else {
      setLogs(payload.data.logs);
      setTotal(payload.data.total);
      setPage(payload.data.page);
      setLimit(payload.data.limit);
      setModules(payload.data.modules);
    }
    setLoading(false);
  }, [page, limit, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function applyFilters() {
    setPage(1);
    setFilters(form);
  }

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Governance</p>
          <h2>Audit Logs</h2>
        </div>
        <span>{total} {total === 1 ? "entry" : "entries"}</span>
      </div>

      <p className="admin-note">Audit history is append-only and cannot be edited or deleted.</p>

      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-toolbar">
        <form onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
          <input
            className="admin-input"
            style={{ maxWidth: 260 }}
            placeholder="Search description, action or record"
            value={form.search}
            onChange={(event) => setForm({ ...form, search: event.target.value })}
          />
          <select
            className="admin-select"
            style={{ maxWidth: 190 }}
            value={form.module}
            onChange={(event) => setForm({ ...form, module: event.target.value })}
          >
            <option value="">All modules</option>
            {modules.map((moduleName) => (
              <option key={moduleName} value={moduleName}>
                {moduleName}
              </option>
            ))}
          </select>
          <input
            className="admin-input"
            type="date"
            style={{ width: 150 }}
            value={form.from}
            onChange={(event) => setForm({ ...form, from: event.target.value })}
          />
          <input
            className="admin-input"
            type="date"
            style={{ width: 150 }}
            value={form.to}
            onChange={(event) => setForm({ ...form, to: event.target.value })}
          />
          <button className="admin-btn" type="submit">
            <Filter /> Filter
          </button>
        </form>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div className="admin-empty">No audit logs found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Module</th>
                <th>Action</th>
                <th>Record</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const meta = metadataText(log.metadata);
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>
                      {log.userName ?? "System"}
                      {log.userEmail && <div className="muted">{log.userEmail}</div>}
                    </td>
                    <td>
                      <span className="badge grey">{log.module}</span>
                    </td>
                    <td>
                      <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{log.action}</code>
                    </td>
                    <td className="muted">{log.recordId ?? "—"}</td>
                    <td>
                      {log.description ?? "—"}
                      {meta && <div className="fade" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-word" }}>{meta}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-toolbar" style={{ marginTop: 16 }}>
        <button className="admin-btn small" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
          <ChevronLeft /> Previous
        </button>
        <span className="muted">Page {page} of {totalPages}</span>
        <button className="admin-btn small" type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading}>
          Next <ChevronRight />
        </button>
      </div>
    </section>
  );
}
