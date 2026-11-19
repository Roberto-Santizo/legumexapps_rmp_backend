try {
    const { entorno } = require("../dist/config/env")
    const { validarAdministradorInicial } = require("../dist/basedatos/prepararBaseDatos")
    validarAdministradorInicial(entorno)
    console.log("Configuración de producción válida. No se abrió una conexión a PostgreSQL ni a S3.")
} catch (error) {
    console.error(error.message)
    process.exitCode = 1
}
