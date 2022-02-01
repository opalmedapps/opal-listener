# TODO modify to support new folder structure (./src, ./src/config/config.json)
FROM node:16.10.0-alpine3.14
WORKDIR /app
COPY ./listener/package*.json ./
# `--only=prod` Only install production dependencies
RUN npm install --only=prod
COPY ./listener .

