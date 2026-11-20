import { Table, Column, DataType, HasMany } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import { EVALUATION_KINDS, type EvaluationKind } from "../utils/defectName"
import DefectAlias from "./DefectAlias.model"

// Solo identifica el defecto. La tolerancia pertenece a ProductDefect.
@Table({ tableName: "defect_catalog" })
export default class DefectCatalog extends ModeloBaseCatalogo {
    @HasMany(() => DefectAlias)
    declare aliases: DefectAlias[]

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string

    @Column({ type: DataType.STRING(255), allowNull: false, unique: true, field: "normalized_name" })
    declare normalizedName: string

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "percentage", field: "evaluation_kind", validate: { isIn: [[...EVALUATION_KINDS]] } })
    declare evaluationKind: EvaluationKind
}
