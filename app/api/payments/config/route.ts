import { ok } from "@/lib/http";
import { getRazorpayPublicConfig } from "@/lib/razorpay";

export async function GET() {
  return ok({ payment: getRazorpayPublicConfig() });
}
