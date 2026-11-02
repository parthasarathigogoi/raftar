"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function LoginForm() {
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
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
        <p className="eyebrow">Secure access</p>
        <h1>Your journeys, kept together.</h1>
        <p>Sign in to book trips, review your bookings and payments, and open your private RAFTAR media gallery.</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <label className="admin-field">
          <span>Email</span>
          <input className="admin-input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="admin-field">
          <span>Password</span>
          <input className="admin-input" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>

        {error && <div className="account-error">{error}</div>}

        <button className="button button-forest auth-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? <><Loader2 className="spin" /> Please wait…</> : <><Lock /> Sign in</>}
        </button>
        <p className="account-note">
          New to RAFTAR?{" "}
          <Link className="link-button" href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </section>
  );
}
