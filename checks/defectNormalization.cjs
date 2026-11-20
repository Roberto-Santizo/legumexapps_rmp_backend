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
const { planDefectNormalization } = require(path.join(root, "dist/basedatos/migraciones/planNormalizacionDefectos"))
const { normalizarDefectos } = require(path.join(root, "dist/basedatos/migraciones/normalizarDefectos"))
const schema = require(path.join(root, "dist/features/products/schemas/product.schema"))
const Catalog = sequelize.model("DefectCatalog"), Alias = sequelize.model("DefectAlias"), Association = sequelize.model("ProductDefect")
const service = require(path.join(root, "dist/features/products/services/defectCatalog.service"))
const { createDashboardAggregation } = require(path.join(root, "dist/features/reports/services/dashboard.aggregate"))

test("approved spelling corrections preserve Ñ, compound criteria, quantities and comparison operators", () => {
    for (const [input, expected] of Object.entries({
        " dañoi   mecanico ": "DAÑO MECÁNICO", pudricion: "PUDRICIÓN", MALLUGADO: "MAGULLADURAS",
        MALLUGADAS: "MAGULLADURAS", MAGULLADAS: "MAGULLADURAS", DESIDRATACION: "DESHIDRATACIÓN",
        SOBREMADURES: "SOBREMADUREZ", SOBREMADURO: "SOBREMADUREZ",
    })) assert.equal(names.standardizeDefectName(input), expected)
    assert.equal(names.normalizeDefectName("CAN\u0303A"), "CAÑA")
    assert.notEqual(names.normalizeDefectName("CAÑA"), names.normalizeDefectName("CANA"))
    for (const value of ["DEFECTO MAYOR", "DEFECTO MENOR", "PUDRICIÓN / HONGOS", "PESO < 100 G", "PESO > 100 G", "DIÁMETRO < 20 MM", "DIÁMETRO < 25 MM"]) assert.equal(names.standardizeDefectName(value), value)
})

const catalogs = [
    { id: 1, name: "DAÑOI MECANICO", activo: true }, { id: 2, name: "DAÑO MECÁNICO", activo: true },
    { id: 3, name: "PUDRICIÓN / HONGOS", activo: true }, { id: 4, name: "GUSANOS", activo: true },
]
const link = (id, product, catalog, tolerance, activo = true) => ({ id, product_id: product, defect_catalog_id: catalog, tolerance_percentage: tolerance, activo })

test("normalization keeps product-specific tolerance and IDs, records aliases and consolidates only equal criteria", () => {
    const plan = planDefectNormalization(catalogs, [link(10, 1, 1, 2), link(11, 1, 2, 2), link(12, 2, 1, 5), link(13, 1, 3, 0)])
    assert.equal(plan.entries.length, 3)
    assert.equal(plan.targets.get(1), 2)
    assert.deepEqual(plan.merges, [{ sourceId: 11, targetId: 10 }])
    assert.deepEqual(plan.links.map(row => row.id), [10, 12, 13])
    assert(plan.aliases.some(row => row.name === "DAÑOI MECANICO" && row.defectCatalogId === 2))
    assert.equal(plan.entries.find(row => row.id === 4).evaluationKind, "pest_count")
    assert.equal(plan.entries.find(row => row.id === 3).name, "PUDRICIÓN / HONGOS")
})

test("different tolerances in the same product block migration before choosing or discarding a value", () => {
    assert.throws(() => planDefectNormalization(catalogs, [link(10, 1, 1, 2), link(11, 1, 2, 5)]), error => error.codigoEstado === 409 && error.message.includes("10 (2 %)") && error.message.includes("11 (5 %)"))
    for (const value of [-1, 101, NaN, Infinity]) assert.throws(() => planDefectNormalization(catalogs, [link(10, 1, 1, value)]))
    assert.throws(() => planDefectNormalization(catalogs, [link(10, 1, 99, 2)]))
})

test("association input requires a catalog ID, strips client names and rejects duplicate identities", () => {
    const product = { name: "PRODUCTO", varietyProductId: 1, acceptedPercentage: 70 }
    const defect = { defectCatalogId: 2, tolerancePercentage: 2, activo: true }
    const parsed = schema.createProductSchema.parse({ ...product, defects: [{ ...defect, name: "NOMBRE FALSO" }] })
    assert.equal(parsed.defects[0].name, undefined)
    assert(!schema.createProductSchema.safeParse({ ...product, defects: [{ name: "MANCHAS", tolerancePercentage: 2, activo: true }] }).success)
    assert(!schema.createProductSchema.safeParse({ ...product, defects: [defect, { ...defect, tolerancePercentage: 5 }] }).success)
    assert.equal(schema.createDefectCatalogSchema.parse({ name: "pudricion", evaluationKind: "pest_count" }).name, "PUDRICIÓN")
})

test("association names and classification come from the joined catalog, not stored copies", () => {
    const record = Association.build({ id: 7, productId: 1, defectCatalogId: 2, tolerancePercentage: 3, activo: true,
        defectCatalog: { id: 2, name: "DAÑO MECÁNICO", evaluationKind: "percentage", activo: true } }, { include: [Catalog] })
    assert.equal(record.name, "DAÑO MECÁNICO")
    assert.equal(record.toJSON().name, "DAÑO MECÁNICO")
    assert.equal(record.evaluationKind, "percentage")
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

test("renaming a catalog defect retains its old search alias without modifying product tolerances", async context => {
    const originals = { tx: sequelize.transaction, query: sequelize.query, get: Catalog.findByPk, one: Catalog.findOne, alias: Alias.findOrCreate }
    context.after(() => { sequelize.transaction = originals.tx; sequelize.query = originals.query; Catalog.findByPk = originals.get; Catalog.findOne = originals.one; Alias.findOrCreate = originals.alias })
    const aliases = new Map(), record = { id: 2, name: "MANCHA VIEJA", activo: true, evaluationKind: "percentage", update: async function(values) { Object.assign(this, values) } }
    sequelize.transaction = async work => work({ LOCK: { UPDATE: "UPDATE" } })
    sequelize.query = async () => []
    Catalog.findByPk = async () => record
    Catalog.findOne = async () => null
    Alias.findOrCreate = async ({ where, defaults }) => { if (!aliases.has(where.normalizedName)) aliases.set(where.normalizedName, defaults); return [aliases.get(where.normalizedName), true] }
    await service.updateCatalogDefect(2, { name: "MANCHA CORREGIDA" })
    assert.equal(record.name, "MANCHA CORREGIDA")
    assert.equal(aliases.get("MANCHA VIEJA").defectCatalogId, 2)
    assert.equal(aliases.get("MANCHA CORREGIDA").defectCatalogId, 2)
    assert(!Object.hasOwn(record, "tolerancePercentage"))
})

test("dashboard groups reviewed aliases without editing historical result labels", () => {
    const receipt = { id: 1, status: "cerrado", createdAt: "2026-11-20T12:00:00Z", consignment: false,
        fieldDataReceptions: [{ productId: 1, producerId: 1 }], qualityControlDocs: [{ id: 1, percentage: 95, acceptedPercentage: 70, netWeight: 100, validPounds: 95,
            qualityControlDefects: [{ defectName: "DAÑOI MECANICO", input: 5, result: 3 }] }] }
    const aggregation = createDashboardAggregation({}, new Map([["DAÑOI MECANICO", "DAÑO MECÁNICO"]]))
    aggregation.add(receipt)
    assert(JSON.stringify(aggregation.result()).includes("DAÑO MECÁNICO"))
    assert.equal(receipt.qualityControlDocs[0].qualityControlDefects[0].defectName, "DAÑOI MECANICO")
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

test("quality uses explicit pest classification and saves immutable names and tolerances", async context => {
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
    const product = { id: 1, acceptedPercentage: 70, evaluatePests: true }
    const percentage = Association.build({ id: 7, productId: 1, defectCatalogId: 2, tolerancePercentage: 2, activo: true,
        defectCatalog: { id: 2, name: "GUSANOS SUPERFICIALES", evaluationKind: "percentage", activo: true } }, { include: [Catalog] })
    const pest = Association.build({ id: 8, productId: 1, defectCatalogId: 3, tolerancePercentage: 0, activo: true,
        defectCatalog: { id: 3, name: "NOMBRE DE PLAGA CORREGIDO", evaluationKind: "pest_count", activo: true } }, { include: [Catalog] })
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
    const opened = await quality.getContext(5)
    assert.deepEqual(opened.defects.map(row => row.id), [7], "The text does not decide whether a defect is evaluated as a percentage")
    await quality.evaluate(5, { configurationVersion: opened.configurationVersion, expectedVersion: 0,
        harvestDocNumber: "TEST", sampleUnits: 100, ph: null, brix: null, observations: "", inspectorSignature: "synthetic",
        pestInspection: { wormCount: 0, aphidHeadsCount: 0 }, defects: [{ defectId: 7, input: 7 }] }, 1)
    assert.equal(savedDoc.percentage, 95)
    assert.equal(results[0].productDefectId, 7)
    assert.equal(results[0].tolerancePercentage, 2)
    assert.equal(results[0].defectName, "GUSANOS SUPERFICIALES")
    percentage.tolerancePercentage = 99
    percentage.defectCatalog.name = "OTRO NOMBRE"
    assert.equal(results[0].tolerancePercentage, 2)
    assert.equal(results[0].defectName, "GUSANOS SUPERFICIALES")
    assert.equal(field.qualityPercentage, 80)
})

async function postgresHarness(context, work) {
    const { Client } = require("pg")
    const client = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 })
    await client.connect()
    const schemaName = `rmp_defect_check_${process.pid}_${Date.now()}`
    const quoted = `"${schemaName}"`
    await client.query(`CREATE SCHEMA ${quoted}`)
    context.after(async () => {
        try { await client.query(`DROP SCHEMA ${quoted} CASCADE`) } finally { await client.end() }
    })
    await client.query(`SET search_path TO ${quoted}`)
    await client.query(`CREATE TABLE defect_catalog(id BIGINT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT UNIQUE NOT NULL, activo BOOLEAN NOT NULL, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
        CREATE TABLE product_defects(id BIGINT PRIMARY KEY, product_id BIGINT NOT NULL, defect_catalog_id BIGINT NOT NULL REFERENCES defect_catalog(id), name TEXT NOT NULL, tolerance_percentage DOUBLE PRECISION NOT NULL, activo BOOLEAN NOT NULL);
        CREATE UNIQUE INDEX product_defects_product_catalog_unique ON product_defects(product_id,defect_catalog_id);
        CREATE TABLE quality_control_defects(id BIGINT PRIMARY KEY, product_defect_id BIGINT REFERENCES product_defects(id) ON DELETE SET NULL, defect_name TEXT, tolerance_percentage DOUBLE PRECISION, input DOUBLE PRECISION, result DOUBLE PRECISION);
        INSERT INTO defect_catalog(id,name,normalized_name,activo) VALUES (1,'DAÑOI MECANICO','DAÑOI MECANICO',true),(2,'DAÑO MECÁNICO','DANO MECANICO',true),(3,'PUDRICIÓN / HONGOS','PUDRICION / HONGOS',true);
        INSERT INTO product_defects VALUES (10,1,1,'DAÑOI MECANICO',2,true),(11,1,2,'DAÑO MECÁNICO',2,true),(12,2,1,'DAÑOI MECANICO',5,true),(13,1,3,'PUDRICIÓN / HONGOS',0,true);
        INSERT INTO quality_control_defects VALUES (100,11,'DAÑO MECÁNICO',2,5,3),(101,12,'DAÑOI MECANICO',5,7,2),(102,NULL,'DEFECTO LEGADO',4,6,2);
    `)
    const db = {
        transaction: async fn => { await client.query("BEGIN"); try { const result = await fn({}); await client.query("COMMIT"); return result } catch (error) { await client.query("ROLLBACK"); throw error } },
        query: async (sql, options = {}) => {
            const values = []
            sql = sql.replace(/(?<!:):([A-Za-z_]\w*)/g, (_match, key) => { values.push(options.replacements[key]); return `$${values.length}` })
            const result = await client.query(sql, values)
            return options.type === "SELECT" ? result.rows : result
        },
    }
    return work({ client, db })
}

test("PostgreSQL migration preserves snapshots, remaps equivalent IDs, removes redundant names and is idempotent", { skip: !process.env.TEST_DATABASE_URL }, async context => postgresHarness(context, async ({ client, db }) => {
    const before = (await client.query("SELECT id, defect_name, tolerance_percentage, input, result FROM quality_control_defects ORDER BY id")).rows
    assert.equal(await normalizarDefectos(db), true)
    assert.equal(await normalizarDefectos(db), false)
    assert.deepEqual((await client.query("SELECT id, defect_name, tolerance_percentage, input, result FROM quality_control_defects ORDER BY id")).rows, before)
    assert.equal((await client.query("SELECT product_defect_id FROM quality_control_defects WHERE id=100")).rows[0].product_defect_id, 10)
    assert.deepEqual((await client.query("SELECT id,tolerance_percentage FROM product_defects ORDER BY id")).rows, [{ id: 10, tolerance_percentage: 2 }, { id: 12, tolerance_percentage: 5 }, { id: 13, tolerance_percentage: 0 }])
    assert.equal((await client.query("SELECT COUNT(*)::int AS total FROM defect_catalog")).rows[0].total, 2)
    assert((await client.query("SELECT name FROM defect_catalog ORDER BY id")).rows.some(row => row.name === "PUDRICIÓN / HONGOS"))
    assert.equal((await client.query("SELECT COUNT(*)::int AS total FROM defect_normalization_backups")).rows[0].total, 1)
    await assert.rejects(() => client.query("SELECT name FROM product_defects"), error => error.code === "42703")
    await assert.rejects(() => client.query("DELETE FROM product_defects WHERE id=10"), error => error.code === "23503")
}))

test("PostgreSQL tolerance conflicts roll back the entire migration", { skip: !process.env.TEST_DATABASE_URL }, async context => postgresHarness(context, async ({ client, db }) => {
    await client.query("UPDATE product_defects SET tolerance_percentage=9 WHERE id=11")
    await assert.rejects(() => normalizarDefectos(db), error => error.codigoEstado === 409)
    assert.equal((await client.query("SELECT COUNT(*)::int AS total FROM product_defects")).rows[0].total, 4)
    assert.equal((await client.query("SELECT name FROM product_defects WHERE id=10")).rows[0].name, "DAÑOI MECANICO")
    assert.equal((await client.query("SELECT to_regclass('defect_normalization_backups') AS name")).rows[0].name, null)
}))

test("PostgreSQL unknown catalog dependencies block consolidation without cascading deletions", { skip: !process.env.TEST_DATABASE_URL }, async context => postgresHarness(context, async ({ client, db }) => {
    await client.query("CREATE TABLE extra_reference(id BIGINT PRIMARY KEY, defect_catalog_id BIGINT REFERENCES defect_catalog(id)); INSERT INTO extra_reference VALUES (1,1)")
    await assert.rejects(() => normalizarDefectos(db), error => error.codigoEstado === 409 && error.message.includes("extra_reference"))
    assert.equal((await client.query("SELECT defect_catalog_id FROM extra_reference")).rows[0].defect_catalog_id, 1)
    assert.equal((await client.query("SELECT COUNT(*)::int AS total FROM product_defects")).rows[0].total, 4)
}))

test("an empty PostgreSQL schema initializes the normalized models and can restart without repeating cleanup", { skip: !process.env.TEST_DATABASE_URL }, async context => {
    const { Client } = require("pg"), { Sequelize } = require("sequelize-typescript")
    const admin = new Client({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 5000 })
    await admin.connect()
    const schemaName = `rmp_defect_empty_${process.pid}_${Date.now()}`
    await admin.query(`CREATE SCHEMA "${schemaName}"`)
    const fresh = new Sequelize(process.env.TEST_DATABASE_URL, {
        logging: false, repositoryMode: true, models: [...sequelize.modelManager.models],
        schema: schemaName, define: { schema: schemaName }, dialectOptions: { options: `-c search_path=${schemaName}` },
    })
    context.after(async () => {
        try { await fresh.close(); await admin.query(`DROP SCHEMA "${schemaName}" CASCADE`) } finally { await admin.end() }
    })
    const { prepararBaseDatos } = require(path.join(root, "dist/basedatos/prepararBaseDatos"))
    const credentials = { seedAdminUsername: "TEST", seedAdminPassword: "test-only-password" }
    assert.equal(await prepararBaseDatos(fresh, async () => {}, credentials), true)
    assert.equal(await prepararBaseDatos(fresh, async () => {}, credentials), false)
    const [columns] = await fresh.query("SELECT column_name FROM information_schema.columns WHERE table_schema=:schema AND table_name='product_defects'", { replacements: { schema: schemaName } })
    assert(!columns.some(row => row.column_name === "name"))
    assert(columns.some(row => row.column_name === "defect_catalog_id"))
    const [backups] = await fresh.query("SELECT COUNT(*)::int AS total FROM defect_normalization_backups")
    assert.equal(backups[0].total, 1)
})
