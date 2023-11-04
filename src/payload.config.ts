import path from 'path';
import payload from 'payload';
import { buildConfig } from 'payload/config';
import Users from './collections/Users';
import Categories from './collections/Categories';
import Comments from './collections/Comments';
import Notifications from './collections/Notifications';
import Orders from './collections/Orders/Orders';
import PaymentMethods from './collections/PaymentMethods';
import Plans from './collections/Plans';
import Products from './collections/Products';
import Subscriptions from './collections/Subscriptions';
import Media from './collections/Media';
import pagoMovil from './globals/pago-movil';
import zelle from './globals/zelle';
import ProductPrices from './collections/ProductPrices';
import Currencies from './collections/Currencies';
import Metric from './collections/Metric';
import gpt4 from './globals/gpt4';
import gpt35 from './globals/gpt3-5';
import whisper from './globals/whisper';
import Audios from './collections/Audios';
import Chats from './collections/Chats';
import Messages from './collections/Messages';
import UserTranscriptions from './collections/UserTranscriptions';
import Prompts from './collections/Prompts';
import stripePlugin from "@payloadcms/plugin-stripe";
import { createCheckoutSession } from './endpoints/stripe/create-checkout-session';
import { chargeCheckoutSession } from './endpoints/stripe/charge-session-checkout';
import { createPaymentSession } from './endpoints/stripe/create-payment-method';
import { binanceOrderCreationHandler } from './endpoints/binance/binance-order';
import { binanceWebhookHandler } from './endpoints/binance/webhook';
import { UploadUserPdf } from './endpoints/ai/pdf';
import UserDocuments from './collections/UserDocuments';
import { Plan, Product, User } from './payload-types';
import { audioUserTranscription } from './endpoints/ai/audioUserTranscription';
import  {transcriptionSummary} from './endpoints/ai/transcriptionSummary';
import { fileUploadResume } from './endpoints/ai/fileUploadResume';

export const srcPath = path.resolve(__dirname, '../src')


export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL ??
  "https://api.casttens.com",
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: 'Admin - Summary App',
    },
    webpack: (config) => {      
      return {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            
            // MOCKS
            [path.resolve(__dirname, 'services/audioTranscription')]: path.resolve(__dirname, './mocks/audioTranscription.js'),
            [path.resolve(__dirname, 'services/createChatCompletition')]: path.resolve(__dirname, './mocks/createChatCompletition.js'),
            [path.resolve(__dirname, 'services/audioResume')]: path.resolve(__dirname, './mocks/audioResume.js'),

            // PDF
            [path.resolve(__dirname, 'endpoints/ai/pdf')]: path.resolve(__dirname, './mocks/pdf.js'),

            // AUDIO
            [path.resolve(__dirname, 'endpoints/ai/audioUserTranscription')]: path.resolve(__dirname, './mocks/audioUserTranscription.js'),
            [path.resolve(__dirname, 'endpoints/ai/fileUploadResume')]: path.resolve(__dirname, './mocks/fileUploadResume.js'),
            [path.resolve(__dirname, 'endpoints/ai/transcriptionSummary')]: path.resolve(__dirname, './mocks/transcriptionSummary.js'),
          },
        },
      }
    },
  },
  collections: [
    Audios,
    Categories,
    Comments,
    Currencies,
    Chats,
    Media,
    Metric,
    Messages,
    Notifications,
    PaymentMethods,
    Plans,
    ProductPrices,
    Products,
    Prompts,
    Subscriptions,
    Orders,
    Users,
    UserTranscriptions,
    UserDocuments
  ],
  globals: [
    pagoMovil,
    zelle,
    gpt4,
    gpt35,
    whisper,
  ],
  cors: [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://checkout.stripe.com',
    'https://bpay.binanceapi.com',
    'https://binance.com'
  ].filter(Boolean),
  csrf: [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://checkout.stripe.com',
    'https://bpay.binanceapi.com',
    'https://binance.com'
  ].filter(Boolean),
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  plugins: [
    stripePlugin({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      isTestKey: true,
      logs: true,
      sync: [
        {
          collection: 'users',
          stripeResourceType: 'customers',
          stripeResourceTypeSingular: 'customer',
          fields: [
            {
              fieldPath: 'email',
              stripeProperty: 'email',
            },
            // NOTE: nested fields are not supported yet, because the Stripe API keeps everything separate at the top-level
            // because of this, we need to wire our own custom webhooks to handle these changes
            // In the future, support for nested fields may look something like this:
            // {
            //   field: 'subscriptions.name',
            //   property: 'plan.name',
            // }
          ],
        },
      ],
      stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOKS_ENDPOINT_SECRET,
      webhooks: {
        'checkout.session.completed': async ({ event, stripe, stripeConfig }) => {

          const data = event.data.object;
          const metadata = data.metadata;
          const productId = metadata.productId;
          const stripeCustomerID = data.customer;

          // find user and product by stripeCustomerID and productId, then get plan functionalities, create order and update user functionalities
          try {
            const user = await payload.find<'users'>({
              collection: 'users',
              where: {
                stripeCustomerID: {
                  equals: stripeCustomerID,
                },
              },
            });

            const product = await payload.findByID<'products'>({
              collection: 'products',
              id: productId,
              depth: 3,
            });
            const plan = product?.productType as Plan;

            const order = await payload.create<'orders'>({
              collection: 'orders',
              data: {
                products: productId,
                customer: user.docs[0].id,
                status: 'active',
                type: 'subscription',
                amount: data.amount_total / 100,
              },
            });

            // update user functionallity
            const updatedUser = await payload.update<'users'>({
              collection: 'users',
              id: user.docs[0].id,
              data: {
                functionalities: plan.functionalities,
              },
            });

          } catch (error) {
            console.log(error, '<----------- error');
          }
        },
        'payment_intent.succeeded': async ({ event, stripe, stripeConfig }) => {

          const data = event.data.object;
          const metadata = data.metadata;
          const orderId = metadata.orderId;

          try {
            const order = await payload.findByID<'orders'>({
              collection: 'orders',
              id: orderId,
              depth: 3,
            });

            const user = order.customer as User;
            const productPlan = order.products[0] as Product;
            const plan = productPlan.productType as Plan;

            const updatedOrder = await payload.update<'orders'>({
              collection: 'orders',
              id: order?.id,
              data: {
                status: 'active',
              },
            });

            const updatedUser = await payload.update<'users'>({
              collection: 'users',
              id: user?.id,
              data: {
                functionalities: plan.functionalities,
              },
            });

          } catch (error) {
            console.log(error, '<----------- error');
          }
        },
      }
    }),
  ],
  endpoints: [
    {
      path: '/create-checkout-session',
      method: 'post',
      handler: createCheckoutSession,
    },
    {
      path: '/charge-session-checkout',
      method: 'post',
      handler: chargeCheckoutSession,
    },
    {
      path: '/create-payment-method',
      method: 'post',
      handler: createPaymentSession,
    },
    {
      path: '/create-binance-order',
      method: 'post',
      handler: binanceOrderCreationHandler,
    },
    {
      path: '/binance/webhook',
      method: 'post',
      handler: binanceWebhookHandler,
    },
    {
      path: '/files/upload',
      method: 'post',
      handler: fileUploadResume
    },
    {
      path: '/transcription/summary',
      method: 'post',
      handler: transcriptionSummary
    },
    {
      path: '/audio/user-transcription',
      method: 'post',
      handler: audioUserTranscription
    },
    {
      path: '/pdf/embedding',
      method: 'post',
      handler: UploadUserPdf
    }
  ]
});
