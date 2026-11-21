const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { Sequelize } = require('sequelize-typescript')
const { DataTypes } = require('sequelize')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const { sequelize } = require(path.join(root, 'dist/basedatos/conexion'))
const { inicializarEsquema } = require(path.join(root, 'dist/basedatos/inicializarEsquema'))
const { rebuildProducts } = require(path.join(root, 'dist/basedatos/rebuildProducts'))
const reviewed = {
    version:1, varieties:[{id:1,name:'AVENGER',activo:true}],
    defects:[{id:1,name:'DAÑO MECÁNICO',activo:true},{id:2,name:'PUDRICIÓN / HONGOS',activo:true}],
    products:[
        {id:1,name:'BRÓCOLI CON TALLO',varietyProductId:1,acceptedPercentage:75,evaluatePests:true,activo:true},
        {id:2,name:'BRÓCOLI PARTIDO',varietyProductId:1,acceptedPercentage:70,evaluatePests:false,activo:true},
    ],
    productDefects:[
        {id:1,productId:1,defectCatalogId:1,tolerancePercentage:2,activo:true},
        {id:2,productId:2,defectCatalogId:1,tolerancePercentage:5,activo:true},
        {id:3,productId:1,defectCatalogId:2,tolerancePercentage:0,activo:true},
    ],
}
async function harness(context, work) {
    const admin = new Client({connectionString:process.env.TEST_DATABASE_URL,connectionTimeoutMillis:5000})
    await admin.connect()
    const schema = `rmp_rebuild_${process.pid}_${Date.now()}`
    await admin.query(`CREATE SCHEMA "${schema}"`)
    const db = new Sequelize(process.env.TEST_DATABASE_URL, {
        logging:false, repositoryMode:true, models:[...sequelize.modelManager.models],
        schema, define:{schema}, dialectOptions:{options:`-c search_path=${schema}`},
    })
    context.after(async()=>{try {await db.close(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`)} finally {await admin.end()}})
    await work(db, schema)
}
const enabled = {skip:!process.env.TEST_DATABASE_URL}

test('ORM initializes and restarts without aliases, backups, legacy columns, functions or custom triggers',enabled,async context=>harness(context,async(db,schema)=>{
    assert.equal(await inicializarEsquema(db),true)
    assert.equal(await inicializarEsquema(db),false)
    const tables = await db.query('SELECT t.table_name FROM information_schema.tables t WHERE t.table_schema=:schema',{replacements:{schema},type:'SELECT'})
    assert(tables.some(row=>row.table_name==='quality_control_defects'))
    assert(!tables.some(row=>['defect_aliases','defect_normalization_backups'].includes(row.table_name)))
    const [columns] = await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=:schema AND table_name IN ('product_defects','quality_control_defects','defect_catalog')",{replacements:{schema}})
    assert(!columns.some(row=>row.column_name==='evaluation_kind'||row.column_name==='defect_id'||(row.table_name==='product_defects'&&row.column_name==='name')))
    const [triggers] = await db.query('SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=:schema AND NOT t.tgisinternal',{replacements:{schema}})
    assert.equal(triggers.length,0)
    const [functions] = await db.query('SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=:schema',{replacements:{schema}})
    assert.equal(functions.length,0)
}))

test('one ORM rebuild removes obsolete tables, loads reviewed data and leaves other catalogs intact',enabled,async context=>harness(context,async(db,schema)=>{
    await inicializarEsquema(db)
    const role = await db.model('Role').create({name:'CONSERVAR ROL'})
    await db.model('VarietyProduct').create({name:'ANTIGUA'})
    const qi = db.getQueryInterface()
    for (const tableName of ['defect_aliases','defect_normalization_backups']) await qi.createTable({tableName,schema},{id:{type:DataTypes.BIGINT,primaryKey:true}})
    assert.deepEqual(await rebuildProducts(db,reviewed),{varieties:1,products:2,defects:2,productDefects:3})
    const product = await db.model('Product').findByPk(1,{include:[db.model('VarietyProduct')]})
    assert.equal(product.varietyProduct.name,'AVENGER')
    assert.equal(product.evaluatePests,true)
    assert.equal(await db.model('Role').count(),1)
    assert.equal((await db.model('Role').findByPk(role.id)).name,'CONSERVAR ROL')
    assert.deepEqual((await db.model('ProductDefect').findAll({order:[['id','ASC']]})).map(row=>row.tolerancePercentage),[2,5,0])
    assert.equal(await db.model('QualityControlDoc').count(),0)
    const next = await db.model('DefectCatalog').create({name:'NUEVO DEFECTO'})
    assert.equal(next.id,3,'The next insert works without SQL sequence repair')
    assert.equal(next.normalizedName,'NUEVO DEFECTO')
    const tables = await db.query('SELECT t.table_name FROM information_schema.tables t WHERE t.table_schema=:schema',{replacements:{schema},type:'SELECT'})
    assert(!tables.some(row=>['defect_aliases','defect_normalization_backups'].includes(row.table_name)))
    await assert.rejects(()=>db.model('ProductDefect').create({productId:1,defectCatalogId:1,tolerancePercentage:7,activo:true}),error=>error.name==='SequelizeUniqueConstraintError')
    await assert.rejects(()=>db.model('Product').create({name:' brócoli   con tallo ',varietyProductId:1,acceptedPercentage:80}),error=>error.name==='SequelizeUniqueConstraintError')
    await assert.rejects(()=>db.model('DefectCatalog').create({name:' daño mecanico '}),error=>error.name==='SequelizeUniqueConstraintError')
}))

test('an unknown dependent table aborts the rebuild and rolls back earlier table drops',enabled,async context=>harness(context,async(db,schema)=>{
    await inicializarEsquema(db)
    await rebuildProducts(db,reviewed)
    const qi = db.getQueryInterface()
    await qi.createTable({tableName:'defect_normalization_backups',schema},{id:{type:DataTypes.BIGINT,primaryKey:true}})
    await qi.createTable({tableName:'outside_reference',schema},{id:{type:DataTypes.BIGINT,primaryKey:true},product_id:{type:DataTypes.BIGINT,references:{model:db.model('Product').getTableName(),key:'id'}}})
    const beforeTables = await db.query('SELECT t.table_name FROM information_schema.tables t WHERE t.table_schema=:schema',{replacements:{schema},type:'SELECT'})
    assert(beforeTables.some(row=>row.table_name==='defect_normalization_backups'))
    const before = (await db.model('ProductDefect').findAll({order:[['id','ASC']]})).map(row=>row.toJSON())
    await assert.rejects(()=>rebuildProducts(db,reviewed),error=>error.original?.code==='2BP01')
    assert.deepEqual((await db.model('ProductDefect').findAll({order:[['id','ASC']]})).map(row=>row.toJSON()),before)
    const tables = await db.query('SELECT t.table_name FROM information_schema.tables t WHERE t.table_schema=:schema',{replacements:{schema},type:'SELECT'})
    assert(tables.some(row=>row.table_name==='defect_normalization_backups'),'The earlier obsolete table drop was rolled back')
}))

test('the complete CSV snapshot loads with all product-specific tolerances in an isolated test schema',enabled,async context=>harness(context,async(db)=>{
    await inicializarEsquema(db)
    const snapshot = structuredClone(require(path.join(root,'data/products/products.json')))
    await rebuildProducts(db,snapshot)
    assert.equal(await db.model('Product').count(),snapshot.products.length)
    assert.equal(await db.model('DefectCatalog').count(),snapshot.defects.length)
    assert.equal(await db.model('VarietyProduct').count(),snapshot.varieties.length)
    const links = (await db.model('ProductDefect').findAll({order:[['id','ASC']]})).map(row=>({
        id:row.id,productId:row.productId,defectCatalogId:row.defectCatalogId,tolerancePercentage:row.tolerancePercentage,activo:row.activo,
    }))
    assert.deepEqual(links,snapshot.productDefects)
    const next = await db.model('Product').create({name:'PRODUCTO DE PRUEBA',varietyProductId:1,acceptedPercentage:70})
    assert.equal(next.id,snapshot.products.length+1)
}))
