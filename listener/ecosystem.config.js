// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    apps : [
        {
            name: "opal-listener",
            script: "legacy-server.js",
            watch: true,
            env: {
                "NODE_ENV": "development"
            },
            env_production: {
                "NODE_ENV": "production",
            }
        }
    ]
};
