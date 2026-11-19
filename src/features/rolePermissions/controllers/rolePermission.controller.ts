import { Request, Response, NextFunction } from "express"
import { rolePermissionService } from "../services/rolePermission.service"
import { listPermissionCatalog } from "../../permissions/services/permissionCatalog.service"

async function catalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ data: await listPermissionCatalog() }) }
    catch (error) { next(error) }
}

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const roleId = Number(req.params.roleId)
        const permissions = await rolePermissionService.getPermissionsByRole(roleId)
        res.json({ data: permissions })
    } catch (error) {
        next(error)
    }
}

async function sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const roleId = Number(req.params.roleId)
        const permissions = await rolePermissionService.syncRolePermissions(roleId, req.body.permissionIds)
        res.json({
            message: "Permisos del rol actualizados correctamente",
            data: permissions
        })
    } catch (error) {
        next(error)
    }
}

export const rolePermissionController = {
    catalog,
    index,
    sync
}
