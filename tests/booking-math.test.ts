import test from "node:test";
import assert from "node:assert/strict";
import { availableSeats, bookingReference, computeBookingAmounts, receiptNumber, roundCurrency, slugify } from "../lib/booking-math.ts";
import { formatDateRange, humanise } from "../lib/format.ts";

test("availableSeats subtracts confirmed and reserved seats and never goes negative", () => {
  assert.equal(availableSeats(20, 5, 3), 12);
  assert.equal(availableSeats(10, 9, 5), 0);
  assert.equal(availableSeats(0, 0, 0), 0);
});

test("children travel free when child pricing is disabled", () => {
  const amounts = computeBookingAmounts({ pricePerPerson: 20000, numberOfAdults: 2, numberOfChildren: 2, addons: [] });
  assert.equal(amounts.baseAmount, 40000);
  assert.equal(amounts.totalAmount, 40000);
});

test("children are priced when child pricing is enabled", () => {
  const amounts = computeBookingAmounts({ pricePerPerson: 20000, childPricingEnabled: true, childPrice: 10000, numberOfAdults: 2, numberOfChildren: 1, addons: [] });
  assert.equal(amounts.baseAmount, 50000);
});

test("per-person add-ons multiply by all travellers while one-time add-ons do not", () => {
  const amounts = computeBookingAmounts({
    pricePerPerson: 10000,
    numberOfAdults: 2,
    numberOfChildren: 1,
    addons: [
      { code: "PHOTO", name: "Photography", price: 5000, perPerson: true },
      { code: "FILM", name: "Travel film", price: 30000, perPerson: false },
    ],
  });
  assert.equal(amounts.addonAmount, 45000);
  assert.equal(amounts.totalAmount, 65000);
});

test("discount is capped at the subtotal and tax applies to the discounted amount", () => {
  const amounts = computeBookingAmounts({
    pricePerPerson: 10000,
    numberOfAdults: 2,
    numberOfChildren: 0,
    addons: [],
    discountAmount: 999999,
    taxPercent: 5,
  });
  assert.equal(amounts.baseAmount, 20000);
  assert.equal(amounts.discountAmount, 20000);
  assert.equal(amounts.taxAmount, 0);
  assert.equal(amounts.totalAmount, 0);
});

test("tax is computed on the taxable amount after discounts", () => {
  const amounts = computeBookingAmounts({ pricePerPerson: 10000, numberOfAdults: 2, numberOfChildren: 0, addons: [], discountAmount: 2000, taxPercent: 5 });
  assert.equal(amounts.discountAmount, 2000);
  assert.equal(amounts.taxAmount, 900);
  assert.equal(amounts.totalAmount, 18900);
});

test("roundCurrency avoids floating point drift", () => {
  assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  assert.equal(roundCurrency(Number.NaN), 0);
});

test("slugify produces url-safe slugs", () => {
  assert.equal(slugify("Meghalaya  Monsoon  Trail!"), "meghalaya-monsoon-trail");
  assert.equal(slugify("  "), "");
});

test("booking and receipt references are human-readable", () => {
  assert.match(bookingReference(), /^RFT-\d{4}-[A-Z0-9]{8}$/);
  assert.equal(receiptNumber("pay_abc123"), "RCPT-PAY_ABC123");
});

test("format helpers render names and date ranges", () => {
  assert.equal(humanise("pending_payment"), "Pending Payment");
  assert.equal(humanise(null), "—");
  assert.equal(formatDateRange("2026-01-01", "2026-01-01"), formatDateRange("2026-01-01", "2026-01-01"));
  assert.match(formatDateRange("2026-01-01", "2026-01-05"), /–/);
});
