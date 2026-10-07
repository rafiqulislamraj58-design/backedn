const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async ({
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
          currency: "USD",
          product_data: {
            name: title,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],

    metadata: {
      bookId: String(bookId),
    },

    success_url:
      "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}",

    cancel_url:
      "http://localhost:3000/payment/cancel",
  });

  return session;
};

module.exports = {
  createCheckoutSession,
};