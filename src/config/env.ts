import dotenv from "dotenv"
import path from "path"
import { leerEntorno } from "./entorno"

if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: path.resolve(__dirname, "../../src/config/.env") })
}
export const entorno = leerEntorno(process.env)
