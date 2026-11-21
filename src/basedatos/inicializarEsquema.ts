import type { Sequelize } from "sequelize-typescript"

// Sequelize crea las tablas faltantes desde los modelos. No altera ni borra datos.
export async function inicializarEsquema(db: Sequelize): Promise<boolean> {
    return db.transaction(async transaction => {
        const tables = await db.getQueryInterface().showAllTables({ transaction })
        const options = { transaction, force: false, alter: false }
        await db.sync(options)
        return tables.length === 0
    })
}
