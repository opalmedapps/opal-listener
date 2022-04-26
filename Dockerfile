FROM node:16.14.0-alpine3.15
WORKDIR /app
COPY ./package*.json ./
# `--only=prod` Only install production dependencies
RUN npm install --only=prod

# Copy all code sources
COPY ./listener ./listener
COPY ./legacy-registration ./legacy-registration
COPY ./src ./src
