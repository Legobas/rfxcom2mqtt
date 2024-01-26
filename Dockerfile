FROM node:latest

WORKDIR /usr/app
COPY ./src/package.json .
RUN npm install
RUN npm install -g ts-node typescript
COPY ./src .

CMD ["ts-node", "index.ts"]
