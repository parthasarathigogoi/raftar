"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const SORTS = [
  { value: "date", label: "Upcoming date" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popularity", label: "Most booked" },
];

const DURATIONS = [
  { value: "1-3", label: "1–3 days" },
  { value: "4-6", label: "4–6 days" },
  { value: "7+", label: "7+ days" },
];

const AVAILABILITY = [
  { value: "registration_open", label: "Registration open" },
  { value: "almost_full", label: "Almost full" },
  { value: "fully_booked", label: "Fully booked" },
  { value: "registration_closed", label: "Registration closed" },
  { value: "upcoming", label: "Upcoming" },
];

export default function TripFilters({ destinations, hasTrips }: { destinations: string[]; hasTrips: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const get = (key: string) => params.get(key) ?? "";
  const hasActiveFilters = ["q", "destination", "from", "to", "maxPrice", "duration", "availability"].some((key) => get(key));

  function apply(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    router.push(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return (
    <form
      className="trips-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q: query });
      }}
    >
      <div className="trips-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by trip title or destination"
          aria-label="Search trips"
          disabled={!hasTrips}
        />
        <button className="btn btn-solid" type="submit" disabled={!hasTrips}>
          <Search /> Search
        </button>
      </div>

      <div className="filter-grid">
        <label className="filter-field">
          <span>Destination</span>
          <select value={get("destination")} onChange={(event) => apply({ destination: event.target.value })} disabled={!hasTrips}>
            <option value="">All destinations</option>
            {destinations.map((destination) => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Departs after</span>
          <input type="date" value={get("from")} onChange={(event) => apply({ from: event.target.value })} disabled={!hasTrips} />
        </label>

        <label className="filter-field">
          <span>Returns before</span>
          <input type="date" value={get("to")} onChange={(event) => apply({ to: event.target.value })} disabled={!hasTrips} />
        </label>

        <label className="filter-field">
          <span>Max price per person (₹)</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={get("maxPrice")}
            onChange={(event) => apply({ maxPrice: event.target.value })}
            placeholder="Any"
            disabled={!hasTrips}
          />
        </label>

        <label className="filter-field">
          <span>Duration</span>
          <select value={get("duration")} onChange={(event) => apply({ duration: event.target.value })} disabled={!hasTrips}>
            <option value="">Any length</option>
            {DURATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Availability</span>
          <select value={get("availability")} onChange={(event) => apply({ availability: event.target.value })} disabled={!hasTrips}>
            <option value="">Any status</option>
            {AVAILABILITY.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Sort by</span>
          <select value={get("sort") || "date"} onChange={(event) => apply({ sort: event.target.value })} disabled={!hasTrips}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <span className="filter-count">
          {hasTrips ? "Filters update the list instantly." : "No trips are available to filter right now."}
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setQuery("");
              router.push(pathname, { scroll: false });
            }}
          >
            Reset filters
          </button>
        )}
      </div>
    </form>
  );
}
