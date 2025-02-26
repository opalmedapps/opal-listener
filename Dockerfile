FROM node:16.10.0-alpine3.14

WORKDIR /app

ARG ENV_CONFIG="prod"

COPY ./listener/package*.json ./
RUN npm install
COPY ./listener .
COPY ./env/$ENV_CONFIG ./config