FROM node:16.14.0-alpine3.15
WORKDIR /app
COPY ./package*.json ./
# `--only=prod` Only install production dependencies
RUN npm install --only=prod

# Copy both code sources (legacy listener and new folder)
COPY ./listener ./listener
COPY ./src ./src
