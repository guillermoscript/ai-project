import { buildConfig } from 'payload/config';
import path from 'path';
import Users from './collections/Users';
import { payloadCloud } from '@payloadcms/plugin-cloud';
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

export default buildConfig({
  serverURL: 'http://localhost:3000',
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: 'Admin - Summary App',
    },
  },
  collections: [
    Categories,
    Comments,
    Currencies,
    Media,
    Notifications,
    PaymentMethods,
    Plans,
    ProductPrices,
    Products,
    Subscriptions,
    Orders,
    Users,
  ],
  globals: [
    pagoMovil,
    zelle
  ],
  cors: [
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean),
  csrf: [
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean),
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  plugins: [
    payloadCloud()
  ],
  // endpoints: [
  //   {
  //     path: '/v1/inactivate-subscription-and-create-renewal-order',
  //     method: 'get',
  //     handler: async (req, res) => {
  //       try {
  //         const result = await runInactivateSubscriptionAndCreateRenewalOrder();
  //         console.log(result, '<----------- result');
  //         res.status(StatusCodes.OK).send(result);
  //       } catch (error) {
  //         console.log(error, '<----------- error');
  //         res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
  //       }
  //     },
  //   }
  // ]
});
