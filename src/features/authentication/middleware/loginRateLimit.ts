import type { RequestHandler } from "express"

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 100
const MAX_ORIGINS = 10000

// Per-process protection complements the persistent account lockout.
export function createLoginRateLimit(now = Date.now): RequestHandler {
    const origins = new Map<string, { count: number; expires: number }>()
    return (req, res, next) => {
        const time = now()
        for (const [key, entry] of origins) if (entry.expires <= time) origins.delete(key)
        const key = req.ip ?? req.socket.remoteAddress ?? "unknown"
        const current = origins.get(key)
        if ((!current && origins.size >= MAX_ORIGINS) || (current && current.count >= MAX_REQUESTS)) {
            res.setHeader("Retry-After", Math.max(1, Math.ceil(((current?.expires ?? time + WINDOW_MS) - time) / 1000)))
            res.status(429).json({ message: "Demasiados intentos de acceso. Intenta nuevamente más tarde." })
            return
        }
        origins.set(key, { count: (current?.count ?? 0) + 1, expires: current?.expires ?? time + WINDOW_MS })
        next()
    }
}

export const loginRateLimit = createLoginRateLimit()
