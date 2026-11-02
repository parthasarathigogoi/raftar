"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  bookings: number;
  confirmedBookings: number;
  lifetimeValue: number;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const response = await fetch(`/api/admin/customers?${params.toString()}`);
    const payload = await response.json();
    if (response.ok) setCustomers(payload.data.customers);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>Everyone who has travelled with RAFTAR.</h2>
        </div>
      </div>

      <div className="admin-toolbar">
        <form onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <input className="admin-input" style={{ maxWidth: 280 }} placeholder="Search name, email or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="admin-btn" type="submit">
            <Search /> Search
          </button>
        </form>
      </div>

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="admin-empty">No customers found.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Bookings</th>
                <th>Lifetime value</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>
                    {customer.email}
                    <div className="muted">{customer.phone ?? "—"}</div>
                  </td>
                  <td>
                    {customer.bookings}
                    <div className="muted">{customer.confirmedBookings} confirmed</div>
                  </td>
                  <td>{formatCurrency(customer.lifetimeValue)}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
