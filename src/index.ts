import "reflect-metadata"
import servidor from "./app/servidor"
import sequelize, { conectarBaseDatos } from "./basedatos/conexion"
import { entorno } from "./config/env"

async function principal(): Promise<void> {
    await conectarBaseDatos()
    const server = servidor.listen(entorno.puertoServidor, "0.0.0.0", () => {
        console.info(`Servidor HTTP iniciado en el puerto ${entorno.puertoServidor}`)
    })
    let cerrando = false
    function cerrar() {
        if (cerrando) return
        cerrando = true
        const timeout = setTimeout(() => server.closeAllConnections(), 10000)
        timeout.unref()
        server.close(() => {
            clearTimeout(timeout)
            void sequelize.close().catch(() => { process.exitCode = 1 })
        })
        server.closeIdleConnections()
    }
    process.once("SIGTERM", cerrar)
    process.once("SIGINT", cerrar)
    server.on("error", () => {
        console.error("No se pudo iniciar el servidor HTTP")
        process.exitCode = 1
        void sequelize.close().catch(() => { process.exitCode = 1 })
    })
}

void principal().catch(async error => {
    console.error("No se pudo iniciar el servidor:", error instanceof Error ? error.name : "UnknownError")
    await sequelize.close().catch(() => {})
    process.exitCode = 1
})
