import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Product from "./Product.model"
import DefectCatalog from "./DefectCatalog.model"

// Configuración propia de un producto/variedad; no es un resultado de evaluación.
@Table({ tableName: "product_defects", indexes: [
    { name: "product_defects_product_catalog_unique", unique: true, fields: ["product_id", "defect_catalog_id"] },
] })
export default class ProductDefect extends ModeloBaseCatalogo {
    @ForeignKey(() => DefectCatalog)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "defect_catalog_id" })
    declare defectCatalogId: number

    @BelongsTo(() => DefectCatalog, { onDelete: "RESTRICT" })
    declare defectCatalog: DefectCatalog

    @ForeignKey(() => Product)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "product_id" })
    declare productId: number

    // Conserva el contrato JSON sin duplicar el nombre en la tabla de asociaciones.
    @Column(DataType.VIRTUAL)
    get name(): string { return this.defectCatalog?.name ?? "" }

    @Column(DataType.VIRTUAL)
    get catalogActive(): boolean { return this.defectCatalog?.activo ?? false }

    @Column({ type: DataType.DOUBLE, allowNull: false, field: "tolerance_percentage", validate: { min: 0, max: 100 } })
    declare tolerancePercentage: number

    @BelongsTo(() => Product)
    declare product: Product
}
