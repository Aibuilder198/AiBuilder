const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "AI Website Builder" },
            unit_amount: 2000, // $20
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL}/success.html`,
      cancel_url: `${process.env.SITE_URL}/cancel.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};