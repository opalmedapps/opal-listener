The Firebase rules for the Realtime Database used by the app and listener are version-controlled in this project.
Rules for each environment can be found in the `firebase` directory.

With the exception of `prod`, rules can be deployed by the CI/CD pipeline whenever a `database.rules.json`
file is modified and the changes are pushed to the default branch.
This deployment is executed automatically for changes to `dev`, and manually for all other environments.
Each deployment job is connected to a [GitLab protected environment](https://docs.gitlab.com/ee/ci/environments/protected_environments.html),
which allows user permissions to be set to control deployment.

To deploy the `prod` rules, or to manually deploy rules for another environment without using the pipeline, the Firebase CLI can be used.
Note that the CLI is installed during `npm install` (see `firebase-tools` in `package.json`). To deploy rules for an
environment, execute the following steps:

1. Run `firebase login` and follow the instructions on the terminal. To publish firebase rules, you must log into
   an account that has access to the right project.

2. Change directory into the folder of the target environment. For example, `cd firebase/dev`.

3. Run `firebase deploy --only database` to deploy the database rules from the directory you're currently in.
