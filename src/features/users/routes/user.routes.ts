import { Router } from "express"
import { userController } from "../controllers/user.controller"
import { createUserSchema, userIdParamSchema, updateUserSchema, updateUserStatusSchema, userQuerySchema } from "../schemas/user.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"

const userRoutes = Router()

userRoutes.use(authenticate)

userRoutes.get("/", authorize("users:view"), validar(userQuerySchema, "query"), userController.index)
userRoutes.get("/:id", authorize("users:view"), validar(userIdParamSchema, "params"), userController.show)
userRoutes.post("/", authorize("users:create"), validar(createUserSchema), userController.store)
userRoutes.patch("/:id", authorize("users:edit"), validar(userIdParamSchema, "params"), validar(updateUserSchema), userController.update)
userRoutes.patch("/:id/status", authorize("users:edit"), validar(userIdParamSchema, "params"), validar(updateUserStatusSchema), userController.updateStatus)
userRoutes.delete("/:id", authorize("users:delete"), validar(userIdParamSchema, "params"), userController.destroy)

export default userRoutes
