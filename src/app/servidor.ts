import "reflect-metadata"
import express from "express"
import cors from "cors"
import "../config/validacion"
import enrutadorPrincipal from "./routes/index"
import { manejadorErrores } from "../shared/intermediarios/manejadorErrores"
import { entorno } from "../config/env"
import { ErrorApp } from "../shared/errores/ErrorApp"
import { prepararBaseDatos } from "./prepararBaseDatos"

const servidor = express()

servidor.set("trust proxy", 1)
servidor.disable("x-powered-by")

servidor.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Cache-Control", "no-store")
    next()
})

servidor.use(cors({
    origin(origin, callback) {
        if (!origin || entorno.origenesCors.includes(origin) || (entorno.entornoNodo !== "production" && !entorno.origenesCors.length)) callback(null, true)
        else callback(new ErrorApp(403, "El origen de la solicitud no está permitido"))
    },
}))

servidor.use(express.json({ limit: "20mb" }))

servidor.get("/health", (_req, res) => { res.json({ status: "ok" }) })

servidor.use("/api", prepararBaseDatos, enrutadorPrincipal)

servidor.get("/", (_req, res) => {
    res.json({ message: "Bienvenido a la API de Legumex RMP" })
})

servidor.use((_req, res) => { res.status(404).json({ message: "Ruta no encontrada" }) })
servidor.use(manejadorErrores)

export default servidor
