"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

type Addon = { code: string; name: string; description: string; price: number; perPerson: boolean; active: boolean };
type ItineraryDay = { title: string; description: string; locations: string; activities: string };

const emptyDay: ItineraryDay = { title: "", description: "", locations: "", activities: "" };
const emptyAddon: Addon = { code: "", name: "", description: "", price: 0, perPerson: false, active: true };

const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const joinLines = (items: string[] | undefined) => (items ?? []).join("\n");

const dateInput = (value: string | null | undefined) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export default function TripEventForm({ tripId }: { tripId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(Boolean(tripId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    fullDescription: "",
    destination: "",
    coverImage: "",
    startDate: "",
    endDate: "",
    registrationStartDate: "",
    registrationEndDate: "",
    departureLocation: "",
    returnLocation: "",
    accommodationDetails: "",
    transportDetails: "",
    foodDetails: "",
    importantInformation: "",
    permitInformation: "",
    cancellationPolicy: "",
    bookingTerms: "",
    pricePerPerson: 0,
    totalSeats: 20,
    minimumParticipants: 1,
    status: "draft",
    featured: false,
    childEnabled: false,
    childPrice: 0,
    childMaxAge: 12,
  });
  const [locationsText, setLocationsText] = useState("");
  const [galleryText, setGalleryText] = useState("");
  const [inclusionsText, setInclusionsText] = useState("");
  const [exclusionsText, setExclusionsText] = useState("");
  const [packingText, setPackingText] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [photographyOptions, setPhotographyOptions] = useState<Addon[]>([]);
  const [filmmakingOptions, setFilmmakingOptions] = useState<Addon[]>([]);

  const set = (key: keyof typeof form, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!tripId) return;
    (async () => {
      const response = await fetch(`/api/admin/trips/${tripId}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Could not load this trip.");
        setLoading(false);
        return;
      }
      const trip = payload.data.trip;
      setForm({
        title: trip.title ?? "",
        slug: trip.slug ?? "",
        shortDescription: trip.shortDescription ?? "",
        fullDescription: trip.fullDescription ?? "",
        destination: trip.destination ?? "",
        coverImage: trip.coverImage ?? "",
        startDate: dateInput(trip.startDate),
        endDate: dateInput(trip.endDate),
        registrationStartDate: dateInput(trip.registrationStartDate),
        registrationEndDate: dateInput(trip.registrationEndDate),
        departureLocation: trip.departureLocation ?? "",
        returnLocation: trip.returnLocation ?? "",
        accommodationDetails: trip.accommodationDetails ?? "",
        transportDetails: trip.transportDetails ?? "",
        foodDetails: trip.foodDetails ?? "",
        importantInformation: trip.importantInformation ?? "",
        permitInformation: trip.permitInformation ?? "",
        cancellationPolicy: trip.cancellationPolicy ?? "",
        bookingTerms: trip.bookingTerms ?? "",
        pricePerPerson: trip.pricePerPerson ?? 0,
        totalSeats: trip.totalSeats ?? 20,
        minimumParticipants: trip.minimumParticipants ?? 1,
        status: trip.status ?? "draft",
        featured: Boolean(trip.featured),
        childEnabled: Boolean(trip.childPricing?.enabled),
        childPrice: trip.childPricing?.price ?? 0,
        childMaxAge: trip.childPricing?.maxAge ?? 12,
      });
      setLocationsText(joinLines(trip.locations));
      setGalleryText(joinLines(trip.gallery));
      setInclusionsText(joinLines(trip.inclusions));
      setExclusionsText(joinLines(trip.exclusions));
      setPackingText(joinLines(trip.packingList));
      setItinerary(
        (trip.itinerary ?? []).map((day: Record<string, unknown>) => ({
          title: String(day.title ?? ""),
          description: String(day.description ?? ""),
          locations: joinLines(day.locations as string[]),
          activities: joinLines(day.activities as string[]),
        }))
      );
      setPhotographyOptions(
        (trip.photographyOptions ?? []).map((addon: Record<string, unknown>) => ({
          code: String(addon.code ?? ""),
          name: String(addon.name ?? ""),
          description: String(addon.description ?? ""),
          price: Number(addon.price ?? 0),
          perPerson: Boolean(addon.perPerson),
          active: addon.active !== false,
        }))
      );
      setFilmmakingOptions(
        (trip.filmmakingOptions ?? []).map((addon: Record<string, unknown>) => ({
          code: String(addon.code ?? ""),
          name: String(addon.name ?? ""),
          description: String(addon.description ?? ""),
          price: Number(addon.price ?? 0),
          perPerson: Boolean(addon.perPerson),
          active: addon.active !== false,
        }))
      );
      setLoading(false);
    })();
  }, [tripId]);

  function buildPayload() {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim(),
      fullDescription: form.fullDescription.trim(),
      destination: form.destination.trim(),
      locations: splitLines(locationsText),
      coverImage: form.coverImage.trim(),
      gallery: splitLines(galleryText),
      startDate: form.startDate,
      endDate: form.endDate,
      registrationStartDate: form.registrationStartDate || undefined,
      registrationEndDate: form.registrationEndDate || undefined,
      departureLocation: form.departureLocation.trim(),
      returnLocation: form.returnLocation.trim(),
      itinerary: itinerary
        .filter((day) => day.title.trim())
        .map((day, index) => ({
          day: index + 1,
          title: day.title.trim(),
          description: day.description.trim(),
          locations: splitLines(day.locations),
          activities: splitLines(day.activities),
        })),
      accommodationDetails: form.accommodationDetails.trim(),
      transportDetails: form.transportDetails.trim(),
      foodDetails: form.foodDetails.trim(),
      inclusions: splitLines(inclusionsText),
      exclusions: splitLines(exclusionsText),
      importantInformation: form.importantInformation.trim(),
      packingList: splitLines(packingText),
      permitInformation: form.permitInformation.trim(),
      cancellationPolicy: form.cancellationPolicy.trim(),
      pricePerPerson: Number(form.pricePerPerson),
      childPricing: { enabled: form.childEnabled, price: Number(form.childPrice), maxAge: Number(form.childMaxAge) },
      totalSeats: Number(form.totalSeats),
      minimumParticipants: Number(form.minimumParticipants),
      photographyOptions: photographyOptions.filter((addon) => addon.name.trim() && addon.code.trim()),
      filmmakingOptions: filmmakingOptions.filter((addon) => addon.name.trim() && addon.code.trim()),
      bookingTerms: form.bookingTerms.trim(),
      status: form.status,
      featured: form.featured,
    };
    if (form.slug.trim()) payload.slug = form.slug.trim();
    return payload;
  }

  async function submit() {
    setSaving(true);
    setMessage("");
    setError("");
    const response = await fetch(tripId ? `/api/admin/trips/${tripId}` : "/api/admin/trips", {
      method: tripId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Could not save the trip.");
      return;
    }
    setMessage("Trip saved.");
    if (!tripId && payload.data?.trip?.id) router.push(`/admin/trips/${payload.data.trip.id}`);
    else router.refresh();
  }

  if (loading) return <section className="admin-content"><div className="admin-empty">Loading trip…</div></section>;

  return (
    <section className="admin-content">
      <div className="admin-intro">
        <div>
          <p className="eyebrow">Trip Events</p>
          <h2>{tripId ? "Edit trip event" : "New trip event"}</h2>
        </div>
        <button className="admin-btn primary" onClick={submit} disabled={saving} type="button">
          <Save /> {saving ? "Saving…" : "Save trip"}
        </button>
      </div>

      {message && <div className="admin-note">{message}</div>}
      {error && <div className="admin-note error">{error}</div>}

      <div className="admin-card">
        <h3>Essentials</h3>
        <p className="hint">The title and destination customers see first.</p>
        <div className="admin-form-grid">
          <label className="admin-field full">
            <span>Title</span>
            <input className="admin-input" value={form.title} onChange={(event) => set("title", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Slug (optional)</span>
            <input className="admin-input" value={form.slug} onChange={(event) => set("slug", event.target.value)} placeholder="auto-generated" />
          </label>
          <label className="admin-field">
            <span>Destination</span>
            <input className="admin-input" value={form.destination} onChange={(event) => set("destination", event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Short description</span>
            <input className="admin-input" value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Full description</span>
            <textarea className="admin-textarea" value={form.fullDescription} onChange={(event) => set("fullDescription", event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Cover image URL</span>
            <input className="admin-input" value={form.coverImage} onChange={(event) => set("coverImage", event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Gallery image URLs (one per line)</span>
            <textarea className="admin-textarea" value={galleryText} onChange={(event) => setGalleryText(event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Locations (one per line)</span>
            <textarea className="admin-textarea" value={locationsText} onChange={(event) => setLocationsText(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-card">
        <h3>Dates & route</h3>
        <p className="hint">Trip dates and the registration window customers can book within.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Start date</span>
            <input className="admin-input" type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>End date</span>
            <input className="admin-input" type="date" value={form.endDate} onChange={(event) => set("endDate", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Registration opens</span>
            <input className="admin-input" type="date" value={form.registrationStartDate} onChange={(event) => set("registrationStartDate", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Registration closes</span>
            <input className="admin-input" type="date" value={form.registrationEndDate} onChange={(event) => set("registrationEndDate", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Departure location</span>
            <input className="admin-input" value={form.departureLocation} onChange={(event) => set("departureLocation", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Return location</span>
            <input className="admin-input" value={form.returnLocation} onChange={(event) => set("returnLocation", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-card">
        <h3>Itinerary</h3>
        <p className="hint">Day-by-day plan. Days are numbered automatically.</p>
        {itinerary.map((day, index) => (
          <div className="admin-form-grid" key={index} style={{ borderTop: index ? "1px solid #eef0ec" : "none", paddingTop: index ? 16 : 0, marginBottom: 16 }}>
            <label className="admin-field full">
              <span>Day {index + 1} title</span>
              <input className="admin-input" value={day.title} onChange={(event) => setItinerary((rows) => rows.map((row, i) => (i === index ? { ...row, title: event.target.value } : row)))} />
            </label>
            <label className="admin-field full">
              <span>Description</span>
              <textarea className="admin-textarea" value={day.description} onChange={(event) => setItinerary((rows) => rows.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))} />
            </label>
            <label className="admin-field">
              <span>Locations (one per line)</span>
              <textarea className="admin-textarea" value={day.locations} onChange={(event) => setItinerary((rows) => rows.map((row, i) => (i === index ? { ...row, locations: event.target.value } : row)))} />
            </label>
            <label className="admin-field">
              <span>Activities (one per line)</span>
              <textarea className="admin-textarea" value={day.activities} onChange={(event) => setItinerary((rows) => rows.map((row, i) => (i === index ? { ...row, activities: event.target.value } : row)))} />
            </label>
            <div className="full">
              <button className="admin-btn danger small" type="button" onClick={() => setItinerary((rows) => rows.filter((_, i) => i !== index))}>
                <Trash2 /> Remove day
              </button>
            </div>
          </div>
        ))}
        <button className="admin-btn" type="button" onClick={() => setItinerary((rows) => [...rows, { ...emptyDay }])}>
          <Plus /> Add itinerary day
        </button>
      </div>

      <div className="admin-card">
        <h3>What's included</h3>
        <p className="hint">One item per line. These appear as checklists to customers.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Accommodation</span>
            <textarea className="admin-textarea" value={form.accommodationDetails} onChange={(event) => set("accommodationDetails", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Transport</span>
            <textarea className="admin-textarea" value={form.transportDetails} onChange={(event) => set("transportDetails", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Food</span>
            <textarea className="admin-textarea" value={form.foodDetails} onChange={(event) => set("foodDetails", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Permits</span>
            <textarea className="admin-textarea" value={form.permitInformation} onChange={(event) => set("permitInformation", event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Inclusions (one per line)</span>
            <textarea className="admin-textarea" value={inclusionsText} onChange={(event) => setInclusionsText(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Exclusions (one per line)</span>
            <textarea className="admin-textarea" value={exclusionsText} onChange={(event) => setExclusionsText(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Packing list (one per line)</span>
            <textarea className="admin-textarea" value={packingText} onChange={(event) => setPackingText(event.target.value)} />
          </label>
          <label className="admin-field">
            <span>Important information</span>
            <textarea className="admin-textarea" value={form.importantInformation} onChange={(event) => set("importantInformation", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="admin-card">
        <h3>Pricing, seats & terms</h3>
        <p className="hint">Admin controls pricing and availability. Seats are enforced atomically at booking time.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Price per person (₹)</span>
            <input className="admin-input" type="number" min={0} value={form.pricePerPerson} onChange={(event) => set("pricePerPerson", Number(event.target.value))} />
          </label>
          <label className="admin-field">
            <span>Total seats</span>
            <input className="admin-input" type="number" min={1} value={form.totalSeats} onChange={(event) => set("totalSeats", Number(event.target.value))} />
          </label>
          <label className="admin-field">
            <span>Minimum participants</span>
            <input className="admin-input" type="number" min={1} value={form.minimumParticipants} onChange={(event) => set("minimumParticipants", Number(event.target.value))} />
          </label>
          <div className="admin-field">
            <span>Child pricing</span>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={form.childEnabled} onChange={(event) => set("childEnabled", event.target.checked)} /> Enable child pricing
            </label>
          </div>
          {form.childEnabled && (
            <>
              <label className="admin-field">
                <span>Child price (₹)</span>
                <input className="admin-input" type="number" min={0} value={form.childPrice} onChange={(event) => set("childPrice", Number(event.target.value))} />
              </label>
              <label className="admin-field">
                <span>Child max age</span>
                <input className="admin-input" type="number" min={0} value={form.childMaxAge} onChange={(event) => set("childMaxAge", Number(event.target.value))} />
              </label>
            </>
          )}
          <label className="admin-field full">
            <span>Cancellation policy</span>
            <textarea className="admin-textarea" value={form.cancellationPolicy} onChange={(event) => set("cancellationPolicy", event.target.value)} />
          </label>
          <label className="admin-field full">
            <span>Booking terms</span>
            <textarea className="admin-textarea" value={form.bookingTerms} onChange={(event) => set("bookingTerms", event.target.value)} />
          </label>
        </div>
      </div>

      <AddonEditor
        title="Photography add-ons"
        kind="Includes photography packages, couple and group shoots."
        addons={photographyOptions}
        setAddons={setPhotographyOptions}
      />
      <AddonEditor
        title="Filmmaking add-ons"
        kind="Includes cinematic reels and full travel films."
        addons={filmmakingOptions}
        setAddons={setFilmmakingOptions}
      />

      <div className="admin-card">
        <h3>Visibility</h3>
        <p className="hint">Draft trips are hidden. Published trips are bookable when registration is open.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Status</span>
            <select className="admin-select" value={form.status} onChange={(event) => set("status", event.target.value)}>
              {["draft", "published", "registration_open", "full", "completed", "cancelled"].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-field">
            <span>Featured</span>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={form.featured} onChange={(event) => set("featured", event.target.checked)} /> Show on homepage
            </label>
          </div>
        </div>
      </div>

      <button className="admin-btn primary" onClick={submit} disabled={saving} type="button">
        <Save /> {saving ? "Saving…" : "Save trip"}
      </button>
    </section>
  );
}

function AddonEditor({ title, kind, addons, setAddons }: { title: string; kind: string; addons: Addon[]; setAddons: (next: Addon[]) => void }) {
  return (
    <div className="admin-card">
      <h3>{title}</h3>
      <p className="hint">{kind}</p>
      {addons.map((addon, index) => (
        <div className="admin-form-grid" key={index} style={{ borderTop: index ? "1px solid #eef0ec" : "none", paddingTop: index ? 16 : 0, marginBottom: 16 }}>
          <label className="admin-field">
            <span>Code</span>
            <input className="admin-input" value={addon.code} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, code: event.target.value } : row)))} placeholder="e.g. photo-basic" />
          </label>
          <label className="admin-field">
            <span>Name</span>
            <input className="admin-input" value={addon.name} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)))} />
          </label>
          <label className="admin-field">
            <span>Price (₹)</span>
            <input className="admin-input" type="number" min={0} value={addon.price} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, price: Number(event.target.value) } : row)))} />
          </label>
          <label className="admin-field">
            <span>Description</span>
            <input className="admin-input" value={addon.description} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, description: event.target.value } : row)))} />
          </label>
          <div className="admin-field">
            <span>Options</span>
            <div style={{ display: "flex", gap: 16, fontSize: 13, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={addon.perPerson} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, perPerson: event.target.checked } : row)))} /> Per person
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={addon.active} onChange={(event) => setAddons(addons.map((row, i) => (i === index ? { ...row, active: event.target.checked } : row)))} /> Active
              </label>
            </div>
          </div>
          <div className="admin-field">
            <span>&nbsp;</span>
            <button className="admin-btn danger small" type="button" onClick={() => setAddons(addons.filter((_, i) => i !== index))}>
              <Trash2 /> Remove
            </button>
          </div>
        </div>
      ))}
      <button className="admin-btn" type="button" onClick={() => setAddons([...addons, { ...emptyAddon }])}>
        <Plus /> Add option
      </button>
    </div>
  );
}
