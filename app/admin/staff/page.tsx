"use client";

import { useEffect, useState } from "react";
import { formatDate, humanise } from "@/lib/format";

type StaffRow = { id: string; name: string; email: string; phone: string | null; role: string; status: string; createdAt: string };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/staff");
      const payload = await response.json();
      if (response.ok) setStaff(payload.data.staff);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Staff</p>
          <h2>Admins, staff and partners.</h2>
        </div>
        <span>Accounts are managed through the RAFTAR account API.</span>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading team…</div>
        ) : staff.length === 0 ? (
          <div className="admin-empty">No team accounts found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone ?? "—"}</td>
                  <td>{humanise(member.role)}</td>
                  <td>
                    <span className={`badge ${member.status === "active" ? "green" : "grey"}`}>{humanise(member.status)}</span>
                  </td>
                  <td>{formatDate(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
