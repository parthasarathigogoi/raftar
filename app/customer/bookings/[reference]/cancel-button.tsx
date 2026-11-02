"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Cancel a customer's own registration; seats are released immediately on the server. */
export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm("Cancel this registration? Seats are released immediately.")) return;
    setWorking(true);
    setError("");
    const response = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    if (response.ok) {
      router.refresh();
      setWorking(false);
      return;
    }
    const payload = await response.json().catch(() => null);
    setError(payload?.error?.message ?? "We could not cancel that booking.");
    setWorking(false);
  }

  return (
    <span>
      <button type="button" className="btn btn-ghost" onClick={cancel} disabled={working}>
        {working ? (
          <>
            <Loader2 className="spin" /> Cancelling…
          </>
        ) : (
          "Cancel booking"
        )}
      </button>
      {error && <p style={{ color: "#a83e2d", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </span>
  );
}
