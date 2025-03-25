<!--
SPDX-FileCopyrightText: Copyright 2025 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

This project uses GitHub Actions to manage various CI/CD tasks.

### Deploy Firebase Rules

Deployment of [Firebase Realtime Database security rules](https://firebase.google.com/docs/database/security)
has been configured in `.github/workflows/firebase-rules.yml` in this repository.
For more information on our use of Firebase rules, see {@tutorial firebase-rules}.

There are two ways to deploy the Firebase rules:

#### 1. Automatically (Dev)

Any commit on the main branch that modifies the Firebase rules file will automatically trigger a deployment in the dev environment.
Since other Opal components are also automatically deployed to Dev,
this allows changes to the Firebase rules to be immediately available in that environment.

#### 2. Manually (any environment)

Rules can be deployed manually using the GitHub Actions interface.
In environments other than Dev, this facilitates timing the deployment of new rules concurrently with the deployment of the app or listener.

To deploy rules manually, go to the [GitHub Actions Tab](https://github.com/opalmedapps/opal-listener/actions),
select `Firebase Rules` in the left sidebar, and next to `This workflow has a workflow_dispatch event trigger`,
select `Run workflow`.
This will open a panel in which to provide inputs, such as which environment to use.

#### Configuration: Service Accounts

Service accounts were created to give the pipeline the required permissions to publish Firebase rules.

To create a new service account, follow these steps:

 1. Navigate to https://console.cloud.google.com/iam-admin/serviceaccounts
    and select the Firebase project for which you'd like to create a service account.
 2. Select `Create service account`.
 3. Suggested inputs:
    - Service account name: GitHub CI/CD - opal-listener
    - Service account ID: `<automatically generated>`
    - Service account description: Manually created service account that allows automatic deployment of Realtime Database rules to Firebase.
 4. Grant the account the following permissions:
    - Firebase Realtime Database Admin
    - Firebase Rules Admin

If you'd like to view or edit permissions for a service account after it's been created,
you can do so at https://console.cloud.google.com/iam-admin/iam (make sure to select the right project).

Once created, service accounts can be made accessible to the workflow by adding them as
[Repository Secrets for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository),
and naming them in the format expected by the workflow, for example `DEV_GOOGLE_APPLICATION_CREDENTIALS`.
