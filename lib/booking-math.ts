// Pure, dependency-free helpers for trip booking maths and inventory.
// Kept free of framework/DB imports so it can be unit tested directly.

export type AddonInput = { code: string; name: string; price: number; perPerson: boolean; kind?: string };

export function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/** Seats still purchasable = capacity minus confirmed bookings minus live holds. */
export function availableSeats(totalSeats: number, seatsBooked: number, seatsReserved: number) {
  return Math.max(0, (totalSeats || 0) - (seatsBooked || 0) - (seatsReserved || 0));
}

export type AmountBreakdown = {
  baseAmount: number;
  addonAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
};

/**
 * Compute all booking amounts from a trip price snapshot.
 * Children are only priced when the trip enables child pricing; otherwise children
 * travel free and only add to the add-on per-person count.
 */
export function computeBookingAmounts(input: {
  pricePerPerson: number;
  childPricingEnabled?: boolean;
  childPrice?: number;
  numberOfAdults: number;
  numberOfChildren: number;
  addons: AddonInput[];
  discountAmount?: number;
  taxPercent?: number;
}): AmountBreakdown {
  const adults = Math.max(0, Math.floor(input.numberOfAdults || 0));
  const children = Math.max(0, Math.floor(input.numberOfChildren || 0));
  const travellers = adults + children;
  const childUnit = input.childPricingEnabled ? input.childPrice || 0 : 0;

  const baseAmount = roundCurrency(adults * (input.pricePerPerson || 0) + children * childUnit);
  const addonAmount = roundCurrency(
    (input.addons || []).reduce((sum, addon) => sum + (addon.price || 0) * (addon.perPerson ? travellers : 1), 0)
  );
  const discountAmount = roundCurrency(Math.min(Math.max(0, input.discountAmount || 0), baseAmount + addonAmount));
  const taxable = Math.max(0, baseAmount + addonAmount - discountAmount);
  const taxAmount = roundCurrency((taxable * Math.max(0, input.taxPercent || 0)) / 100);

  return { baseAmount, addonAmount, discountAmount, taxAmount, totalAmount: roundCurrency(taxable + taxAmount) };
}

export function slugify(value: string) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function bookingReference(prefix = "RFT") {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function receiptNumber(paymentId: string) {
  return `RCPT-${paymentId}`.toUpperCase();
}
