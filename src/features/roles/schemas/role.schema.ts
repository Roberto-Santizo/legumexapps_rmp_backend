import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { permissionIdsSchema } from "../../rolePermissions/schemas/rolePermission.schema"

export const createRoleSchema = z.object({
    name: z.string().trim().min(1).max(100),
    permissionIds: permissionIdsSchema.optional(),
})

export const roleIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateRoleSchema = createRoleSchema.partial()

export const roleQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional()
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type RoleQuery = z.infer<typeof roleQuerySchema>
