const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // connect to default DB to issue CREATE DATABASE
});

async function createDb() {
  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'astraguard'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE astraguard');
      console.log('Database "astraguard" created successfully.');
    } else {
      console.log('Database "astraguard" already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect to PostgreSQL or create database. Make sure your password in .env is correct.', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
