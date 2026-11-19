import { Router } from "express"
import { varietyProductController } from "../controllers/varietyProduct.controller"
import {
    createVarietyProductSchema,
    varietyProductIdParamSchema,
    updateVarietyProductSchema,
    varietyProductQuerySchema
} from "../schemas/varietyProduct.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"

const varietyProductRoutes = Router()

varietyProductRoutes.use(authenticate)

varietyProductRoutes.get(
    "/",
    authorize("products:view"),
    validar(varietyProductQuerySchema, "query"),
    varietyProductController.index
)
varietyProductRoutes.get(
    "/:id",
    authorize("products:view"),
    validar(varietyProductIdParamSchema, "params"),
    varietyProductController.show
)
varietyProductRoutes.post(
    "/",
    authorize("products:create"),
    validar(createVarietyProductSchema),
    varietyProductController.store
)
varietyProductRoutes.patch(
    "/:id",
    authorize("products:edit"),
    validar(varietyProductIdParamSchema, "params"),
    validar(updateVarietyProductSchema),
    varietyProductController.update
)
varietyProductRoutes.delete(
    "/:id",
    authorize("products:delete"),
    validar(varietyProductIdParamSchema, "params"),
    varietyProductController.destroy
)

export default varietyProductRoutes
