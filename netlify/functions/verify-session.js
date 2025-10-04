// /netlify/functions/verify-session.js
const Stripe = require("stripe");

exports.handler = async (event) => {
  try {
    const session_id = event.queryStringParameters?.session_id;
    if (!session_id) {
      return { statusCode: 400, body: "Missing session_id" };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid =
      session?.payment_status === "paid" || session?.status === "complete";

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paid }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
