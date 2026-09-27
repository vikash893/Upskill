# Backend deployment

Configure the hosting service to use `backend` as its root directory, run `npm install` to install dependencies, and use `npm start` to launch the API. The admin API routes are part of this service and do not need a separate process.

Set these environment variables in the hosting dashboard:

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: long, private signing secret
- `GOOGLE_CLIENT_ID`: required for Google sign-in
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: required for Razorpay payments
- `PORT`: optional; supplied by most hosting platforms

For local development, copy `.env.example` to `.env` inside `backend` and set real values. Do not commit `.env`; the repository `.gitignore` excludes environment files and uploaded files. The `backend/uploads` directory uses local disk, which may be ephemeral on hosted platforms. Use persistent storage or object storage if uploaded files must survive redeploys.
