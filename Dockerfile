FROM node:20-alpine

WORKDIR /app

COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY package.json ./

RUN npm install --workspace=shared --workspace=server

COPY shared/ ./shared/
COPY server/ ./server/

RUN cd shared && npm run build
RUN cd server && npm run build

EXPOSE 8080 8081 8082 8083

WORKDIR /app/server
CMD ["node", "dist/index.js"]
