import { z } from "zod"
import { Buffer } from "node:buffer"
import { ErrorApp } from "../errores/ErrorApp"

const MAX_SIGNATURE_BYTES = 3000000
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export function decodeSignatureImage(value: string): { buffer: Buffer; mimeType: "image/png" | "image/jpeg" } {
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
    if (!match || value.length > 4000030) throw new ErrorApp(400, "La firma debe ser una imagen PNG o JPEG válida de hasta 3 MB")
    const buffer = Buffer.from(match[2], "base64")
    if (!buffer.length || buffer.length > MAX_SIGNATURE_BYTES || buffer.toString("base64") !== match[2]) {
        throw new ErrorApp(400, "La firma contiene datos inválidos o supera los 3 MB")
    }
    let png = match[1] === "png" && buffer.length >= 45 && buffer.subarray(0, 8).equals(PNG_HEADER)
        && buffer.toString("ascii", 12, 16) === "IHDR" && buffer.readUInt32BE(8) === 13
        && buffer.toString("ascii", buffer.length - 8, buffer.length - 4) === "IEND"
    let jpeg = match[1] === "jpeg" && buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216
        && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217
    if (!png && !jpeg) throw new ErrorApp(400, "El contenido de la firma no corresponde a una imagen válida")
    if (png) {
        const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20)
        if (!width || !height || width > 4096 || height > 4096) throw new ErrorApp(400, "Las dimensiones de la firma superan el tamaño permitido")
        let offset = 8, hasPixels = false
        while (offset + 12 <= buffer.length) {
            const length = buffer.readUInt32BE(offset)
            if (length > buffer.length - offset - 12) { png = false; break }
            const type = buffer.toString("ascii", offset + 4, offset + 8)
            if (type === "IDAT" && length > 0) hasPixels = true
            offset += length + 12
            if (type === "IEND") break
        }
        png = png && hasPixels && offset === buffer.length
    }
    if (jpeg) {
        let offset = 2, hasDimensions = false, hasScan = false
        while (offset + 4 <= buffer.length) {
            if (buffer[offset] !== 255) break
            while (offset < buffer.length && buffer[offset] === 255) offset++
            if (offset + 3 > buffer.length) break
            const marker = buffer[offset++]
            const length = buffer.readUInt16BE(offset)
            if (length < 2 || length > buffer.length - offset) break
            if ([192, 193, 194].includes(marker) && length >= 8) {
                const height = buffer.readUInt16BE(offset + 3), width = buffer.readUInt16BE(offset + 5)
                hasDimensions = width > 0 && height > 0 && width <= 4096 && height <= 4096
            }
            if (marker === 218) { hasScan = true; break }
            offset += length
        }
        jpeg = jpeg && hasDimensions && hasScan
    }
    if (!png && !jpeg) throw new ErrorApp(400, "La imagen de la firma está incompleta o dañada")
    return { buffer, mimeType: match[1] === "png" ? "image/png" : "image/jpeg" }
}

export const signatureImageSchema = z.string().max(4000030).superRefine((value, ctx) => {
    try { decodeSignatureImage(value) }
    catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Ingresa una firma válida" }) }
})
