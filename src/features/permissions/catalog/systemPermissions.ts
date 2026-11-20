// Única fuente del catálogo. Agregar una clave exige implementar su comprobación
// en código; los usuarios solo asignan estas capacidades a los roles.
const catalog = {
    dashboard: ["view"],
    users: ["view", "create", "edit", "delete"],
    roles: ["view", "create", "edit", "delete"],
    producers: ["view", "create", "edit", "delete"],
    farms: ["view", "create", "edit", "delete"],
    transport: ["view", "create", "edit", "delete"],
    products: ["view", "create", "edit", "delete", "manageDefects"],
    baskets: ["view", "create", "edit", "delete"],
    cdps: ["view", "create", "edit", "delete"],
    rawMaterialReceptions: ["view", "manageCarrier", "create", "receive", "editField", "editReception", "assignGrn", "overrideEdit", "viewHistory", "downloadDocuments"],
    qualityEvaluations: ["view", "create", "edit"],
} as const

type Catalog = typeof catalog
export type SystemPermission = { [K in keyof Catalog]: `${K}:${Catalog[K][number]}` }[keyof Catalog]
export const SYSTEM_PERMISSION_NAMES: SystemPermission[] = Object.entries(catalog).flatMap(([resource, actions]) =>
    actions.map(action => `${resource}:${action}` as SystemPermission))
const names = new Set<string>(SYSTEM_PERMISSION_NAMES)
export const isSystemPermission = (name: string): name is SystemPermission => names.has(name)
