FROM node:16.20.0-alpine3.17

USER node
WORKDIR /app

COPY --chown=node:node ./package*.json ./

ARG NODE_ENV="production"
ENV NODE_ENV="${NODE_ENV}"

# Installs production dependencies only automatically when NODE_ENV is set to "production"
# see npm help ci (section omit)
RUN npm ci

# Copy all code sources
COPY ./listener ./listener
COPY ./legacy-registration ./legacy-registration
COPY ./src ./src

CMD [ "npm", "run", "start" ]
