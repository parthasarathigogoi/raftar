import { NextRequest } from "next/server";
import { BookingError, confirmBookingPayment } from "@/lib/booking-service";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { Payment } from "@/models/Payment";

type RazorpayWebhook = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string; error_description?: string } } };
};

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/**
 * Razorpay webhook. The raw body is verified against RAZORPAY_WEBHOOK_SECRET before any
 * database write, and each gateway event id is stored uniquely so replays are ignored.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(rawBody, signature)) return fail("Invalid webhook signature.", 400);

  let body: RazorpayWebhook;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    return fail("Invalid webhook payload.", 400);
  }

  const gatewayEventId = request.headers.get("x-razorpay-event-id") ?? undefined;
  const entity = body.payload?.payment?.entity;

  try {
    await connectToDatabase();
    if (["payment.captured", "payment.authorized"].includes(body.event ?? "") && entity?.order_id && entity.id) {
      await confirmBookingPayment({ orderId: entity.order_id, paymentId: entity.id, gatewayEventId, rawPayload: body, source: "webhook" });
    } else if (body.event === "payment.failed" && entity?.order_id) {
      await Payment.updateOne(
        { orderId: entity.order_id, status: { $ne: "paid" } },
        { $set: { status: "failed", failureReason: entity.error_description || "Gateway reported failure", gatewayEventId } }
      );
    }
    return ok({ received: true });
  } catch (error) {
    if (isDuplicateKey(error)) return ok({ received: true, duplicate: true });
    if (error instanceof BookingError) return ok({ received: true, ignored: error.message });
    return fail("Webhook processing failed.", 500);
  }
}
