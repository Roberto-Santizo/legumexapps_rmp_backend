import { signatureImageSchema } from "../../../shared/validacion/signatureImage"
import z from "zod"
import { editMetadataSchema } from "../../raw-material-receptions/schemas/rmReception.schema"

export const qualityEvaluationSchema = z.object({
    harvestDocNumber: z.string().trim().min(1).max(255),
    sampleUnits: z.number().int().positive().max(2147483647),
    ph: z.number().min(0).max(14).nullable(),
    brix: z.number().min(0).max(100).nullable(),
    observations: z.string().trim().max(20000).default(""),
    inspectorSignature: signatureImageSchema,
    configurationVersion: z.string().min(1).max(100000),
    expectedVersion: z.number().int().nonnegative().optional(),
    pestInspection: z.object({
        wormCount: z.number().int().nonnegative().max(2147483647),
        aphidHeadsCount: z.number().int().nonnegative().max(2147483647),
    }).nullable().optional(),
    defects: z.array(z.object({ defectId: z.number().int().positive(), input: z.number().min(0).max(100) })).max(200),
}).superRefine((value, ctx) => {
    if (!value.defects.length && !value.pestInspection) ctx.addIssue({ code: "custom", path: ["defects"], message: "Debes evaluar al menos un defecto o el control de gusanos y áfidos" })
    if (new Set(value.defects.map(defect => defect.defectId)).size !== value.defects.length) {
        ctx.addIssue({ code: "custom", path: ["defects"], message: "No repitas defectos en la evaluación" })
    }
})

export type QualityEvaluationInput = z.infer<typeof qualityEvaluationSchema>

export const editQualitySchema = z.object({
    ...z.object(qualityEvaluationSchema.shape).omit({ inspectorSignature: true }).shape,
    ...editMetadataSchema.shape,
}).strict().superRefine((value, ctx) => {
    if (!value.defects.length && !value.pestInspection) ctx.addIssue({ code: "custom", path: ["defects"], message: "Debes evaluar al menos un defecto o el control de gusanos y áfidos" })
    if (new Set(value.defects.map(defect => defect.defectId)).size !== value.defects.length) {
        ctx.addIssue({ code: "custom", path: ["defects"], message: "No repitas defectos en la evaluación" })
    }
})
export type EditQualityInput = z.infer<typeof editQualitySchema>
