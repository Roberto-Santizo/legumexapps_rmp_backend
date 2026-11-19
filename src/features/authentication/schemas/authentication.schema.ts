import z from "zod"

export const loginSchema = z.object({
    username: z.string().trim().min(1).max(40),
    password: z.string().min(1).max(100),
})

export type LoginInput = z.infer<typeof loginSchema>
