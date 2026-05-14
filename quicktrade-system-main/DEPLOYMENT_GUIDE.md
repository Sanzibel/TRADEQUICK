# QuickTrade Deployment Guide

This guide outlines the steps to deploy the QuickTrade System to a production environment like AWS or Heroku.

## 1. Backend Deployment (Node.js/Express)

### Heroku
1. Install Heroku CLI.
2. Login: `heroku login`.
3. Create app: `heroku create quicktrade-backend`.
4. Set Environment Variables:
   ```bash
   heroku config:set DB_USER=sa
   heroku config:set DB_PASSWORD=your_password
   heroku config:set DB_SERVER=your_db_url
   ```
5. Push code: `git push heroku main`.

### AWS (Elastic Beanstalk)
1. Create a new application in AWS Elastic Beanstalk.
2. Zip the `backend/` folder (excluding `node_modules`).
3. Upload and deploy the zip file.
4. Configure environment properties in the AWS console.

## 2. Database Deployment (SQL Server)

- **Azure SQL Database** or **AWS RDS (SQL Server)** is recommended.
- Run the [database.sql](./backend/database.sql) script against your production database instance to set up the schema.
- Ensure the firewall allows connections from your backend server's IP.

## 3. Frontend Deployment (Vite/React)

### Vercel / Netlify (Recommended)
1. Connect your GitHub repository.
2. Set the root directory to `frontend/`.
3. Set the build command to `npm run build`.
4. Set the output directory to `dist/`.
5. Add the `VITE_API_URL` environment variable pointing to your deployed backend.

### Heroku (Static Site)
1. Navigate to the frontend folder.
2. Build the project: `npm run build`.
3. Deploy the `dist/` folder using a static site buildpack.

## 4. Final Testing
- Once both are deployed, verify that the frontend can successfully call the backend API endpoints.
- Check that the Black & Gold theme loads correctly on mobile devices.
- Verify that CSV exports work on the deployed URL.
