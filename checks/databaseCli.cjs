const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Client } = require('pg')
const { Sequelize } = require('sequelize-typescript')
const path = require('node:path')
const root = path.resolve(__dirname,'..')
const { crearConexion } = require(path.join(root,'dist/basedatos/crearConexion'))
const { leerParametrosBaseDatos } = require(path.join(root,'dist/config/database'))
const { runProductCommand } = require(path.join(root,'dist/basedatos/rebuildProducts.cli'))

test('the CLI loads prepared data with only database configuration and never imports HTTP credentials',{skip:!process.env.TEST_DATABASE_URL},async context=>{
    const admin = new Client({connectionString:process.env.TEST_DATABASE_URL,connectionTimeoutMillis:5000})
    await admin.connect()
    const schema = `rmp_cli_${process.pid}_${Date.now()}`
    await admin.query(`CREATE SCHEMA "${schema}"`)
    const modelSource = crearConexion(leerParametrosBaseDatos({DATABASE_URL:process.env.TEST_DATABASE_URL,DATABASE_SSL:'false'}))
    const db = new Sequelize(process.env.TEST_DATABASE_URL,{
        logging:false,repositoryMode:true,models:[...modelSource.modelManager.models],
        schema,define:{schema},dialectOptions:{options:`-c search_path=${schema}`},
    })
    context.after(async()=>{
        try {await db.close(); await modelSource.close(); await admin.query(`DROP SCHEMA "${schema}" CASCADE`)}
        finally {await admin.end()}
    })
    await db.sync({force:false,alter:false})
    const url = new URL(process.env.TEST_DATABASE_URL)
    url.searchParams.set('options',`-c search_path=${schema}`)
    process.env.DATABASE_URL = url.toString()
    process.env.DATABASE_SSL = 'false'
    for (const name of ['JWT_SECRET','CORS_ORIGINS','SEED_ADMIN_USERNAME','SEED_ADMIN_PASSWORD']) delete process.env[name]
    const role = await db.model('Role').create({name:'CONSERVAR ACCESO'})
    await runProductCommand(['--load-only','--apply'])
    const dataset = require(path.join(root,'data/products/products.json'))
    assert.equal(await db.model('VarietyProduct').count(),dataset.varieties.length)
    assert.equal(await db.model('DefectCatalog').count(),dataset.defects.length)
    assert.equal(await db.model('Product').count(),dataset.products.length)
    assert.equal(await db.model('ProductDefect').count(),dataset.productDefects.length)
    assert.equal((await db.model('Role').findByPk(role.id)).name,'CONSERVAR ACCESO')
    assert(!require.cache[path.join(root,'dist/config/env.js')],'The HTTP environment validator must never be imported by a data command')
})
