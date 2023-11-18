## base image
FROM node:18.16-alpine as base

## build app
FROM base as builder

WORKDIR /app

COPY package*.json ./

COPY . .

COPY .env.production .env

RUN yarn install --legacy-peer-deps

RUN yarn build

## end build

## runtime image 
FROM base as runtime

ARG NODE_ENV=production

ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

ENV PAYLOAD_CONFIG_PATH=dist/payload.config.js

COPY package*.json  ./

RUN yarn install --legacy-peer-deps

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/build ./build

COPY --from=builder /app/.env ./dist/.env
COPY --from=builder /app/.env ./.env

COPY --from=builder /app/.env ./build/.env

EXPOSE 3000

CMD ["node", "dist/server.js"]