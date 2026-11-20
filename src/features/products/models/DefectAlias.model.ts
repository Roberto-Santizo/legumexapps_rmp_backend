import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import DefectCatalog from "./DefectCatalog.model"

@Table({ tableName: "defect_aliases" })
export default class DefectAlias extends ModeloBaseCatalogo {
    @ForeignKey(() => DefectCatalog)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "defect_catalog_id" })
    declare defectCatalogId: number

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string

    @Column({ type: DataType.STRING(255), allowNull: false, unique: true, field: "normalized_name" })
    declare normalizedName: string

    @BelongsTo(() => DefectCatalog, { onDelete: "RESTRICT" })
    declare defectCatalog: DefectCatalog
}
