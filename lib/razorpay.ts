import crypto from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

/** Raised when Razorpay credentials are missing. Surfaced to clients as a config message. */
export class PaymentConfigError extends Error {
  constructor() {
    super("Razorpay is not configured. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to the environment.");
    this.name = "PaymentConfigError";
  }
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayPublicConfig() {
  return { provider: "razorpay" as const, configured: razorpayConfigured(), keyId: process.env.RAZORPAY_KEY_ID ?? null, currency: "INR" };
}

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new PaymentConfigError();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayRequest(path: string, init: RequestInit) {
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const description = (payload as { error?: { description?: string } } | null)?.error?.description;
    throw new Error(description || `Razorpay request failed with status ${response.status}`);
  }
  return payload as Record<string, unknown>;
}

/** Create a Razorpay order on the server. Amount is passed in rupees and converted to paise. */
export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }) {
  return razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(input.amount * 100),
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
}

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/** Verify the checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !input.orderId || !input.paymentId || !input.signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return safeEqual(expected, input.signature);
}

/** Verify a Razorpay webhook body against the configured webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest(`/payments/${paymentId}`, { method: "GET" });
}

export async function createRazorpayRefund(input: { paymentId: string; amount: number; notes?: Record<string, string> }) {
  return razorpayRequest(`/payments/${input.paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount: Math.round(input.amount * 100), notes: input.notes ?? {}, speed: "normal" }),
  });
}
