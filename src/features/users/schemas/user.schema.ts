import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const createUserSchema = z.object({
    name: z.string().trim().min(1).max(100),
    username: z.string().trim().min(3).max(40),
    password: z.string().min(8).max(100),
    roleId: z.coerce.number().int().positive(),
    plantId: z.number().int().positive().nullable().optional(),
    representedCarrierId: z.number().int().positive().nullable().optional(),
})

export const userIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateUserSchema = createUserSchema.partial()

export const userQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional()
})

export const updateUserStatusSchema = z.object({
    activo: z.boolean()
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserQuery = z.infer<typeof userQuerySchema>
