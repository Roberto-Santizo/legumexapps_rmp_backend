import { Router } from "express"
import { transportController } from "../controllers/transport.controller"
import {
    listCarriersQuerySchema,
    listPlatesQuerySchema,
    createCarrierSchema,
    carrierIdParamSchema,
    updateCarrierSchema,
    updateCarrierStatusSchema,
    createPlateSchema,
    plateIdParamSchema,
    updatePlateSchema
} from "../schemas/transport.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"

const carrierRoutes = Router()
carrierRoutes.use(authenticate)
carrierRoutes.get(
    "/",
    authorize("transport:view"),
    validar(listCarriersQuerySchema, "query"),
    transportController.indexCarriers
)
carrierRoutes.get(
    "/:id",
    authorize("transport:view"),
    validar(carrierIdParamSchema, "params"),
    transportController.showCarrier
)
carrierRoutes.post("/", authorize("transport:create"), validar(createCarrierSchema), transportController.storeCarrier)
carrierRoutes.patch("/:id/status", authorize("transport:edit"), validar(carrierIdParamSchema, "params"), validar(updateCarrierStatusSchema), transportController.updateCarrierStatus)
carrierRoutes.patch(
    "/:id",
    authorize("transport:edit"),
    validar(carrierIdParamSchema, "params"),
    validar(updateCarrierSchema),
    transportController.updateCarrier
)
carrierRoutes.delete(
    "/:id",
    authorize("transport:delete"),
    validar(carrierIdParamSchema, "params"),
    transportController.destroyCarrier
)

const plateRoutes = Router()
plateRoutes.use(authenticate)
plateRoutes.get("/", authorize("transport:view"), validar(listPlatesQuerySchema, "query"), transportController.indexPlates)
plateRoutes.get("/:id", authorize("transport:view"), validar(plateIdParamSchema, "params"), transportController.showPlate)
plateRoutes.post("/", authorize("transport:create"), validar(createPlateSchema), transportController.storePlate)
plateRoutes.patch(
    "/:id",
    authorize("transport:edit"),
    validar(plateIdParamSchema, "params"),
    validar(updatePlateSchema),
    transportController.updatePlate
)
plateRoutes.delete(
    "/:id",
    authorize("transport:delete"),
    validar(plateIdParamSchema, "params"),
    transportController.destroyPlate
)

export { carrierRoutes, plateRoutes }
