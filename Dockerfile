FROM node:18-alpine as base

FROM base as builder

WORKDIR /home/node/app

COPY package*.json ./
COPY . .

RUN npm install 
RUN npm install copyfiles
RUN npm run generate:types
RUN npm run build

FROM base as runtime

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=/home/node/app/dist/payload.config.js

WORKDIR /home/node/app
COPY package*.json  ./
COPY .env ./
COPY dist ./dist

RUN npm install --production 
COPY ./dist ./dist
COPY --from=builder /home/node/app/build ./build


EXPOSE 8080

CMD ["node", "dist/server.js"]