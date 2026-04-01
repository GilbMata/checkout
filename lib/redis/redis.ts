import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
    retryStrategy: () => null, // ❌ no reintentar infinito
});

redis.on("error", (err) => {
    console.error("Redis error:", err.message);
});