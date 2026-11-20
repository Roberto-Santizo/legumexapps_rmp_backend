import type { Sequelize } from "sequelize-typescript"
import { ErrorApp } from "../shared/errores/ErrorApp"
import { inicializarEsquemaVacio } from "./inicializarEsquema"
import { migrarCatalogoDefectos } from "./migraciones/catalogoDefectos"

type CredencialesAdmin = { seedAdminUsername?: string; seedAdminPassword?: string }

export function validarAdministradorInicial(credenciales: CredencialesAdmin): void {
    if (!credenciales.seedAdminUsername?.trim() || !credenciales.seedAdminPassword) {
        throw new ErrorApp(500, "Configura SEED_ADMIN_USERNAME y SEED_ADMIN_PASSWORD para crear el administrador principal.")
    }
}

export async function prepararBaseDatos(db: Sequelize, inicializarAccesos: () => Promise<void>, credenciales: CredencialesAdmin): Promise<boolean> {
    validarAdministradorInicial(credenciales)
    const creado = await inicializarEsquemaVacio(db)
    if (!creado) await migrarCatalogoDefectos(db)
    await inicializarAccesos()
    return creado
}
