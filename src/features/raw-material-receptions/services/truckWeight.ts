import { ErrorApp } from "../../../shared/errores/ErrorApp"

export function assertTruckGrossWeight(plate: { name: string; maxGrossWeight?: number | null }, grossWeight: number): void {
    const maximum = plate.maxGrossWeight
    if (maximum == null || !Number.isFinite(maximum) || maximum <= 0) {
        throw new ErrorApp(409, `Configura el peso bruto máximo de la placa ${plate.name} antes de continuar.`)
    }
    if (!Number.isFinite(grossWeight) || grossWeight <= 0) throw new ErrorApp(400, "Ingresa un peso bruto mayor a cero.")
    if (grossWeight > maximum) {
        const limit = maximum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        throw new ErrorApp(400, `El peso bruto supera el máximo de ${limit} lb permitido para la placa ${plate.name}.`)
    }
}
