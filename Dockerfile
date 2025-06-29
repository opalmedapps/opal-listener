# SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
#
# SPDX-License-Identifier: AGPL-3.0-or-later

# install dependencies in separate stage to keep node_modules out of app directory
# npm ci does not seem to be customizable on where to install node_modules/
# see: https://nickjanetakis.com/blog/best-practices-around-production-ready-web-apps-with-docker-compose#customizing-where-package-dependencies-get-installed
FROM node:22.17.0-alpine3.21 AS dependencies

ARG NODE_ENV="production"
ENV NODE_ENV="${NODE_ENV}"

# firebase-node-admin requires farmhash which does not provide a binary for arm64 with musl:
# https://github.com/lovell/farmhash/issues/48
# temporarily install build dependencies until this is resolved
RUN apk add --no-cache python3 build-base

WORKDIR /app

# install modules
# allow to cache by not copying the whole application code in (yet)
# see: https://stackoverflow.com/questions/35774714/how-to-cache-the-run-npm-install-instruction-when-docker-build-a-dockerfile
COPY package.json ./
COPY package-lock.json ./

# Installs only production dependencies when NODE_ENV is set to "production"
# see: https://docs.npmjs.com/cli/v9/commands/npm-ci#omit
RUN npm ci

FROM node:22.17.0-alpine3.21

USER node
WORKDIR /app

ARG NODE_ENV="production"
ENV NODE_ENV="${NODE_ENV}"

COPY --from=dependencies /app/node_modules /node_modules
COPY ./package*.json ./

# Copy all code sources
COPY ./listener ./listener
COPY ./legacy-registration ./legacy-registration
COPY ./src ./src
COPY ./VERSION ./VERSION

CMD [ "npm", "run", "start" ]
