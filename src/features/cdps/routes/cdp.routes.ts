import { Router } from "express"
import { cdpController } from "../controllers/cdp.controller"
import { createCdpSchema, cdpIdParamSchema, updateCdpSchema, cdpQuerySchema } from "../schemas/cdp.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"

const cdpRoutes = Router()

cdpRoutes.use(authenticate)

cdpRoutes.get("/", authorize("cdps:view"), validar(cdpQuerySchema, "query"), cdpController.index)
cdpRoutes.get("/:id", authorize("cdps:view"), validar(cdpIdParamSchema, "params"), cdpController.show)
cdpRoutes.post("/", authorize("cdps:create"), validar(createCdpSchema), cdpController.store)
cdpRoutes.patch(
    "/:id",
    authorize("cdps:edit"),
    validar(cdpIdParamSchema, "params"),
    validar(updateCdpSchema),
    cdpController.update
)
cdpRoutes.delete("/:id", authorize("cdps:delete"), validar(cdpIdParamSchema, "params"), cdpController.destroy)

export default cdpRoutes
