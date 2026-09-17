module.exports = {
  apps: [
    {
      name: "nhiquela-backend",
      script: "./index.js",
      instances: 1, // Podes alterar para "max" para usar todos os núcleos (Cluster Mode)
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
};
