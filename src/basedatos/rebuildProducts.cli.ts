import { readFile } from "node:fs/promises"
import path from "node:path"
import { validateProductDataset } from "./productDataset"

async function main() {
    const args = process.argv.slice(2)
    if (args.some(arg => arg !== "--apply")) throw new Error("Usa db:rebuild-products para revisar, o db:rebuild-products -- --apply para reconstruir.")
    const file = path.resolve(__dirname, "../../data/products/products.json")
    const data = validateProductDataset(JSON.parse(await readFile(file, "utf8")))
    console.log(JSON.stringify({ varieties: data.varieties.length, products: data.products.length, defects: data.defects.length,
        productDefects: data.productDefects.length }, null, 2))
    console.log("APIO excluido. Las observaciones para Calidad están en data/products/REPORTE_FINAL.txt y no bloquean la carga.")
    console.log("Se reconstruyen productos, variedades, defectos y las recepciones/evaluaciones de prueba que dependen de ellos.")
    console.log("Se eliminan defect_aliases y defect_normalization_backups. Se conservan usuarios, permisos, plantas y los demás catálogos.")
    if (!args.includes("--apply")) {
        console.log("Revisión de archivos terminada. No hubo conexión ni cambios en la base de datos.")
        return
    }
    const { default: db } = await import("./conexion")
    const { rebuildProducts } = await import("./rebuildProducts")
    try {
        await db.authenticate()
        console.log("Reconstrucción terminada:", await rebuildProducts(db, data))
    } finally { await db.close() }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
