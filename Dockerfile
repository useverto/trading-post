FROM node:15-alpine
RUN mkdir /app
COPY . /app/
COPY verto.config.example.json /app/verto.config.json
WORKDIR /app
RUN yarn && yarn prod
CMD [ "node", "/app/dist/verto.js" ]
ENV ETH_ADDRESS 0xb4e29C964a9abc215f8e8e4e041aFEa4B955D1D6
ENV TRADE_FEE 0.01
ENV PUBLIC_URL ar.stelzer.io
EXPOSE 8080/tcp