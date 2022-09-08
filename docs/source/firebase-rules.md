The Firebase rules for the Realtime Database used by the app and listener are version-controlled in this project.
Rules for each environment can be found in the `firebase` directory.

With the exception of `prod`, rules are automatically deployed by the CI/CD pipeline whenever a `database.rules.json`
file is modified and the changes are pushed to the right branch for its environment
(for example, the `staging` branch for the `staging/database.rules.json` rules; see `.gitlab-ci.yml` for details).

To deploy the `prod` rules, or to manually deploy rules for another environment, the Firebase CLI can be used.
Note that the CLI is installed during `npm install` (see `firebase-tools` in `package.json`). To deploy rules for an
environment, execute the following steps:

1. Run `firebase login` and follow the instructions on the terminal. To publish firebase rules, you must log into
   an account that has access to the right project.

2. Change directory into the folder of the target environment. For example, `cd firebase/dev`.

3. Run `firebase deploy --only database` to deploy the database rules from the directory you're currently in.
