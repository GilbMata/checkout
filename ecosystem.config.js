module.exports = {
    apps: [
        {
            name: "next-app",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3000",
            instances: "max", // usa todos los cores
            exec_mode: "cluster", // necesario para zero downtime
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "dev",
            },
        },
    ],
}