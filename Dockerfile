FROM node:16.10.0-alpine3.14
WORKDIR /app
COPY ./listener .
RUN npm install --only=prod
