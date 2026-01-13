# Stealth Analytics Dashboard

A comprehensive employee monitoring and analytics dashboard built with **React**, **Vite**, and **Express**, using **PostgreSQL** for data persistence.

## Features
- **Real-time Analytics**: View productive, unproductive, and idle time.
- **User Management**: Add, update, and manage dashboard users.
- **Shift Tracking**: Monitor user activity across different shifts.
- **Top Apps & Domains**: Visualize most used applications and websites.
- **Interactive Charts**: Trends, KPIs, and efficiency breakdowns.

## Tech Stack
- **Frontend**: React (Vite), Recharts, Lucide React, Tailwind CSS (via Index/App CSS).
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL (Neon/Supabase).
- **Deployment**: Vercel (Monorepo setup).

## Run Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory (do not commit this file):
   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=your_db_host
   DB_PORT=5432
   DB_NAME=postgres
   PORT=3001
   ```

3. **Start Development Server**
   Runs both frontend and backend concurrently.
   ```bash
   npm run dev
   # App: http://localhost:3000
   # API: http://localhost:3000/api
   ```

   *To run the server only:* `npm run server`

## Deployment (Vercel)

This project is configured for seamless deployment on Vercel.

1. **Push** this repository to GitHub.
2. **Import** the project in Vercel.
3. **Environment Variables**: Add the `DB_*` variables from your local `.env` to Vercel's settings.
4. **Deploy**: Vercel automatically detects Vite and the `vercel.json` configuration handles the API routes.

##  Project Structure
- **/api**: Express backend and database queries.
- **/src**: React frontend source (implied root structure).
- **vercel.json**: Routing configuration for serverless deployment.
