FROM node:18.8-alpine as base

FROM base as builder

WORKDIR /home/node/app
COPY package*.json ./

COPY . .

RUN yarn install
RUN yarn build

FROM base as runtime

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=dist/payload.config.js

ENV MONGODB_URI=$MONGODB_URI
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV OPEN_AI_KEY=$OPEN_AI_KEY
ENV PAYLOAD_PUBLIC_SITE_URL=$PAYLOAD_PUBLIC_SITE_URL
ENV PAYLOAD_PUBLIC_SERVER_URL=$PAYLOAD_PUBLIC_SERVER_URL
ENV TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
ENV NODE_ENV=$NODE_ENV

ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOKS_ENDPOINT_SECRET=$STRIPE_WEBHOOKS_ENDPOINT_SECRET
ENV FLASK_ENV=$FLASK_ENV

# Binance 
ENV BINANCE_API_KEY=$BINANCE_API_KEY
ENV BINANCE_API_KEY_SECRET=$BINANCE_API_KEY_SECRET

# Supabase
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_KEY=$SUPABASE_KEY

# Mailgun
ENV SMTP_HOST=$SMTP_HOST
ENV SMTP_PORT=$SMTP_PORT
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASSWORD=$SMTP_PASSWORD
ENV SMTP_FROM=$SMTP_FROM

WORKDIR /home/node/app
COPY package*.json  ./
COPY yarn.lock ./

RUN yarn install --production
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/build ./build
COPY --from=builder /home/node/app/.env ./dist/.env
COPY --from=builder /home/node/app/.env ./build/.env
COPY --from=builder /home/node/app/.env ./.env

EXPOSE 3000

CMD ["node", "dist/server.js"]