export function leerEntorno(variables: NodeJS.ProcessEnv) {
    const entornoNodo = variables.NODE_ENV ?? "development"
    if (!["development", "test", "production"].includes(entornoNodo)) throw new Error("NODE_ENV debe ser development, test o production")
    const produccion = entornoNodo === "production"
    function requerido(clave: string) {
        const valor = variables[clave]?.trim()
        if (!valor) throw new Error(`Falta la variable de entorno requerida: ${clave}`)
        return valor
    }
    function entero(clave: string, defecto: number, maximo = 2147483647) {
        const valor = variables[clave] === undefined ? defecto : Number(variables[clave])
        if (!Number.isSafeInteger(valor) || valor < 1 || valor > maximo) throw new Error(`${clave} debe ser un entero positivo válido`)
        return valor
    }
    function booleano(clave: string, defecto: boolean) {
        if (variables[clave] === undefined) return defecto
        if (variables[clave] === "true") return true
        if (variables[clave] === "false") return false
        throw new Error(`${clave} debe ser true o false`)
    }
    const urlBaseDatos = requerido("DATABASE_URL")
    try {
        const url = new URL(urlBaseDatos)
        if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error()
    } catch { throw new Error("DATABASE_URL debe ser una URL válida de PostgreSQL") }
    const secretoJwt = requerido("JWT_SECRET")
    if (produccion && secretoJwt.length < 32) throw new Error("JWT_SECRET debe tener al menos 32 caracteres en producción")
    const origenesCors = (variables.CORS_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean)
    if (produccion && !origenesCors.length) throw new Error("Configura CORS_ORIGINS con los dominios HTTPS del frontend")
    for (const origen of origenesCors) {
        try {
            const url = new URL(origen)
            if (origen.includes("*") || url.origin !== origen || !["https:", "http:"].includes(url.protocol)
                || (produccion && (url.protocol !== "https:" || /^(localhost|127\..*|\[::1\])$/.test(url.hostname) || url.hostname.endsWith(".localhost")))) throw new Error()
        } catch { throw new Error("CORS_ORIGINS debe contener orígenes exactos separados por comas, sin rutas, comodines ni barra final; usa HTTPS en producción") }
    }
    return {
        entornoNodo,
        puertoServidor: variables.PORT === undefined ? entero("SERVER_PORT", 3000, 65535) : entero("PORT", 3000, 65535),
        urlBaseDatos, secretoJwt,
        expiracionJwt: variables.JWT_EXPIRES_IN ?? "1d",
        origenesCors,
        baseDatosSsl: booleano("DATABASE_SSL", true),
        baseDatosVerificarCertificado: booleano("DATABASE_SSL_REJECT_UNAUTHORIZED", produccion),
        baseDatosCertificadoCa: variables.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
        baseDatosPoolMax: entero("DATABASE_POOL_MAX", 5, 100),
        seedAdminUsername: variables.SEED_ADMIN_USERNAME,
        seedAdminPassword: variables.SEED_ADMIN_PASSWORD,
        awsRegion: variables.AWS_REGION,
        awsAccessKeyId: variables.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: variables.AWS_SECRET_ACCESS_KEY,
        awsS3BucketName: variables.AWS_S3_BUCKET_NAME,
    } as const
}
