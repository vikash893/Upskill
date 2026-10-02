# Backend deployment

Configure the hosting service to use `backend` as its root directory, run `npm install` to install dependencies, and use `npm start` to launch the API. The admin API routes are part of this service and do not need a separate process.

Set these environment variables in the hosting dashboard:

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: long, private signing secret
- `GOOGLE_CLIENT_ID`: required for Google sign-in
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: required for Razorpay payments
- `PORT`: optional; supplied by most hosting platforms
- `REDIS_URL`: shared cache, presence, and distributed rate-limit store
- `REDIS_REQUIRED`: set to `true` to make readiness fail when Redis is down; multi-worker mode requires Redis regardless
- `KAFKA_BROKERS`: optional Kafka broker list for event publishing and attendance processing
- `WEB_CONCURRENCY`: worker count per instance; values above `1` require `REDIS_URL`
- `MONGO_MAX_POOL_SIZE` and `MONGO_MIN_POOL_SIZE`: Mongo connection limits for each worker

For local development, copy `.env.example` to `.env` inside `backend` and set real values. Do not commit `.env`; the repository `.gitignore` excludes environment files and uploaded files. The `backend/uploads` directory uses local disk, which may be ephemeral on hosted platforms. Use persistent storage or object storage if uploaded files must survive redeploys.

## Scaling and health checks

The API exposes `/api/health/live` for process liveness and `/api/health/ready` for dependency readiness. Configure the load balancer readiness probe to use the latter and enable connection draining during deployments. For multiple workers or instances, configure Redis as a shared service, set a conservative `WEB_CONCURRENCY`, and place the instances behind the hosting platform's load balancer. Plan Mongo connections as `worker count × MONGO_MAX_POOL_SIZE` within the database connection limit. The in-memory fallback is per process and is not suitable for coordinating cache, rate limits, or live presence across workers.

Live attendance is persisted directly to MongoDB when Kafka is unavailable. When Kafka is enabled, the in-process consumer processes the attendance topic; payment and audit topics are published for external consumers. A single local process cannot guarantee thousands of concurrent requests: capacity depends on the deployed load balancer, Redis, MongoDB, Kafka, and Jitsi service limits.

Each clustered worker creates its own bounded Mongo pool and Kafka consumer in the same consumer group. Keep `WEB_CONCURRENCY × MONGO_MAX_POOL_SIZE` within MongoDB's connection limit. The built-in consumer only handles attendance; deploy separate consumers for payment/audit topics if those streams need processing.

## Guest live classes

The frontend accepts `VITE_JITSI_DOMAIN` (defaults to `meet.jit.si`) and disables optional prejoin/welcome screens. Jitsi itself controls moderator authentication. Public `meet.jit.si` can require sign-in for room creators, so a guaranteed login-free teacher experience requires a guest-enabled Jitsi deployment/domain; client query parameters cannot override host authentication policy.
