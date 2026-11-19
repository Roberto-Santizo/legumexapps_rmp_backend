import { Router } from "express"
import { roleController } from "../controllers/role.controller"
import { createRoleSchema, roleIdParamSchema, updateRoleSchema, roleQuerySchema } from "../schemas/role.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import rolePermissionRoutes from "../../rolePermissions/routes/rolePermission.routes"
import { authorize } from "../../../shared/intermediarios/authorize"

const roleRoutes = Router()

roleRoutes.use(authenticate)
// El catálogo estático debe resolverse antes del parámetro /:id.
roleRoutes.use(rolePermissionRoutes)

roleRoutes.get("/", authorize("roles:view"), validar(roleQuerySchema, "query"), roleController.index)
roleRoutes.get("/:id", authorize("roles:view"), validar(roleIdParamSchema, "params"), roleController.show)
roleRoutes.post("/", authorize("roles:create"), validar(createRoleSchema), roleController.store)
roleRoutes.patch("/:id", authorize("roles:edit"), validar(roleIdParamSchema, "params"), validar(updateRoleSchema), roleController.update)
roleRoutes.delete("/:id", authorize("roles:delete"), validar(roleIdParamSchema, "params"), roleController.destroy)

export default roleRoutes
