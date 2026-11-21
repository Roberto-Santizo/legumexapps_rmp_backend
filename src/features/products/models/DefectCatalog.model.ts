import { Table, Column, DataType, BeforeValidate } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import { normalizeDefectName, standardizeDefectName } from "../utils/defectName"

// Solo identifica el defecto. La tolerancia pertenece a ProductDefect.
@Table({ tableName: "defect_catalog" })
export default class DefectCatalog extends ModeloBaseCatalogo {
    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string

    @Column({ type: DataType.STRING(255), allowNull: false, unique: true, field: "normalized_name" })
    declare normalizedName: string

    @BeforeValidate
    static normalizeName(record: DefectCatalog) {
        if (typeof record.name === "string") {
            record.name = standardizeDefectName(record.name)
            record.normalizedName = normalizeDefectName(record.name)
        }
    }
}
