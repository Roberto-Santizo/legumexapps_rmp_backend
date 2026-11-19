import { ErrorApp, ErrorProhibido } from "../../../shared/errores/ErrorApp"

export type EditStage = "field" | "reception" | "quality"
export const EDIT_LIMIT = 2
export const OVERRIDE_EDIT = "rawMaterialReceptions:overrideEdit"
export const EDIT_RULES = {
    field: { permission: "rawMaterialReceptions:editField", status: "pendiente_recepcion", counter: "fieldEditCount" },
    reception: { permission: "rawMaterialReceptions:editReception", status: "pendiente_evaluacion_calidad", counter: "receptionEditCount" },
    quality: { permission: "qualityEvaluations:edit", status: "pendiente_asignacion_grn", counter: "qualityEditCount" },
} as const

export type EditableReceipt = {
    status: string; grn: string | null; editVersion: number
    fieldEditCount: number; receptionEditCount: number; qualityEditCount: number
}

export function assertEditAllowed(receipt: EditableReceipt, stage: EditStage, permissions: string[], expectedVersion: number, roleName?: string): boolean {
    const rule = EDIT_RULES[stage]
    const override = permissions.includes(OVERRIDE_EDIT) && !(stage === "field" && roleName?.trim().toLocaleLowerCase("es") === "campo")
    if (!override && !permissions.includes(rule.permission)) throw new ErrorProhibido()
    if (receipt.editVersion !== expectedVersion) throw new ErrorApp(409, "La boleta cambió. Recarga y revisa los datos antes de guardar.")
    if (!override && (receipt.status !== rule.status || receipt.grn !== null)) {
        throw new ErrorApp(409, "La siguiente etapa ya fue registrada. Tu equipo ya no puede editar este apartado.")
    }
    if (!override && receipt[rule.counter] >= EDIT_LIMIT) throw new ErrorApp(409, "Este apartado ya utilizó sus dos modificaciones permitidas.")
    return override
}
