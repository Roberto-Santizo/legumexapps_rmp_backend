import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import ProductorPlantationControl from "./ProductorPlantationControl.model";
import RmReception from "../../raw-material-receptions/models/RmReception.model";

@Table({
    tableName: "fincas"
})
class Finca extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @Column({
        type: DataType.STRING(255),
        allowNull: true
    })
    declare code: string | null

    // Datos legados opcionales: las nuevas fincas se registran solo por nombre.
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        field: "terminal_id"
    })
    declare terminalId: number | null

    @HasMany(() => ProductorPlantationControl)
    declare productorPlantationControls: ProductorPlantationControl[]

    @HasMany(() => RmReception)
    declare rmReceptions: RmReception[]
}

export default Finca;
