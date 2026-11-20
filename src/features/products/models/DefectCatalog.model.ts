import { Table, Column, DataType } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"

// Solo identifica el defecto. La tolerancia pertenece a ProductDefect.
@Table({ tableName: "defect_catalog" })
export default class DefectCatalog extends ModeloBaseCatalogo {
    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string

    @Column({ type: DataType.STRING(255), allowNull: false, unique: true, field: "normalized_name" })
    declare normalizedName: string
}
