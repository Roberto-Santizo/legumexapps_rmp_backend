import { DatabaseError, QueryTypes } from "sequelize"
import type { Sequelize } from "sequelize-typescript"
import { ErrorApp } from "../../shared/errores/ErrorApp"

// Equivalente a normalizeDefectName: espacios, mayúsculas y diacríticos.
const displayName = "normalize(upper(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))), NFC)"
const normalizedName = String.raw`regexp_replace(normalize(${displayName}, NFD), U&'[\0300-\036f]', '', 'g')`

export const catalogMigrationSql = `
    LOCK TABLE product_defects IN SHARE ROW EXCLUSIVE MODE;

    DO $$
    DECLARE conflicts text;
    BEGIN
        IF EXISTS (SELECT 1 FROM product_defects WHERE ${normalizedName} = '') THEN
            RAISE EXCEPTION 'Hay defectos sin nombre. Corrige sus nombres antes de migrar el catálogo.';
        END IF;
        SELECT string_agg('producto ' || product_id || ': ' || defect_name || ' (IDs ' || ids || ')', '; ')
        INTO conflicts FROM (
            SELECT product_id, ${normalizedName} AS defect_name, string_agg(id::text, ', ' ORDER BY id) AS ids
            FROM product_defects GROUP BY product_id, ${normalizedName} HAVING count(*) > 1
            ORDER BY product_id LIMIT 10
        ) duplicates;
        IF conflicts IS NOT NULL THEN
            RAISE EXCEPTION 'Hay variantes del mismo defecto en un producto: %. No se modificaron los datos.', conflicts
                USING HINT = 'Revisa las asociaciones y sus tolerancias antes de migrar. No se elige una tolerancia automáticamente.';
        END IF;
    END;
    $$;

    CREATE TABLE IF NOT EXISTS defect_catalog (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        normalized_name VARCHAR(255) NOT NULL UNIQUE,
        activo BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL
    );

    INSERT INTO defect_catalog (name, normalized_name, activo, "createdAt", "updatedAt")
    SELECT DISTINCT ON (normalized_name) name, normalized_name, true, NOW(), NOW()
    FROM (
        SELECT id, ${displayName} AS name, ${normalizedName} AS normalized_name FROM product_defects
    ) names
    ORDER BY normalized_name, (name ~ '[ÁÉÍÓÚÜÑ]') DESC, id
    ON CONFLICT (normalized_name) DO NOTHING;

    ALTER TABLE product_defects ADD COLUMN IF NOT EXISTS defect_catalog_id BIGINT;
    UPDATE product_defects AS pd
    SET defect_catalog_id = catalog.id, name = catalog.name
    FROM defect_catalog AS catalog
    WHERE catalog.normalized_name = (
        SELECT ${normalizedName} FROM (SELECT pd.name AS name) source
    );
    ALTER TABLE product_defects ALTER COLUMN defect_catalog_id SET NOT NULL;
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'product_defects'::regclass
            AND conname = 'product_defects_defect_catalog_id_fkey') THEN
            ALTER TABLE product_defects ADD CONSTRAINT product_defects_defect_catalog_id_fkey
                FOREIGN KEY (defect_catalog_id) REFERENCES defect_catalog(id) ON DELETE RESTRICT;
        END IF;
    END;
    $$;
    -- Se crea al final: también identifica una migración completa en el siguiente arranque.
    CREATE UNIQUE INDEX product_defects_product_catalog_unique ON product_defects (product_id, defect_catalog_id);
`

export async function migrarCatalogoDefectos(db: Sequelize): Promise<boolean> {
    return db.transaction(async transaction => {
        await db.query("SET LOCAL lock_timeout = '5s'", { transaction })
        await db.query("SELECT pg_advisory_xact_lock(742019, 1)", { transaction })
        const [state] = await db.query<{ applied: boolean }>(`
            SELECT EXISTS (SELECT 1 FROM pg_indexes
                WHERE schemaname = current_schema() AND tablename = 'product_defects'
                AND indexname = 'product_defects_product_catalog_unique') AS applied
        `, { transaction, type: QueryTypes.SELECT })
        if (state.applied) return false
        await db.query(catalogMigrationSql, { transaction })
        return true
    }).catch(error => {
        if (error instanceof DatabaseError && error.original.message.startsWith("Hay defectos sin nombre")) {
            throw new ErrorApp(409, error.original.message)
        }
        if (error instanceof DatabaseError && error.original.message.startsWith("Hay variantes del mismo defecto")) {
            throw new ErrorApp(409, error.original.message)
        }
        throw error
    })
}
