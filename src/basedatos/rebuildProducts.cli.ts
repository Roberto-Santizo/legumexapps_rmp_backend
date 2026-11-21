import { readFile } from "node:fs/promises"
import path from "node:path"
import { validateProductDataset } from "./productDataset"
import { leerParametrosBaseDatos } from "../config/database"

export async function runProductCommand(args = process.argv.slice(2)) {
    if (args.some(arg => !["--apply", "--load-only"].includes(arg))) throw new Error("Usa db:load-products para cargar tablas vacías o db:rebuild-products para revisar una reconstrucción.")
    const loadOnly = args.includes("--load-only")
    const file = path.resolve(__dirname, "../../data/products/products.json")
    const data = validateProductDataset(JSON.parse(await readFile(file, "utf8")))
    console.log(JSON.stringify({ varieties: data.varieties.length, products: data.products.length, defects: data.defects.length,
        productDefects: data.productDefects.length }, null, 2))
    console.log("APIO excluido. Las observaciones para Calidad están en data/products/REPORTE_FINAL.txt y no bloquean la carga.")
    if (loadOnly) {
        console.log("Se insertan únicamente variedades, defectos, productos y sus asociaciones en las cuatro tablas vacías.")
        console.log("Se conservan las tablas existentes, accesos, permisos y los demás datos de la aplicación.")
    } else {
        console.log("Se reconstruyen productos, variedades, defectos y las recepciones/evaluaciones de prueba que dependen de ellos.")
        console.log("Se eliminan defect_aliases y defect_normalization_backups. Se conservan usuarios, permisos, plantas y los demás catálogos.")
    }
    if (!args.includes("--apply")) {
        console.log("Revisión de archivos terminada. No hubo conexión ni cambios en la base de datos.")
        return
    }
    const parametros = leerParametrosBaseDatos(process.env)
    const { crearConexion } = await import("./crearConexion")
    const db = crearConexion(parametros)
    const { rebuildProducts, loadProducts } = await import("./rebuildProducts")
    try {
        await db.authenticate()
        console.log(loadOnly ? "Carga terminada:" : "Reconstrucción terminada:", await (loadOnly ? loadProducts : rebuildProducts)(db, data))
    } finally { await db.close() }
}

if (require.main === module) {
    runProductCommand().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
