# Listener

[![pipeline status](https://gitlab.com/opalmedapps/opal-listener/badges/main/pipeline.svg)](https://gitlab.com/opalmedapps/opal-listener/-/commits/main) [![coverage report](https://gitlab.com/opalmedapps/opal-listener/badges/main/coverage.svg)](https://gitlab.com/opalmedapps/opal-listener/-/commits/main) [![Docs](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://opalmedapps.gitlab.io/opal-listener)

This is Opal's backend listener that facilitates communication between the user applications and the Opal PIE (typically running within a hospital network that cannot be accessed from the outside) via Firebase.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.
Refer to the Deployment section below for notes on how to deploy the project on a live system.

### Prerequisites

These are the requirements to run the listener locally.

1. [Docker](https://docs.docker.com/get-docker/)
2. Have the [backend](https://gitlab.com/opalmedapps/backend) and [legacy databases](https://gitlab.com/opalmedapps/db-docker) running.
3. Have your own [Firebase project set up](https://opalmedapps.gitlab.io/development/setup/) and the Firebase admin key file saved.

### Installation

#### Step 1: Add Firebase configuration

Copy your Firebase admin key file into the `src/config/` directory.
The content of this directory is ignored from version control.

#### Step 2: Configuration

Copy and rename `.env.sample` to `.env`.
Then, fill out the fields according to your local installation (most importantly, the Firebase database URL copied from your Firebase project's settings, and the two backend auth tokens).
Note that the backend auth tokens will have been generated for you when initializing your test data in the backend project.

Communication with the backend needs to be authenticated with a REST API token.
It is assumed that at this point you already have the backend set up with initial data which generated these.

* The `FIREBASE_DATABASE_URL` can be found in the exported app configuration from Firebase
* The `FIREBASE_ADMIN_KEY_PATH` defaults to `/app/src/config/firebase-admin-key.json` (i.e., `src/config/firebase-admin-key.json` in your project)
* Notice that the host names are `host.docker.internal` and NOT `localhost`. This is required for a container to call a localhost service on the host system.
* `DATA_CACHE_TIME_TO_LIVE_MINUTES` represents the length of time in minutes the listener will store a given user's salt and secret keys when requesting encryption values

#### Step 3: Run the listener

The project contains `Dockerfile` and  `docker-compose.yml` files to build an image and run the app as a container, either for a production-like setup or development.

To build the Docker image and run the container, running the following command at the root of the project

```shell
docker compose up 
```

More information about Docker compose can be found on the [Docker Compose page](https://docs.docker.com/compose/).

### SSL/TLS (Optional)

Settings are available in this project to allow the listener to use encrypted connections to the databases,
and when making external requests.
Enabling SSL is optional.
Note that the instructions below are for a local setup.
On a server, certificate files may be stored in different locations.

1. Copy your CA public key file (usually called `ca.pem`; generated when
   [setting up SSL in db-docker](https://gitlab.com/opalmedapps/db-docker#running-the-databases-with-encrypted-connections))
   to the `certs` folder.
2. In the `.env` file under `--- SSL Configurations ---`, enable SSL and provide the path to this file.
3. Restart your Docker container via `docker compose up` which forces the container to be recreated.

To ensure that your setup was successful, make sure the listener launches successfully, and that the database queries
print `Grabbed SQL connection ... with SSL enabled` to the logger, and complete successfully.

If external HTTP requests are intercepted by a proxy (e.g., via deep packet inspection) HTTPS requests might fail if a custom/internal certificate authority is used.
In this case, provide a certificate bundle that includes this certificate, make it available inside the container, and set the `NODE_EXTRA_CA_CERTS` environment variable.

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

### Unit tests

Unit tests for this repository are run using the Mocha test framework. Test files should be in the `src` directory
(or any of its subdirectories), and should have a name in the format `*.test.*`.

To run the tests:

```sh
npm test
```

### Using the request simulator

It is possible to simulate a request from the Opal app, for testing, by using the simulate request script. There are two way to do so:

Using the npm script `simulateRequest` which will use the default request data specified in the file `src/test/simulate-request/mock-request.js`
or
Instantiate the `SimulateRequest` class and pass the mock request as an argument `new SimulateRequest(MockRequestData);`.

Note that the mock request data need to have the same structure as `src/test/simulate-request/mock-request.js`.

You also need to specify the correct firebase `UserID` that is linked to your local development setup and database.

## Built With

* [Node](https://nodejs.org/en/) - The server-side library used

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning.
For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Authors

* **James Brace** - *Initial work*
* **David Hererra** - *Initial work*

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
