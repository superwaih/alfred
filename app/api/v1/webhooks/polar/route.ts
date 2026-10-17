import { ObjectId } from "mongodb";
import { grantPurchase } from "@/lib/server/credits";
import { env } from "@/lib/server/env";
import { webhooks } from "@/lib/server/polar";

/**
 * Polar calls this when an order is paid. Credits are granted once per order:
 * the pack is looked up by the order's product, never trusted from metadata alone.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event: Awaited<ReturnType<typeof webhooks.validateEvent>>;
  try {
    event = await webhooks.validateEvent(body, headers, env.polarWebhookSecret());
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) return new Response("Invalid signature", { status: 403 });
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) return new Response(null, { status: 202 });
    throw error;
  }

  if (event.type !== "order.paid") return new Response(null, { status: 202 });

  const order = event.data;
  const pack = env.creditPacks().find((candidate) => candidate.productId === order.product_id);
  const userId = order.metadata?.user_id;
  if (!pack || typeof userId !== "string" || !ObjectId.isValid(userId)) {
    console.error("order.paid without a known pack or user", { orderId: order.id, productId: order.product_id });
    // Acknowledge so Polar stops retrying; this needs a human to look at it.
    return new Response(null, { status: 202 });
  }

  await grantPurchase(new ObjectId(userId), pack.credits, order.id);
  return new Response(null, { status: 200 });
}
