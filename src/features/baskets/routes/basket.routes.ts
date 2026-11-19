import { Router } from "express"
import { basketController } from "../controllers/basket.controller"
import { createBasketSchema, basketIdParamSchema, updateBasketSchema, basketQuerySchema } from "../schemas/basket.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"

const basketRoutes = Router()

basketRoutes.use(authenticate)

basketRoutes.get("/", authorize("baskets:view"), validar(basketQuerySchema, "query"), basketController.index)
basketRoutes.get("/:id", authorize("baskets:view"), validar(basketIdParamSchema, "params"), basketController.show)
basketRoutes.post("/", authorize("baskets:create"), validar(createBasketSchema), basketController.store)
basketRoutes.patch(
    "/:id",
    authorize("baskets:edit"),
    validar(basketIdParamSchema, "params"),
    validar(updateBasketSchema),
    basketController.update
)
basketRoutes.delete("/:id", authorize("baskets:delete"), validar(basketIdParamSchema, "params"), basketController.destroy)

export default basketRoutes
