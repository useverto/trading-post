FROM node:15-alpine
RUN mkdir /app
COPY . /app/
COPY verto.config.example.json /app/verto.config.json
WORKDIR /app
RUN yarn && yarn prod
CMD [ "node", "/app/dist/verto.js" ]
ENV ETH_ADDRESS some_address
ENV TRADE_FEE 0.01
ENV PUBLIC_URL your-public-url.io
EXPOSE 8080/tcp