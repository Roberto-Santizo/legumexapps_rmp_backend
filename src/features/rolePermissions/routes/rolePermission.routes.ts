import { Router } from "express"
import { rolePermissionController } from "../controllers/rolePermission.controller"
import { roleIdParamSchema, syncRolePermissionsSchema } from "../schemas/rolePermission.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"

const rolePermissionRoutes = Router({ mergeParams: true })

rolePermissionRoutes.get("/permission-catalog", authorizeAny("roles:create", "roles:edit"), rolePermissionController.catalog)

rolePermissionRoutes.get(
    "/:roleId/permissions",
    authorize("roles:view"),
    validar(roleIdParamSchema, "params"),
    rolePermissionController.index
)
rolePermissionRoutes.put(
    "/:roleId/permissions",
    authorize("roles:edit"),
    validar(roleIdParamSchema, "params"),
    validar(syncRolePermissionsSchema),
    rolePermissionController.sync
)

export default rolePermissionRoutes
