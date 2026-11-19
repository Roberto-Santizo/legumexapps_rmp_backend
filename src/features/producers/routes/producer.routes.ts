import { Router } from "express"
import { producerController } from "../controllers/producer.controller"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"
import { validar } from "../../../shared/intermediarios/validar"
import { createProducerSchema, producerQuerySchema, producerIdParamSchema, updateProducerSchema } from "../schemas/producer.schema"

const producerRoutes = Router()

producerRoutes.use(authenticate)

producerRoutes.get("/", authorize("producers:view"), validar(producerQuerySchema, "query"), producerController.index)
producerRoutes.post("/", authorize("producers:create"), validar(createProducerSchema), producerController.store)
producerRoutes.get("/:id", authorizeAny("producers:view", "producers:edit"), validar(producerIdParamSchema, "params"), producerController.show)
producerRoutes.patch("/:id", authorize("producers:edit"), validar(producerIdParamSchema, "params"), validar(updateProducerSchema), producerController.update)
producerRoutes.delete("/:id", authorize("producers:delete"), validar(producerIdParamSchema, "params"), producerController.destroy)

export default producerRoutes
