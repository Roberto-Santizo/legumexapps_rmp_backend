import type { Sequelize } from "sequelize-typescript"

export async function inicializarEsquemaVacio(db: Sequelize): Promise<boolean> {
    return db.transaction(async transaction => {
        await db.query("SELECT pg_advisory_xact_lock(742019, 1)", { transaction })
        const tables = await db.getQueryInterface().showAllTables({ transaction })
        if (tables.length) return false
        const options = { transaction, force: false, alter: false }
        await db.sync(options)
        await db.query(`
            ALTER TABLE plates ADD CONSTRAINT plates_max_gross_weight_positive CHECK (
                max_gross_weight > 0 AND max_gross_weight < 'Infinity'::double precision
            );
            ALTER TABLE plants ADD CONSTRAINT plants_code_check CHECK (code IN ('LP', 'LT'));
            ALTER TABLE rm_receptions
                ADD CHECK (field_edit_count >= 0),
                ADD CHECK (reception_edit_count >= 0),
                ADD CHECK (quality_edit_count >= 0);
            ALTER TABLE reception_edits ADD CHECK (stage IN ('field', 'reception', 'quality'));
            ALTER TABLE product_defects ADD CHECK (tolerance_percentage BETWEEN 0 AND 100);
            CREATE INDEX reception_edits_receipt_idx ON reception_edits(rm_reception_id, id DESC);
            CREATE INDEX users_plant_id_idx ON users(plant_id);
            CREATE INDEX rm_receptions_plant_id_idx ON rm_receptions(plant_id);
            CREATE FUNCTION prevent_assigned_grn_change() RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.grn IS NOT NULL AND NEW.grn IS DISTINCT FROM OLD.grn THEN
                    RAISE EXCEPTION 'El GRN ya asignado no puede modificarse';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER immutable_assigned_grn BEFORE UPDATE OF grn ON rm_receptions
                FOR EACH ROW EXECUTE FUNCTION prevent_assigned_grn_change();
            CREATE FUNCTION prevent_reception_plant_change() RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.plant_id IS NOT NULL AND NEW.plant_id IS DISTINCT FROM OLD.plant_id THEN
                    RAISE EXCEPTION 'La planta de recepción ya asignada no puede modificarse';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER immutable_reception_plant BEFORE UPDATE OF plant_id ON rm_receptions
                FOR EACH ROW EXECUTE FUNCTION prevent_reception_plant_change();
        `, { transaction })
        return true
    })
}
