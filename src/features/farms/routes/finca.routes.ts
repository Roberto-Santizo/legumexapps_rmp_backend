import { Router } from "express"
import { fincaController } from "../controllers/finca.controller"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"
import { validar } from "../../../shared/intermediarios/validar"
import { createFincaSchema, fincaQuerySchema, fincaIdParamSchema, updateFincaSchema } from "../schemas/finca.schema"

const fincaRoutes = Router()

fincaRoutes.use(authenticate)

fincaRoutes.get("/", authorize("farms:view"), validar(fincaQuerySchema, "query"), fincaController.index)
fincaRoutes.post("/", authorize("farms:create"), validar(createFincaSchema), fincaController.store)
fincaRoutes.get("/:id", authorizeAny("farms:view", "farms:edit"), validar(fincaIdParamSchema, "params"), fincaController.show)
fincaRoutes.patch("/:id", authorize("farms:edit"), validar(fincaIdParamSchema, "params"), validar(updateFincaSchema), fincaController.update)
fincaRoutes.delete("/:id", authorize("farms:delete"), validar(fincaIdParamSchema, "params"), fincaController.destroy)

export default fincaRoutes
