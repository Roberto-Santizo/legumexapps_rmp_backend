import ExcelJS from "exceljs"

export type FieldReportRow = {
    grn: string
    product: string
    variety: string
    producerCode: string
    producer: string
    finca: string
    cdp: string
    number: string
    plantDate: string
    baskets: number
    grossWeight: number
    netWeight: number
    quality: number | null
    pounds: number | null
    plantGrossWeight: number | null
    plantNetWeight: number | null
    plantQuality: number | null
    plantPounds: number | null
    qualityVariation: number | null
    date: string
    qualityNumber: string
    inspector: string
    plate: string
    pilot: string
    status: "CONSIGNADO" | "APROBADO"
    qualityReasons?: string[]
}

export function buildFieldReportWorkbook(rows: FieldReportRow[]) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Legumex"
    const sheet = workbook.addWorksheet("MATERIA PRIMA", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] })
    sheet.columns = [
        { key: "grn", header: "GRN", width: 22 },
        { key: "product", header: "Nombre del producto", width: 30 },
        { key: "variety", header: "Variedad", width: 24 },
        { key: "producerCode", header: "Cuenta de proveedor", width: 24 },
        { key: "producer", header: "Productor", width: 36 },
        { key: "finca", header: "Finca", width: 32 },
        { key: "cdp", header: "Número de CDP", width: 24 },
        { key: "number", header: "Recibo de materia prima", width: 26 },
        { key: "plantDate", header: "Fecha de recepción de materia prima", width: 30 },
        { key: "baskets", header: "Canastas", width: 16 },
        { key: "grossWeight", header: "Peso Bruto Campo", width: 22 },
        { key: "netWeight", header: "Peso neto materia prima campo", width: 28 },
        { key: "quality", header: "% Calidad campo", width: 20 },
        { key: "pounds", header: "Libras pagables campo", width: 24 },
        { key: "plantGrossWeight", header: "Peso Bruto Planta", width: 22 },
        { key: "plantNetWeight", header: "Peso neto materia prima planta", width: 28 },
        { key: "plantQuality", header: "% Calidad planta", width: 20 },
        { key: "plantPounds", header: "Libras pagables planta", width: 24 },
        { key: "wasteWeightPercentage", header: "% Peso de descho", width: 22 },
        { key: "qualityVariation", header: "Variacion Calidad", width: 22 },
        { key: "date", header: "Fecha de cosecha campo", width: 26 },
        { key: "qualityNumber", header: "Número de boleta CoCa", width: 26 },
        { key: "inspector", header: "Responsable Campo", width: 32 },
        { key: "plate", header: "Placa", width: 18 },
        { key: "pilot", header: "Piloto", width: 30 },
        { key: "status", header: "Estado", width: 20 },
    ]
    // Keep this column empty until the waste weight calculation is defined.
    sheet.addRows(rows.map(row => ({ ...row, wasteWeightPercentage: null })))
    rows.forEach((row, index) => {
        if (row.qualityReasons?.length) sheet.getRow(index + 2).getCell("status").note = row.qualityReasons.join("\n")
    })
    sheet.autoFilter = { from: "A1", to: "Z1" }
    sheet.getRow(1).height = 44
    sheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF166534" } }
        cell.alignment = { vertical: "middle", wrapText: true }
    })
    for (const key of ["grossWeight", "netWeight", "quality", "pounds", "plantGrossWeight", "plantNetWeight", "plantQuality", "plantPounds", "qualityVariation"]) {
        sheet.getColumn(key).numFmt = "#,##0.00"
    }
    sheet.getColumn("baskets").numFmt = "0"
    sheet.eachRow((row, index) => {
        if (index === 1) return
        row.height = 30
        row.eachCell(cell => {
            cell.alignment = { vertical: "top", wrapText: true }
            if (index % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
        })
    })
    return workbook
}
