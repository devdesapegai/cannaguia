import { auth } from "@/app/(auth)/auth";
import { getStripe } from "@/lib/stripe";
import { getUser } from "@/lib/db/queries";
import { updateStripeCustomerId } from "@/lib/db/plan";
import { ChatbotError } from "@/lib/errors";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const isGuest = (session.user.email ?? "").startsWith("guest-");
  if (isGuest) {
    return Response.json(
      { error: "Crie uma conta antes de assinar o Premium." },
      { status: 403 },
    );
  }

  const users = await getUser(session.user.email);
  const dbUser = users[0];
  if (!dbUser) {
    return Response.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await updateStripeCustomerId(session.user.id, customerId);
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/chat?upgrade=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/chat?upgrade=cancelled`,
    metadata: { userId: session.user.id },
  });

  return Response.json({ url: checkoutSession.url });
}
