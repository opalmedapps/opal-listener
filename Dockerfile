FROM node:16.10.0-alpine3.14

WORKDIR /app

ARG ENV_CONFIG="local"

COPY ./listener/package*.json ./
RUN npm install
COPY ./listener .
COPY ./config/$ENV_CONFIG/firebase ./config/firebase 
COPY ./config/$ENV_CONFIG/config.json ./config
