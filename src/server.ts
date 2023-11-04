import express from 'express';
import payload from 'payload';


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

  app.listen(3000);
}

start();
