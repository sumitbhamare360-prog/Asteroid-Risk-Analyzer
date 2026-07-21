# AstraGuard Asteroid Risk Analyzer Backend

A robust Node.js and Express backend service designed for analyzing and processing asteroid risk data.

## Prerequisites

Ensure you have the following installed on your system:
- Node.js (v14.0.0 or higher recommended)
- PostgreSQL

## Installation

1. Clone the repository to your local machine.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   - Copy the example `.env.example` file to a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open the `.env` file and update the variables (e.g., `DB_PASSWORD`, `NASA_API_KEY`) with your specific configuration. The defaults for database connection are set for a standard local PostgreSQL installation.

## Available Scripts

In the project directory, you can run the following commands:

### `npm start`
Starts the production server using Node.js.

### `npm run dev`
Starts the development server using `nodemon`. The server will automatically restart if you make edits to the source files.

### `npm run db:init`
Initializes the database schema and structure required for the application.

### `npm run db:sync`
Synchronizes or fetches new asteroid risk data to populate the PostgreSQL database.

## Technologies Used

- **Node.js**
- **Express.js**
- **PostgreSQL** (`pg`)
- **dotenv**
- **cors**

## Project Structure

- `src/server.js`: Main application entry point.
- `src/database/init.js`: Script for database initialization.
- `src/services/syncService.js`: Script containing data synchronization logic.

## License

ISC
