import { Router } from "express"
import { restrictFieldReceipt, restrictCarrierPayload } from "../middleware/receptionVisibility"
import { rmReceptionController } from "../controllers/rmReception.controller"
import {
    createRmReceptionSchema,
    rmReceptionQuerySchema,
    receptionDocumentsQuerySchema,
    rmReceptionIdParamSchema,
    completeReceptionSchema,
    assignGrnSchema,
    editFieldSchema,
    editReceptionSchema,
} from "../schemas/rmReception.schema"
import { validar } from "../../../shared/intermediarios/validar"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize, authorizeAny } from "../../../shared/intermediarios/authorize"

const rmReceptionRoutes = Router()

rmReceptionRoutes.use(authenticate)
rmReceptionRoutes.get("/documents", authorize("rawMaterialReceptions:downloadDocuments"), validar(receptionDocumentsQuerySchema, "query"), rmReceptionController.documents)
rmReceptionRoutes.get("/documents/producers", authorize("rawMaterialReceptions:downloadDocuments"), rmReceptionController.downloadProducers)
rmReceptionRoutes.get("/documents/search", authorize("rawMaterialReceptions:downloadDocuments"), validar(receptionDocumentsQuerySchema, "query"), rmReceptionController.searchDocuments)
rmReceptionRoutes.get("/:id/download-document", authorize("rawMaterialReceptions:downloadDocuments"), validar(rmReceptionIdParamSchema, "params"), restrictFieldReceipt, rmReceptionController.document)
rmReceptionRoutes.use("/:id", validar(rmReceptionIdParamSchema, "params"), restrictFieldReceipt)
rmReceptionRoutes.get("/:id/document", authorize("rawMaterialReceptions:view"), validar(rmReceptionIdParamSchema, "params"), rmReceptionController.document)

rmReceptionRoutes.get(
    "/",
    authorize("rawMaterialReceptions:view"),
    validar(rmReceptionQuerySchema, "query"),
    rmReceptionController.index
)
rmReceptionRoutes.get(
    "/:id",
    authorize("rawMaterialReceptions:view"),
    validar(rmReceptionIdParamSchema, "params"),
    rmReceptionController.show
)
rmReceptionRoutes.post(
    "/",
    authorize("rawMaterialReceptions:create"),
    validar(createRmReceptionSchema),
    restrictCarrierPayload,
    rmReceptionController.store
)
rmReceptionRoutes.patch(
    "/:id/reception",
    authorize("rawMaterialReceptions:receive"),
    validar(rmReceptionIdParamSchema, "params"),
    validar(completeReceptionSchema),
    rmReceptionController.completeReception
)

rmReceptionRoutes.patch("/:id/grn", authorize("rawMaterialReceptions:assignGrn"), validar(rmReceptionIdParamSchema, "params"), validar(assignGrnSchema), rmReceptionController.assignGrn)
rmReceptionRoutes.patch("/:id/field", authorizeAny("rawMaterialReceptions:editField", "rawMaterialReceptions:overrideEdit"), validar(rmReceptionIdParamSchema, "params"), validar(editFieldSchema), restrictCarrierPayload, rmReceptionController.editField)
rmReceptionRoutes.patch("/:id/reception/correction", authorizeAny("rawMaterialReceptions:editReception", "rawMaterialReceptions:overrideEdit"), validar(rmReceptionIdParamSchema, "params"), validar(editReceptionSchema), rmReceptionController.editReception)
rmReceptionRoutes.get("/:id/history", authorize("rawMaterialReceptions:viewHistory"), validar(rmReceptionIdParamSchema, "params"), rmReceptionController.history)

export default rmReceptionRoutes
