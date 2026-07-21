require('dotenv').config();

const requiredEnvVars = [
  'DB_USER',
  'DB_HOST',
  'DB_NAME',
  'DB_PASSWORD',
  'DB_PORT',
  'PORT',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

module.exports = {
  db: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
  },
  server: {
    port: parseInt(process.env.PORT, 10),
  },
  nasa: {
    apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
  },
};
