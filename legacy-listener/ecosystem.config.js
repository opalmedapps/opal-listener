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
