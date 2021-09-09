# *** MOVED TO GITLAB ***


# opal-listener
This is the Opal app's backend listener that sits between Firebase and OpalDB.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.
- **NOTE:** These instructions are incomplete, and only
 concerned themselves with running the backend quickly,
  and assuming that all the dependencies and config files
  are already ready and configured.
  There is a more complete
tutorial on how to get Opal-backend development environment at
[Opal Backend Tutorial](https://github.com/Opal-teaching/opal-backend-wiki.git)

### Prerequisites

There are only three requirements needed to run the backend, and the second requirement is only needed to run in a live setting with actual clinical data.

1) Install [Node.js](https://nodejs.org/en/download/)
2) (**Only required if wanting to access live data**) Have access to clinical computer in the MedPhys department

**Note:** If you are wanting to test the backend without real clinical data then you will need to configure your own mySQL DB with test data. That is out of the scope of this README and will require aid from a existing Opal developer.

### Installing

If running in a testing environment, you will first need to configure a test DB. This will need to be done with an Opal developer who access to OpalDB and can give you a test file to create a testing DB.

Second thing that needs to be done is make sure all the references in /listener/config.json are correct. Currently they are pointing to locations on the Opal server.

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

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details


