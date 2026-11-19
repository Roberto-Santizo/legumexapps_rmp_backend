import { Router } from "express"
import { restrictFieldReceipt } from "../../raw-material-receptions/middleware/receptionVisibility"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"
import { validar } from "../../../shared/intermediarios/validar"
import { rmReceptionIdParamSchema } from "../../raw-material-receptions/schemas/rmReception.schema"
import { qualityEvaluationSchema, editQualitySchema } from "../schemas/qualityEvaluation.schema"
import { qualityEvaluationController } from "../controllers/qualityEvaluation.controller"

const routes = Router()
routes.use(authenticate)
routes.use("/:id", validar(rmReceptionIdParamSchema, "params"), restrictFieldReceipt)
routes.get("/:id", authorize("qualityEvaluations:view"), validar(rmReceptionIdParamSchema, "params"), qualityEvaluationController.show)
routes.post("/:id", authorize("qualityEvaluations:create"), validar(rmReceptionIdParamSchema, "params"), validar(qualityEvaluationSchema), qualityEvaluationController.store)
routes.get("/:id/edit", authorizeAny("qualityEvaluations:edit", "rawMaterialReceptions:overrideEdit"), validar(rmReceptionIdParamSchema, "params"), qualityEvaluationController.showEdit)
routes.patch("/:id", authorizeAny("qualityEvaluations:edit", "rawMaterialReceptions:overrideEdit"), validar(rmReceptionIdParamSchema, "params"), validar(editQualitySchema), qualityEvaluationController.update)
export default routes
