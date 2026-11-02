"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";

export default function RegisterForm() {
  const params = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Something went wrong. Please try again.");
      setStatus("idle");
      return;
    }
    window.location.href = params.get("next") || "/customer/dashboard";
  }

  return (
    <section className="shell auth-shell">
      <div className="auth-intro">
        <p className="eyebrow">Create your account</p>
        <h1>Start your RAFTAR journey.</h1>
        <p>Create an account to book trips, register your fellow travellers, and collect your photography and films in a private gallery.</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <label className="admin-field">
          <span>Full name</span>
          <input className="admin-input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Email</span>
          <input className="admin-input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Phone (optional)</span>
          <input className="admin-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Password (min 12 characters)</span>
          <input className="admin-input" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>

        {error && <div className="account-error">{error}</div>}

        <button className="button button-forest auth-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? <><Loader2 className="spin" /> Please wait…</> : <><UserRound /> Create account</>}
        </button>
        <p className="account-note">
          Already have an account?{" "}
          <Link className="link-button" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
}
