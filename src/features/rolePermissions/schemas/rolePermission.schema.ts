import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { SYSTEM_PERMISSION_NAMES } from "../../permissions/catalog/systemPermissions"

export const permissionIdsSchema = z.array(z.number().int().positive()).max(SYSTEM_PERMISSION_NAMES.length)

export const roleIdParamSchema = z.object({
    roleId: identifierParamSchema
})

export const syncRolePermissionsSchema = z.object({
    permissionIds: permissionIdsSchema
})

export type SyncRolePermissionsInput = z.infer<typeof syncRolePermissionsSchema>
