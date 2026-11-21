const { test, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
Object.assign(process.env, {
    NODE_ENV: "production", DATABASE_URL: "postgresql://test:test@127.0.0.1:1/defect_checks",
    JWT_SECRET: "synthetic-test-secret-with-more-than-thirty-two-characters", CORS_ORIGINS: "https://test.invalid",
})
require("reflect-metadata")
const root = path.resolve(__dirname, "..")
const { sequelize } = require(path.join(root, "dist/basedatos/conexion"))
after(() => sequelize.close())
const names = require(path.join(root, "dist/features/products/utils/defectName"))
const schema = require(path.join(root, "dist/features/products/schemas/product.schema"))
const Catalog = sequelize.model("DefectCatalog"), Association = sequelize.model("ProductDefect")
const service = require(path.join(root, "dist/features/products/services/defectCatalog.service"))
const { validateProductDataset } = require(path.join(root, "dist/basedatos/productDataset"))
const dataset = require(path.join(root, "data/products/products.json"))
require("./rebuildProducts.cjs")

test("database import configuration requires no authentication variables and keeps TLS verification enabled", () => {
    const { leerParametrosBaseDatos, configuracionBaseDatos } = require(path.join(root,"dist/config/database"))
    const options = leerParametrosBaseDatos({ DATABASE_URL:"postgresql://test:secret@test.invalid:5432/test?sslmode=require" })
    assert.equal(options.baseDatosSsl,true)
    assert.equal(options.baseDatosVerificarCertificado,true)
    assert.equal(configuracionBaseDatos(options).options.dialectOptions.ssl.rejectUnauthorized,true)
    assert(!configuracionBaseDatos(options).url.includes("sslmode"))
    assert.throws(()=>leerParametrosBaseDatos({}),/Configura DATABASE_URL/)
    assert.throws(()=>leerParametrosBaseDatos({DATABASE_URL:"https://test.invalid/test"}),/URL válida de PostgreSQL/)
    assert.throws(()=>leerParametrosBaseDatos({DATABASE_URL:options.urlBaseDatos,DATABASE_SSL:"wrong"}),/DATABASE_SSL debe ser true o false/)
})

test("offline data excludes APIO and its links while preserving independent tolerance values", () => {
    const clean = validateProductDataset(dataset)
    assert.equal(clean.products.length, 42)
    assert.equal(clean.varieties.length, 40)
    assert.equal(clean.productDefects.length, 285)
    assert(!clean.products.some(row => row.name === "APIO"))
    assert(!clean.varieties.some(row => row.name === "APIO"))
    for (const tolerancePercentage of [-1,101,NaN,Infinity]) {
        const invalid = structuredClone(clean)
        invalid.productDefects[0].tolerancePercentage = tolerancePercentage
        assert.throws(() => validateProductDataset(invalid))
    }
    const invalid = structuredClone(clean)
    invalid.productDefects[0].productId = 99999
    assert.throws(() => validateProductDataset(invalid), /referencias inexistentes/)
    const duplicate = structuredClone(clean)
    duplicate.productDefects.push({ ...duplicate.productDefects[0], id: duplicate.productDefects.length + 1 })
    assert.throws(() => validateProductDataset(duplicate), /duplicados/)
})

test("approved source criteria are kept as written and quality observations are separate from the load", () => {
    const fs = require("node:fs")
    const observations = fs.readFileSync(path.join(root,"data/products/quality_review.csv"),"utf8")
    assert(observations.includes("DIÁMETRO > 8MM < 4MM"))
    for (const name of ["DIÁMETRO <25> 35MM", "DIÁMETRO > 8MM < 4MM", "LONGITUD <35> 45MM", "SOBREMADURAS >12MM", "LARGO > 7"]) {
        assert(dataset.defects.some(row => row.name === name), name)
    }
    assert(!Object.hasOwn(dataset,"pendingReview"))
})

test("catalog edits change only the selected name without aliases or product tolerance", async context => {
    const originals = { tx: sequelize.transaction, get: Catalog.findByPk, one: Catalog.findOne }
    context.after(() => { sequelize.transaction = originals.tx; Catalog.findByPk = originals.get; Catalog.findOne = originals.one })
    const record = { id: 2, name: "MANCHA VIEJA", activo: true, update: async function(values) { Object.assign(this, values) } }
    sequelize.transaction = async work => work({ LOCK: { UPDATE: "UPDATE" } })
    Catalog.findByPk = async () => record
    Catalog.findOne = async () => null
    await service.updateCatalogDefect(2, { name: "MANCHA CORREGIDA" })
    assert.equal(record.name, "MANCHA CORREGIDA")
    assert(!Object.hasOwn(record, "tolerancePercentage"))
    assert(!sequelize.modelManager.models.some(model => model.name === "DefectAlias"))
})

test("assigned GRN and plant are protected by application hooks", () => {
    const Receipt = sequelize.model("RmReception")
    const record = Receipt.build({ id: 1, grn: "LP001", plantId: 1 }, { isNewRecord: false })
    record.set("grn", "LP002")
    assert.throws(() => Receipt.preserveAssignedIdentifiers(record), /GRN/)
    const other = Receipt.build({ id: 2, grn: null, plantId: 1 }, { isNewRecord: false })
    other.set("plantId", 2)
    assert.throws(() => Receipt.preserveAssignedIdentifiers(other), /planta/)
})

test("approved spelling corrections preserve Ñ, compound criteria, quantities and comparison operators", () => {
    for (const [input, expected] of Object.entries({
        " dañoi   mecanico ": "DAÑO MECÁNICO", pudricion: "PUDRICIÓN", MALLUGADO: "MAGULLADURAS",
        MALLUGADAS: "MAGULLADURAS", MAGULLADAS: "MAGULLADURAS", DESIDRATACION: "DESHIDRATACIÓN",
        SOBREMADURES: "SOBREMADUREZ", SOBREMADURO: "SOBREMADUREZ",
    })) assert.equal(names.standardizeDefectName(input), expected)
    assert.equal(names.normalizeDefectName("CAN\u0303A"), "CAÑA")
    assert.notEqual(names.normalizeDefectName("CAÑA"), names.normalizeDefectName("CANA"))
    assert.equal(names.normalizeDefectName("DIAMETRO<25MM"), names.normalizeDefectName("DIÁMETRO < 25 MM"))
    assert.equal(names.normalizeDefectName("PUDRICIÓN/HONGOS"), names.normalizeDefectName("PUDRICIÓN / HONGOS"))
    assert.notEqual(names.normalizeDefectName("DIÁMETRO <25 MM"), names.normalizeDefectName("DIÁMETRO >25 MM"))
    for (const value of ["DEFECTO MAYOR", "DEFECTO MENOR", "PUDRICIÓN / HONGOS", "PESO < 100 G", "PESO > 100 G", "DIÁMETRO < 20 MM", "DIÁMETRO < 25 MM"]) assert.equal(names.standardizeDefectName(value), value)
})

test("association input requires a catalog ID, strips client names and rejects duplicate identities", () => {
    const product = { name: "PRODUCTO", varietyProductId: 1, acceptedPercentage: 70 }
    const defect = { defectCatalogId: 2, tolerancePercentage: 2, activo: true }
    const parsed = schema.createProductSchema.parse({ ...product, defects: [{ ...defect, name: "NOMBRE FALSO" }] })
    assert.equal(parsed.defects[0].name, undefined)
    assert(!schema.createProductSchema.safeParse({ ...product, defects: [{ name: "MANCHAS", tolerancePercentage: 2, activo: true }] }).success)
    assert(!schema.createProductSchema.safeParse({ ...product, defects: [defect, { ...defect, tolerancePercentage: 5 }] }).success)
    const catalogInput = schema.createDefectCatalogSchema.parse({ name: "pudricion", evaluationKind: "pest_count" })
    assert.equal(catalogInput.name, "PUDRICIÓN")
    assert.equal(catalogInput.evaluationKind, undefined, "Legacy clients cannot configure pest counting through a defect")
})

test("association names come from the joined catalog without exposing a defect evaluation type", () => {
    const record = Association.build({ id: 7, productId: 1, defectCatalogId: 2, tolerancePercentage: 3, activo: true,
        defectCatalog: { id: 2, name: "DAÑO MECÁNICO", evaluationKind: "percentage", activo: true } }, { include: [Catalog] })
    assert.equal(record.name, "DAÑO MECÁNICO")
    assert.equal(record.toJSON().name, "DAÑO MECÁNICO")
    assert.equal(Association.getAttributes().evaluationKind, undefined)
    assert.equal(Catalog.getAttributes().evaluationKind, undefined)
    record.defectCatalog.name = "NOMBRE CORREGIDO"
    assert.equal(record.name, "NOMBRE CORREGIDO")
    assert.equal(Association.getAttributes().name.type.key, "VIRTUAL")
})

test("deactivation stops new links while preserving existing product configuration", async context => {
    const original = Catalog.findByPk
    context.after(() => { Catalog.findByPk = original })
    Catalog.findByPk = async () => ({ id: 2, activo: false })
    const defect = { id: 7, defectCatalogId: 2, tolerancePercentage: 3, activo: true }
    await assert.rejects(() => service.resolveProductDefects([defect], {}), error => error.codigoEstado === 400)
    const result = await service.resolveProductDefects([defect], {}, new Map([[7, { defectCatalogId: 2 }]]))
    assert.equal(result[0].tolerancePercentage, 3)
    assert.equal(result[0].name, undefined)
})

test("catalog creation and editing require the dedicated permission", async context => {
    const express = require("express"), auth = require(path.join(root, "dist/features/authentication/middleware/authenticate"))
    const original = auth.authenticate, oldList = service.listDefectCatalog, oldCreate = service.findOrCreateDefect, oldUpdate = service.updateCatalogDefect
    context.after(() => { auth.authenticate = original; service.listDefectCatalog = oldList; service.findOrCreateDefect = oldCreate; service.updateCatalogDefect = oldUpdate })
    let permissions = []
    auth.authenticate = (req, _res, next) => { req.user = { permissions }; next() }
    service.listDefectCatalog = async () => []
    service.findOrCreateDefect = async () => [{ id: 1, name: "PUDRICIÓN" }, false]
    service.updateCatalogDefect = async () => ({ id: 1, name: "PUDRICIÓN" })
    const app = express()
    app.use(express.json(), require(path.join(root, "dist/features/products/routes/product.routes")).default)
    app.use((error, _req, res, _next) => res.status(error.codigoEstado ?? 400).json({ message: error.message }))
    const server = await new Promise(resolve => { const server = app.listen(0, "127.0.0.1", () => resolve(server)) })
    context.after(() => { server.closeAllConnections(); server.close() })
    const url = `http://127.0.0.1:${server.address().port}/defect-catalog`
    for (permissions of [["products:view"], ["products:create"], ["products:edit"]]) {
        assert.equal((await fetch(url)).status, 200)
        assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "PUDRICION" }) })).status, 403)
        assert.equal((await fetch(`${url}/1`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "PUDRICION" }) })).status, 403)
    }
    permissions = ["products:manageDefects"]
    assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "PUDRICION" }) })).status, 200)
    assert.equal((await fetch(`${url}/1`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: false }) })).status, 200)
})

test("the product switch controls separate pest counts without changing defect percentages or historical snapshots", async context => {
    const quality = require(path.join(root, "dist/features/quality-control/services/qualityEvaluation.service")).qualityEvaluationService
    const reception = require(path.join(root, "dist/features/raw-material-receptions/services/rmReception.service")).rmReceptionService
    const signatures = require(path.join(root, "dist/shared/servicios/signatureUploads"))
    const Receipt = sequelize.model("RmReception"), Field = sequelize.model("FieldDataReception"), Plant = sequelize.model("ProdDataReception")
    const Product = sequelize.model("Product"), User = sequelize.model("User"), Doc = sequelize.model("QualityControlDoc"), Result = sequelize.model("QualityControlDefect")
    const restores = []
    const replace = (object, key, value) => { const previous = object[key]; restores.push(() => { object[key] = previous }); object[key] = value }
    context.after(() => { for (const restore of restores.reverse()) restore() })
    let results, savedDoc
    const receipt = { id: 5, status: "pendiente_evaluacion_calidad", editVersion: 0, grn: null, update: async values => Object.assign(receipt, values) }
    const field = { productId: 1, producerId: 1, qualityPercentage: 80 }
    const plant = { totalBaskets: 20, netWeight: 100, update: async values => Object.assign(plant, values) }
    const product = { id: 1, acceptedPercentage: 70, evaluatePests: false }
    const percentage = Association.build({ id: 7, productId: 1, defectCatalogId: 2, tolerancePercentage: 2, activo: true,
        defectCatalog: { id: 2, name: "DAÑO MECÁNICO", activo: true } }, { include: [Catalog] })
    const pest = Association.build({ id: 8, productId: 1, defectCatalogId: 3, tolerancePercentage: 0, activo: true,
        defectCatalog: { id: 3, name: "MANCHAS", activo: true } }, { include: [Catalog] })
    replace(reception, "getRmReceptionById", async () => ({ ...receipt, fieldDataReceptions: [field], prodDataReceptions: [plant], qualityControlDocs: [] }))
    replace(Product, "findByPk", async () => product)
    replace(Association, "findAll", async () => [percentage, pest])
    replace(signatures, "withSignatureUploads", async (_images, _storage, work) => work(["synthetic-signature"]))
    replace(sequelize, "transaction", async work => work({ LOCK: { UPDATE: "UPDATE" } }))
    replace(Receipt, "findByPk", async () => receipt)
    replace(Field, "findOne", async () => field)
    replace(Plant, "findOne", async () => plant)
    replace(User, "findOne", async () => ({ id: 1, name: "EVALUADOR DE PRUEBA" }))
    replace(Doc, "create", async values => { savedDoc = { id: 1, ...values }; return savedDoc })
    replace(Result, "bulkCreate", async values => { results = structuredClone(values) })
    const disabled = await quality.getContext(5)
    assert.equal(disabled.pestControl.enabled, false)
    assert.equal(disabled.pestControl.rule, null)
    product.evaluatePests = true
    const opened = await quality.getContext(5)
    assert.equal(opened.pestControl.enabled, true)
    assert(opened.pestControl.rule)
    assert.deepEqual(opened.defects.map(row => row.id), [7, 8])
    assert.deepEqual(disabled.defects.map(row => row.id), [7, 8], "Enabling pest counting does not change percentage defects")
    await quality.evaluate(5, { configurationVersion: opened.configurationVersion, expectedVersion: 0,
        harvestDocNumber: "TEST", sampleUnits: 100, ph: null, brix: null, observations: "", inspectorSignature: "synthetic",
        pestInspection: { wormCount: 3, aphidHeadsCount: 0 }, defects: [{ defectId: 7, input: 7 }, { defectId: 8, input: 0 }] }, 1)
    assert.equal(savedDoc.percentage, 95)
    assert.equal(receipt.consignment, true, "Counts can consign the lot without lowering its percentage quality")
    assert.equal(results[0].productDefectId, 7)
    assert.equal(results[0].tolerancePercentage, 2)
    assert.equal(results[0].defectName, "DAÑO MECÁNICO")
    percentage.tolerancePercentage = 99
    percentage.defectCatalog.name = "OTRO NOMBRE"
    assert.equal(results[0].tolerancePercentage, 2)
    assert.equal(results[0].defectName, "DAÑO MECÁNICO")
    assert.equal(field.qualityPercentage, 80)
})
