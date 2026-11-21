import type { leerEntorno } from "./entorno"

export type ParametrosBaseDatos = Pick<ReturnType<typeof leerEntorno>,
    "urlBaseDatos" | "baseDatosPoolMax" | "baseDatosSsl" | "baseDatosVerificarCertificado" | "baseDatosCertificadoCa">

// Las herramientas de datos necesitan la conexión, no las credenciales HTTP.
export function leerParametrosBaseDatos(variables: NodeJS.ProcessEnv): ParametrosBaseDatos {
    const urlBaseDatos = variables.DATABASE_URL?.trim()
    if (!urlBaseDatos) throw new Error("Configura DATABASE_URL con la URL de PostgreSQL antes de ejecutar la carga.")
    try {
        const url = new URL(urlBaseDatos)
        if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error()
    } catch { throw new Error("DATABASE_URL debe ser una URL válida de PostgreSQL") }
    function booleano(key: string, fallback: boolean) {
        if (variables[key] === undefined) return fallback
        if (variables[key] === "true") return true
        if (variables[key] === "false") return false
        throw new Error(`${key} debe ser true o false`)
    }
    const baseDatosPoolMax = Number(variables.DATABASE_POOL_MAX ?? 5)
    if (!Number.isSafeInteger(baseDatosPoolMax) || baseDatosPoolMax < 1 || baseDatosPoolMax > 100) throw new Error("DATABASE_POOL_MAX debe ser un entero entre 1 y 100")
    return {
        urlBaseDatos, baseDatosPoolMax,
        baseDatosSsl: booleano("DATABASE_SSL", true),
        baseDatosVerificarCertificado: booleano("DATABASE_SSL_REJECT_UNAUTHORIZED", true),
        baseDatosCertificadoCa: variables.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
    }
}

export function configuracionBaseDatos(entorno: ParametrosBaseDatos) {
    const url = new URL(entorno.urlBaseDatos)
    // pg permite que estos parámetros sobrescriban el objeto SSL. Centralizar
    // aquí evita que sslmode=require anule la CA o la verificación configurada.
    for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key)
    return {
        url: url.toString(),
        options: {
            logging: false as const,
            pool: { max: entorno.baseDatosPoolMax, min: 0, idle: 10000, acquire: 20000, evict: 1000 },
            dialectOptions: {
                ssl: entorno.baseDatosSsl ? {
                    require: true,
                    rejectUnauthorized: entorno.baseDatosVerificarCertificado,
                    ...(entorno.baseDatosCertificadoCa ? { ca: entorno.baseDatosCertificadoCa } : {}),
                } : false,
                connectionTimeoutMillis: 10000,
            },
        },
    }
}
