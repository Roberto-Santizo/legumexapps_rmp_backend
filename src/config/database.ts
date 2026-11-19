import type { leerEntorno } from "./entorno"

export function configuracionBaseDatos(entorno: ReturnType<typeof leerEntorno>) {
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
