# Opal-listener

[![pipeline status](https://gitlab.com/opalmedapps/opal-listener/badges/staging/pipeline.svg)](https://gitlab.com/opalmedapps/opal-listener/-/commits/staging) [![coverage report](https://gitlab.com/opalmedapps/opal-listener/badges/staging/coverage.svg)](https://gitlab.com/opalmedapps/opal-listener/-/commits/staging) [![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://opalmedapps.gitlab.io/opal-listener)

This is the Opal app's backend listener that sits between Firebase and OpalDB.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
Refer to the Deployment section below for notes on how to deploy the project on a live system.

### Prerequisites

These are the requirements to run a local listener app. The second requirement is only needed to run in a live setting with actual clinical data.

1) Install [Node.js](https://nodejs.org/en/download/), either directly or using a Node version manager.
   Refer to other components in the Opal system (e.g. the app repo), or to this repo's Dockerfile for the correct version number to install.
2) (**Only required if wanting to access live data**) Have access to clinical computer in the MedPhys department
3) Install [Docker](https://docs.docker.com/get-docker/) (Should you choose the docker installation)
4) Configure a test DB. It is suggested to use Docker to run your local database. [Instruction here](https://gitlab.com/opalmedapps/db-docker). You can, alternatively, setup a local mysql server using XAMP/MAMP by following [these instructions](https://gitlab.com/opal-teaching/opal-backend-wiki/-/blob/master/backend-installation.md#database)
5) Setup firebase app. You can follow [these instruction](https://gitlab.com/opal-teaching/opal-backend-wiki/-/blob/master/backend-installation.md#firebase) to complete the setup.

### Installation

##### Step 1 | Add Firebase configuration
Copy your firebase admin key file into the `src/config/firebase` directory.
> The content of this directory is ignore by versioning

##### Step 2 | App configuration

Copy and rename `listener/config_template.json` to `listener/config.json`.
Also copy and rename `src/config/config.template.json` to `src/config/config.json`.
Then edit the required fields. Across both files, you should at least need to change these fields:

```
listener/config.json

MYSQL_USERNAME: "The database user name",
MYSQL_PASSWORD: "The database password",
MYSQL_DATABASE: "The name of the OpalDB",
MYSQL_DATABASE_QUESTIONNAIRE: "The name of the QuestionnaireDB",
MYSQL_DATABASE_REGISTRATION: "The name of the registerdb",
MYSQL_DATABASE_PORT: 3306,
MYSQL_DATABASE_HOST: "host.docker.internal",
LATEST_STABLE_VERSION: "0.0.1"
```

```
src/config/config.json

FIREBASE: {
  DATABASE_URL: "This value can be found in the web_config.txt file in your firebase folder",
  ADMIN_KEY_PATH: "See value in the comment below",
  ROOT_BRANCH: "dev3/A0",
  ENABLE_LOGGING: false
}
```

> ADMIN_KEY_PATH: If you intend to run the listener in Docker, use "/app/src/config/firebase/NAME_OF_YOUR_ADMIN_KEY_FILE.json".
> If you intend to run the listener using Node.js, use the absolute path to the Firebase admin key file on your computer (using forward slashes, not backslashes).

> Leave all other variables blank by setting them to empty double quotes: ""

> Notice that the host names are `host.docker.internal` and NOT `localhost`. This is required for a container to call a localhost service on the host system.

> When running the app using Docker, your firebase admin key file is copied in the container for it to be accessible.

##### Step 3 | Install the NPM packages
Run the following command at the root of the project to install its dependencies.
```
npm install
```

##### Step 4 | Run the listener
###### Step 4.1 (option) | Running in Docker
The project contains a `Dockerfile` and  `docker.compose.yml` files to build and run the app within a Docker container, either for a production-like setup or development using a local volume.

Make sure you've filled out the `ADMIN_KEY_PATH` config with the correct value for running the listener in Docker.

To build the Docker image and run the container, running the following command at the root of the project
```
docker compose up 
```

The project also contains a `docker-compose.prod.yml` This file is used to build an image and a container with an attached volume and a different start command. You can use this file should you want a non-developpement set up. To use this file run the command:
```
docker compose -f docker-compose.prod.yml up --build
```

> More information about Docker compose can be found [here](https://docs.docker.com/compose/)

###### Step 4.2 (option) | Running with Node.js
Make sure you've filled out the `ADMIN_KEY_PATH` config with the correct value for running the listener with Node.js.

Run the following command at the root of the project.

```
npm run start
```

Alternatively, to avoid having to restart the listener every time you make changes to the code while developing, use:
```
npm run watch
```

### Project Configurations

#### ESLint

This project uses ESLint to statically analyze its source code. It has been configured to only analyze new files in the 
context of strangler fig (i.e. to ignore files in the `listener` folder).

The rules for this project use the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
as a base, with additional rules set based on our preferred style and convention.

Follow the steps below to enable ESLint in your IDE.

##### VSCode

To enable ESLint in VSCode, install the recommended plugin [ESLint by Microsoft](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

##### PhpStorm

1. Go to `File > Settings/Preferences > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint`.
2. Select `Automatic ESLint configuration`.

## Documentation

To generate and view the project documentation, follow the steps below.

1. Generate the documentation using `npm run docs`.
2. Using your IDE, right-click on the file `docs/generated/index.html` and select the option to open it in a browser.

For help on creating new documentation pages, refer to {@tutorial creating-documentation}.

## Running the tests

Unit tests for this repository are run using the Mocha test framework. Test files should be in the `src` directory
(or any of its subdirectories), and should have a name in the format `*.test.*`.

To run the tests:

```sh
npm test
```

## Deployment

Deployment is managed by [PM2](https://github.com/Unitech/pm2)

### Prerequisites
1) Have access to clinical computer and credentials that allow you SSH into Opal servers.
2) Node should **already** be installed, but if not, you will have to [install the Node runtime yourself](https://nodejs.org/en/download/)
3) PM2 should **already** be installed, but if not, you will have to install yourself using

```
# Install latest PM2 version
$ npm install pm2@latest -g
# Save process list, exit old PM2 & restore all processes
$ pm2 update
```

3) Git should **already** be installed, but if not, you will have to [install Git yourself](https://www.atlassian.com/git/tutorials/install-git)
 
### Deployment
There are two use case for deployment: creating a new process and updating a previous. Of course, the latter will be 99% of the use cases.

1) Updating 
* We assume the environment and codebase is propery installed and configured
* We assume the repository is cloned 
* We assume the PM2 process is already created

Go to the directory that corresponds to the branch you want to update.

Pull the latest changes: 

```
git pull
```

Restart the PM2 process:

```
pm2 restart <name-of-process>
```

2) Spawning new process
* We assume the environment and codebase is propery installed and configured

- Clone the repo into a new directory
- Switch to the branch that is going to be deployed

```
git fetch
git checkout <branch>
```

- Start new PM2 process

```
pm2 start src/server.js --name <name-of-process>
```

## Built With

* [Node](https://nodejs.org/en/) - The server-side library used
* [PM2](https://github.com/Unitech/pm2) - Process Management

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

* **James Brace** - *Initial work*
* **David Hererra** - *Initial work*

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
