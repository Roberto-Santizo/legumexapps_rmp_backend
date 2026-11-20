import { Router } from "express"
import { productController } from "../controllers/product.controller"
import { createDefectCatalogSchema, updateDefectCatalogSchema, defectCatalogQuerySchema, createProductSchema, productIdParamSchema, updateProductSchema, productQuerySchema, updateProductStatusSchema } from "../schemas/product.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"

const productRoutes = Router()

productRoutes.use(authenticate)

productRoutes.get("/defect-catalog", authorizeAny("products:view", "products:create", "products:edit", "products:manageDefects"), validar(defectCatalogQuerySchema, "query"), productController.defectCatalog)
productRoutes.post("/defect-catalog", authorize("products:manageDefects"), validar(createDefectCatalogSchema), productController.createDefect)
productRoutes.patch("/defect-catalog/:id", authorize("products:manageDefects"), validar(productIdParamSchema, "params"), validar(updateDefectCatalogSchema), productController.updateDefect)

productRoutes.get("/", authorize("products:view"), validar(productQuerySchema, "query"), productController.index)
productRoutes.get("/:id", authorize("products:view"), validar(productIdParamSchema, "params"), productController.show)
productRoutes.post("/", authorize("products:create"), validar(createProductSchema), productController.store)
productRoutes.patch("/:id/status", authorize("products:edit"), validar(productIdParamSchema, "params"), validar(updateProductStatusSchema), productController.updateStatus)
productRoutes.patch(
    "/:id",
    authorize("products:edit"),
    validar(productIdParamSchema, "params"),
    validar(updateProductSchema),
    productController.update
)
productRoutes.delete("/:id", authorize("products:delete"), validar(productIdParamSchema, "params"), productController.destroy)

export default productRoutes
