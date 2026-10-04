# Backend deployment

Configure the hosting service to use `backend` as its root directory, run `npm install` to install dependencies, and use `npm start` to launch the API. The admin API routes are part of this service and do not need a separate process.

Set these environment variables in the hosting dashboard:

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: long, private signing secret
- `GOOGLE_CLIENT_ID`: required for Google sign-in
- `GOOGLE_CLIENT_SECRET`: required for teacher Google Meet OAuth
- `GOOGLE_REDIRECT_URI`: exact callback URI, ending in `/api/auth/google/meet/callback`
- `GOOGLE_MEET_ENABLED`: set to `true` to enable Google Meet scheduling and teacher account connection
- `FRONTEND_URL`: public frontend origin used after OAuth completes
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: required for Razorpay payments
- `RAZORPAY_WEBHOOK_SECRET`: dedicated secret for the signed `/api/payment/webhook` endpoint
- `RAZORPAY_WEBHOOK_SECRET`: required for signed Razorpay webhook settlement
- `PORT`: optional; supplied by most hosting platforms
- `NODE_ENV`: set to `production` to enable production startup validation
- `REDIS_URL`: shared cache, presence, and distributed rate-limit store
- `REDIS_REQUIRED`: set to `true` to make readiness fail when Redis is down; multi-worker mode requires Redis regardless
- `KAFKA_BROKERS`: optional Kafka broker list for best-effort event publishing
- `WEB_CONCURRENCY`: worker count per instance; values above `1` require `REDIS_URL`
- `MONGO_MAX_POOL_SIZE` and `MONGO_MIN_POOL_SIZE`: Mongo connection limits for each worker

For local development, copy `.env.example` to `.env` inside `backend` and set real values. Do not commit `.env`; the repository `.gitignore` excludes environment files and uploaded files. The `backend/uploads` directory uses local disk, which may be ephemeral on hosted platforms. Use persistent storage or object storage if uploaded files must survive redeploys.

## Google Meet OAuth deployment

Set `NODE_ENV=production`, a strong `JWT_SECRET` of at least 32 characters, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MEET_ENABLED=true`, `FRONTEND_URL`, and `GOOGLE_REDIRECT_URI`. In Google Cloud Console, enable the Google Calendar API and Google Meet REST API, configure the OAuth consent screen, add the production domain and any required test users, and register the exact `GOOGLE_REDIRECT_URI` as an authorized redirect URI. The deployed callback must use HTTPS and the path `/api/auth/google/meet/callback`; use the same URI in Google Cloud Console and the backend environment. Service-account credentials alone do not connect a teacher's Google account.

Teachers connect their own Google account from Live Studio. The callback validates Google's verified email, stores the teacher-scoped offline refresh grant, and redirects to `FRONTEND_URL`. A repeated authorization reuses an existing refresh token only when the newly verified email matches the already connected Google account. Never place client secrets or refresh tokens in frontend variables or logs. Google OAuth verification/Workspace policy and account eligibility are controlled by Google's project and Workspace settings; a successful backend deployment cannot override those requirements.

Attendance is an authenticated UniSkill check-in, not a claim that Google Meet exposed the participant's email. Students must launch the Meet link from UniSkill while the teacher has started the class; attendance duration ends when the Meet tab closes or the teacher ends class. Google Meet participant records expose Google user resource IDs, which this LMS cannot safely map to student accounts with the configured scopes alone.

While a teacher has Live Studio or the course room open, the LMS checks live Google Meet conferences every 15 seconds. If Meet reports an ended conference, the backend marks the LMS class ended and finalizes open attendance sessions. The teacher's LMS end control calls Meet's `endActiveConference` API first, which ends the call for all participants; ending the call directly in Meet is reflected after the next successful status check. Google Meet itself disconnects participants when its host ends the conference for everyone.

## Razorpay cart checkout

Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a distinct `RAZORPAY_WEBHOOK_SECRET` in the backend environment. Register `https://<backend-domain>/api/payment/webhook` in Razorpay and enable the `payment.captured` event. The webhook verifies the exact raw request body with the webhook secret; it does not fall back to the API key secret. Never expose the key secret or webhook secret through `VITE_*` variables.

The cart quote and order are recalculated by the backend. Course flash discounts apply first, then that course's coupon, then the highest configured cart tier based on distinct paid courses. Admins configure cart tiers from Admin > Courses; these tiers are separate from each course's flash discount. Every Razorpay order stores its course/plan/discount snapshot, and both checkout verification and webhooks settle from that snapshot idempotently.

In the Razorpay dashboard, register `https://<backend-domain>/api/payment/webhook`, configure the same dedicated webhook secret as `RAZORPAY_WEBHOOK_SECRET`, and subscribe to `payment.captured`. The checkout callback and signed webhook are both safe to retry; a student can reopen the Course Cart to check a pending order before starting another payment.

## Scaling and health checks

The API exposes `/api/health/live` for process liveness and `/api/health/ready` for dependency readiness. Configure the load balancer readiness probe to use the latter and enable connection draining during deployments. For multiple workers or instances, configure Redis as a shared service, set a conservative `WEB_CONCURRENCY`, and place the instances behind the hosting platform's load balancer. Plan Mongo connections as `worker count × MONGO_MAX_POOL_SIZE` within the database connection limit. The in-memory fallback is per process and is not suitable for coordinating cache, rate limits, or live presence across workers.

Live attendance is persisted synchronously to MongoDB as its source of truth. Kafka is an optional, best-effort downstream event publisher; it does not gate attendance writes or reports. Payment and audit topics are published for external consumers. A single local process cannot guarantee thousands of concurrent requests: capacity depends on the deployed load balancer, Redis, MongoDB, Kafka, and browser WebRTC capacity.

Each clustered worker creates its own bounded Mongo pool. Keep `WEB_CONCURRENCY × MONGO_MAX_POOL_SIZE` within MongoDB's connection limit. Deploy external consumers for payment/audit topics if those streams need processing.

## Native live classes

Live classes use UniSkill WebRTC signaling through `/api/live-stream/*`. The backend authenticates teachers and enrolled students, tracks active viewers, exchanges offers, answers, and ICE candidates, and leaves media encrypted peer-to-peer between browsers. For multi-worker or multi-instance deployments, keep live classes sticky to one backend worker or promote the signaling state into Redis.
