const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const createCheckoutSession = async ({
  orderId,
  bookId,
  title,
  amount,
  customerEmail,
}) => {
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
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],

    metadata: {
      orderId: String(orderId),
      bookId: String(bookId),
    },

    success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

    cancel_url: `${CLIENT_URL}/payment/cancel`,
  });

  return session;
};

const retrieveSession = (sessionId) =>
  stripe.checkout.sessions.retrieve(sessionId);

module.exports = {
  createCheckoutSession,
  retrieveSession,
};