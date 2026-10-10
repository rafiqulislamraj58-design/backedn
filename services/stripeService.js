
import Stripe from "stripe";
import "dotenv/config";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing from your .env file"
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:3000";

const createCheckoutSession = async ({
  orderId,
  bookId,
  title,
  amount,
  customerEmail,
}) => {
  if (!orderId || !bookId || !title || !customerEmail) {
    throw new Error("Required checkout session data is missing");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid checkout payment amount");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    customer_email: customerEmail,

    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Delivery fee: ${title}`,
          },
          unit_amount: Math.round(numericAmount * 100),
        },
        quantity: 1,
      },
    ],

    metadata: {
      orderId: String(orderId),
      bookId: String(bookId),
    },

    success_url:
      `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

    cancel_url: `${CLIENT_URL}/payment/cancel`,
  });

  return session;
};

const retrieveSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Stripe session ID is required");
  }

  return stripe.checkout.sessions.retrieve(sessionId);
};

export {
  createCheckoutSession,
  retrieveSession,
};