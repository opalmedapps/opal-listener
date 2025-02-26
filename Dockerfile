FROM node:16.10.0-alpine3.14
WORKDIR /app
COPY ./package*.json ./
# `--only=prod` Only install production dependencies
RUN npm install --only=prod

# Copy both code sources (legacy listener and new folder)
COPY legacy-listener ./legacy-listener
COPY ./src ./src
