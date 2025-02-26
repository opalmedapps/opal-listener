# Opal-listener
This is the Opal app's backend listener that sits between Firebase and OpalDB.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

These are the requirements to run a local listener app. The second requirement is only needed to run in a live setting with actual clinical data.

1) Install [Node.js](https://nodejs.org/en/download/)
2) (**Only required if wanting to access live data**) Have access to clinical computer in the MedPhys department
3) Configure a test DB. It is suggested to use Docker to run your local database. [Instruction here](https://gitlab.com/opalmedapps/db-docker). You can, alternatively, setup a local mysql server using XAMP/MAMP by following [these instructions](https://gitlab.com/opal-teaching/opal-backend-wiki/-/blob/master/backend-installation.md#database)
4) Setup firebase app. You can follow [these instruction](https://gitlab.com/opal-teaching/opal-backend-wiki/-/blob/master/backend-installation.md#firebase) to complete the setup.

### Installing with Docker
The project contains a `Dockerfile` and a `docker.compose.yml` to build and run the app within a Docker container.

##### Step 1 | Add Firebase configuration
Move your firebase admin key file in the `env/local` directory located at the root. 
##### Step 2 | App configuration
Move `config_template.json` to `env/local` then rename it `config.json`. Then edit the require fields. You should at least need to change these fields:
```
MYSQL_USERNAME: "The database user name",
MYSQL_PASSWORD: "The database password",
MYSQL_DATABASE: "The name of the OpalDB",
MYSQL_DATABASE_QUESTIONNAIRE: "The name of the QuestionnaireDB",
MYSQL_DATABASE_PORT: "3306",
MYSQL_DATABASE_HOST: "host.docker.internal",
HOST: "host.docker.internal",
FIREBASE_ADMIN_KEY: "Absolute path to the json firebase admin key file that you copied in step 1,
DATABASE_URL: "This value can be found in the web_config.txt file in your firebase folder",
LATEST_STABLE_VERSION: "0.0.1",
FIREBASE_ROOT_BRANCH: "dev3/A0",
```

> Leave all other variables blank by setting them to empty double quotes: ""

> When running the app using Docker, the `./listener/config/config.json` file is overwritten in the container with the one in the `env/local` folder. Your firebase admin key file is also copied in the container for it to be accessible.

##### Step 3 | Build the Docker image
To build the Docker image, run the command that accepts an environment as an argument.

```
docker compose build --build-arg ENV_CONFIG=local
```

The `ENV_CONFIG` build argument specifies which environment we build our app with. It reflects the name of the directory in the `env` folder found at the root of the code base. EX: local, prod, preprod

> More informations about Docker compose can be found [here](https://docs.docker.com/compose/)

##### Step 4 | Run the application
Start you app with the following command:
```
docker compose up
```

### Installing with NodeJs

Make sure all the references in /listener/config/config.json are correct. Currently they are pointing to locations on the Opal server.

Once the configurations are set up properly, you need to install all the dependencies:

* Navigate to listener directory
* Run the following command:

```
npm install
```

Once that is done, you can start the app by running the following command in the listener directory:

```
node server.js
```

## Running the tests

Explain how to run the automated tests for this system

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

- Navigate to listener directory 
- Start new PM2 process

```
pm2 start server.js --name <name-of-process>
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
