import express from 'express';
import payload from 'payload';
import Stripe from "stripe";
import { createPaymentSession } from './endpoints/stripe/create-payment-method';
import { chargeCheckoutSession } from './endpoints/stripe/charge-session-checkout';
import { createCheckoutSession } from './endpoints/stripe/create-checkout-session';


require('dotenv').config();
const app = express();

// Redirect root to Admin panel
app.get('/', (_, res) => {
  res.redirect('/admin');
});

const start = async () => {
  // Initialize Payload
  const secret = process.env.PAYLOAD_SECRET
  const mongoURL = process.env.MONGODB_URI

  if (!secret) {
    throw new Error('Missing env var: PAYLOAD_SECRET')
  }

  if (!mongoURL) {
    throw new Error('Missing env var: MONGODB_URI')
  }

  await payload.init({
    secret,
    mongoURL, express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
    },
  })

  console.log(mongoURL)

  app.post('/api/create-payment-method',createPaymentSession)
  app.post('/api/charge-session-checkout',chargeCheckoutSession)
  app.post('/api//create-checkout-session',createCheckoutSession)
  //   path: '/charge-session-checkout',
    //   method: 'post',
    //   handler: chargeCheckoutSession,
    // },

  app.listen(3000);
}

start();
