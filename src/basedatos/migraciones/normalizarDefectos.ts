import { QueryTypes } from "sequelize"
import type { Sequelize } from "sequelize-typescript"
import { ErrorApp } from "../../shared/errores/ErrorApp"
import { planDefectNormalization, type AssociationRow, type CatalogRow } from "./planNormalizacionDefectos"

const VERSION = "defect_catalog_normalized_v2"
const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`

export async function normalizarDefectos(db: Sequelize): Promise<boolean> {
    return db.transaction(async transaction => {
        const options = { transaction }
        await db.query("SET LOCAL lock_timeout = '5s'", options)
        await db.query("SELECT pg_advisory_xact_lock(742019, 1)", options)
        await db.query(`CREATE TABLE IF NOT EXISTS defect_normalization_backups (
            migration_id VARCHAR(100) PRIMARY KEY, snapshot JSONB NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`, options)
        const applied = await db.query<{ migration_id: string }>("SELECT migration_id FROM defect_normalization_backups WHERE migration_id = :version", { ...options, replacements: { version: VERSION }, type: QueryTypes.SELECT })
        if (applied.length) return false
        await db.query("LOCK TABLE defect_catalog, product_defects, quality_control_defects IN SHARE ROW EXCLUSIVE MODE", options)
        const catalog = await db.query<CatalogRow>("SELECT * FROM defect_catalog ORDER BY id", { ...options, type: QueryTypes.SELECT })
        const associations = await db.query<AssociationRow>("SELECT * FROM product_defects ORDER BY id", { ...options, type: QueryTypes.SELECT })
        const plan = planDefectNormalization(catalog, associations)
        // No se borran dependencias desconocidas ni se utiliza CASCADE.
        const foreignKeys = await db.query<{ table_name: string; column_name: string; target: string; constraint_name: string; local_schema: boolean }>(`
            SELECT c.relname AS table_name, a.attname AS column_name, target.relname AS target, k.conname AS constraint_name,
                c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema()) AS local_schema
            FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
            JOIN pg_class target ON target.oid = k.confrelid
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(k.conkey)
            WHERE k.contype = 'f' AND k.confrelid IN ('product_defects'::regclass, 'defect_catalog'::regclass)
        `, { ...options, type: QueryTypes.SELECT })
        for (const fk of foreignKeys) {
            const known = fk.local_schema && (fk.target === "product_defects"
                ? fk.table_name === "quality_control_defects" && fk.column_name === "product_defect_id"
                : ["product_defects", "defect_aliases"].includes(fk.table_name) && fk.column_name === "defect_catalog_id")
            if (!known && (plan.merges.length || plan.entries.length !== catalog.length)) throw new ErrorApp(409, `Existe una dependencia adicional: ${fk.table_name}.${fk.column_name}. Revisa su correspondencia antes de normalizar.`)
        }
        const qualityReferences = await db.query<{ id: number; product_defect_id: number }>("SELECT id, product_defect_id FROM quality_control_defects WHERE product_defect_id IS NOT NULL ORDER BY id", { ...options, type: QueryTypes.SELECT })
        const previousAliases = await db.query<{ exists: boolean }>("SELECT to_regclass('defect_aliases') IS NOT NULL AS exists", { ...options, type: QueryTypes.SELECT })
        if (previousAliases[0].exists) {
            const aliases = await db.query<{ id: number }>("SELECT id FROM defect_aliases LIMIT 1", { ...options, type: QueryTypes.SELECT })
            if (aliases.length) throw new ErrorApp(409, "Ya existen alias sin la versión de migración correspondiente. Revisa el estado de la migración antes de continuar.")
        }
        await db.query(`ALTER TABLE defect_catalog ADD COLUMN IF NOT EXISTS evaluation_kind VARCHAR(20) NOT NULL DEFAULT 'percentage';
            CREATE TABLE IF NOT EXISTS defect_aliases (
                id BIGSERIAL PRIMARY KEY, defect_catalog_id BIGINT NOT NULL REFERENCES defect_catalog(id) ON DELETE RESTRICT,
                name VARCHAR(255) NOT NULL, normalized_name VARCHAR(255) NOT NULL UNIQUE,
                activo BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMPTZ NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL
            );
            CREATE INDEX IF NOT EXISTS defect_aliases_catalog_idx ON defect_aliases(defect_catalog_id);
        `, options)
        // Copia anterior y correspondencias suficientes para una recuperación revisada.
        // No contiene firmas, usuarios ni documentos completos de calidad.
        await db.query("INSERT INTO defect_normalization_backups(migration_id, snapshot) VALUES (:version, CAST(:snapshot AS jsonb))", {
            ...options, replacements: { version: VERSION, snapshot: JSON.stringify({ catalog, associations, qualityReferences, merges: plan.merges, catalogTargets: [...plan.targets] }) },
        })
        for (const merge of plan.merges) {
            await db.query("UPDATE quality_control_defects SET product_defect_id = :target WHERE product_defect_id = :source", { ...options, replacements: { target: merge.targetId, source: merge.sourceId } })
            await db.query("DELETE FROM product_defects WHERE id = :id", { ...options, replacements: { id: merge.sourceId } })
        }
        for (const link of plan.links) await db.query("UPDATE product_defects SET defect_catalog_id = :catalog, activo = :active WHERE id = :id", { ...options, replacements: { catalog: link.defectCatalogId, active: link.activo, id: link.id } })
        // Libera claves antiguas antes de corregir nombres que ahora son equivalentes.
        await db.query("UPDATE defect_catalog SET normalized_name = '__rmp_v2__' || id::text", options)
        for (const row of catalog) if (plan.targets.get(row.id) !== row.id) await db.query("DELETE FROM defect_catalog WHERE id = :id", { ...options, replacements: { id: row.id } })
        for (const row of plan.entries) await db.query(`UPDATE defect_catalog SET name = :name, normalized_name = :key,
            evaluation_kind = :kind, activo = :active, "updatedAt" = NOW() WHERE id = :id`, {
            ...options, replacements: { name: row.name, key: row.normalizedName, kind: row.evaluationKind, active: row.activo, id: row.id },
        })
        for (const alias of plan.aliases) await db.query(`INSERT INTO defect_aliases (name, normalized_name, defect_catalog_id, activo, "createdAt", "updatedAt")
            VALUES (:name, :key, :catalog, true, NOW(), NOW())`, { ...options, replacements: { name: alias.name, key: alias.normalizedName, catalog: alias.defectCatalogId } })
        // La restricción por nombre se elimina junto con la columna; permanece la unicidad por IDs.
        await db.query("ALTER TABLE product_defects DROP COLUMN IF EXISTS name", options)
        for (const fk of foreignKeys.filter(fk => fk.local_schema && fk.target === "product_defects" && fk.table_name === "quality_control_defects" && fk.column_name === "product_defect_id")) {
            await db.query(`ALTER TABLE quality_control_defects DROP CONSTRAINT ${quote(fk.constraint_name)}`, options)
        }
        await db.query(`ALTER TABLE quality_control_defects ADD CONSTRAINT quality_control_defects_product_defect_id_fkey
            FOREIGN KEY (product_defect_id) REFERENCES product_defects(id) ON DELETE RESTRICT;
            ALTER TABLE defect_catalog ADD CONSTRAINT defect_catalog_evaluation_kind_check CHECK (evaluation_kind IN ('percentage', 'pest_count'));
        `, options)
        return true
    })
}
