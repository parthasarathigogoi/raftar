"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="account-page">
      <nav className="shell trips-nav">
        <Link href="/" className="wordmark">RAF<span>TAR</span></Link>
        <div className="trips-nav-links">
          <Link href="/events">Upcoming travel</Link>
        </div>
      </nav>
      <Suspense fallback={<section className="shell account-gate"><Loader2 className="spin" /></section>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}

function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");
    const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "signin" ? { email: form.email, password: form.password } : { name: form.name, email: form.email, phone: form.phone || undefined, password: form.password };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Something went wrong. Please try again.");
      setStatus("idle");
      return;
    }
    window.location.href = params.get("next") || "/dashboard";
  }

  return (
    <section className="shell auth-shell">
      <div className="auth-intro">
        <p className="eyebrow">Secure access</p>
        <h1>Your journeys, kept together.</h1>
        <p>Sign in to register for trips, review your bookings and payments, and open your private RAFTAR media gallery.</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-switch">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>

        {mode === "signup" && (
          <label className="admin-field">
            <span>Full name</span>
            <input className="admin-input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
        )}
        <label className="admin-field">
          <span>Email</span>
          <input className="admin-input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        {mode === "signup" && (
          <label className="admin-field">
            <span>Phone (optional)</span>
            <input className="admin-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
        )}
        <label className="admin-field">
          <span>Password {mode === "signup" && "(min 12 characters)"}</span>
          <input className="admin-input" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>

        {error && <div className="account-error">{error}</div>}

        <button className="button button-forest auth-submit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? <><Loader2 className="spin" /> Please wait…</> : <><Lock /> {mode === "signin" ? "Sign in" : "Create account"}</>}
        </button>
        <p className="account-note">
          {mode === "signin" ? "New to RAFTAR? " : "Already have an account? "}
          <button type="button" className="link-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </form>
    </section>
  );
}
