<!--
SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

The Firebase rules for the Realtime Database used by the app and listener are version-controlled in this project.
Rules and configuration files can be found in the `firebase` directory.

For information on the automatic deployment of these rules via GitHub Actions, see {@tutorial ci-cd-workflows}.

To manually deploy Firebase rules without using the pipeline, the Firebase CLI can be used.
Note that the CLI is installed during `npm install` (see `firebase-tools` in `package.json`). To deploy rules for any
environment, execute the following steps:

1. Run `firebase login` and follow the instructions on the terminal. To publish firebase rules, you must log into
   an account that has access to the right project.

2. Change directory into the folder of the target environment. For example, `cd firebase/dev`.

3. Temporarily copy the file `../database.rules.json` into this directory (you can delete this copy when you're done).

4. Run `firebase deploy --only database` to deploy the database rules from the directory you're currently in.
