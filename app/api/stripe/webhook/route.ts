import { getStripe } from "@/lib/stripe";
import {
  getUserByStripeCustomerId,
  updateStripeCustomerId,
  updateUserPlan,
} from "@/lib/db/plan";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId) break;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35);
      await updateUserPlan(userId, "premium", expiresAt);

      if (session.customer) {
        await updateStripeCustomerId(userId, session.customer as string);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const userId = await getUserByStripeCustomerId(customerId);
      if (userId) {
        await updateUserPlan(userId, "free", null);
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string;
      const userId = await getUserByStripeCustomerId(customerId);
      if (userId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 35);
        await updateUserPlan(userId, "premium", expiresAt);
      }
      break;
    }
  }

  return Response.json({ received: true });
}
