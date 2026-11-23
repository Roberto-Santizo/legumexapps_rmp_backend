import type { Sequelize } from "sequelize-typescript"

// La alteración de tablas se habilita explícitamente en el arranque de desarrollo.
export async function inicializarEsquema(db: Sequelize, alterarEsquema = false): Promise<boolean> {
    return db.transaction(async transaction => {
        const tables = await db.getQueryInterface().showAllTables({ transaction })
        const options = { transaction, force: false, alter: alterarEsquema }
        await db.sync(options)
        return tables.length === 0
    })
}
