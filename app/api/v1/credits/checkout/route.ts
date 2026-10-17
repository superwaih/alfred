import { requireUser } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { ApiError, handle, json, preflight, readJson } from "@/lib/server/http";
import { polarClient } from "@/lib/server/polar";
import { checkoutBody } from "@/lib/server/schemas";

export const OPTIONS = preflight;

/** Starts a Polar checkout for a credit pack and returns its URL. */
export const POST = handle(async (request) => {
  const user = await requireUser(request);
  const { packId } = await readJson(request, checkoutBody);
  const pack = env.creditPacks().find((candidate) => candidate.id === packId);
  if (!pack) throw new ApiError(404, "unknown_pack", "That credit pack isn't available.");

  const checkout = await polarClient().checkouts.create({
    products: [pack.productId],
    external_customer_id: user._id.toHexString(),
    customer_email: user.email,
    customer_name: user.name || null,
    success_url: `${env.siteUrl()}/credits/thanks?checkout_id={CHECKOUT_ID}`,
    metadata: { user_id: user._id.toHexString(), pack_id: pack.id, credits: pack.credits },
  });
  return json(request, { url: checkout.url });
});
