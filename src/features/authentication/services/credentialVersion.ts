import { createHmac, timingSafeEqual } from "node:crypto"

// Uses the existing password hash: changing a password invalidates issued tokens.
export function credentialVersion(passwordHash: string, secret: string): string {
    return createHmac("sha256", secret).update(passwordHash).digest("hex")
}

export function matchesCredentialVersion(version: unknown, passwordHash: string, secret: string): boolean {
    if (typeof version !== "string" || !/^[a-f0-9]{64}$/.test(version)) return false
    return timingSafeEqual(Buffer.from(version, "hex"), Buffer.from(credentialVersion(passwordHash, secret), "hex"))
}
