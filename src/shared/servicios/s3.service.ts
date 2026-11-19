import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"
import { entorno } from "../../config/env"
import { ErrorApp } from "../errores/ErrorApp"
import { decodeSignatureImage } from "../validacion/signatureImage"

let s3: S3Client | null = null

function obtenerClienteS3(): S3Client {
    if (!entorno.awsRegion || !entorno.awsAccessKeyId || !entorno.awsSecretAccessKey || !entorno.awsS3BucketName) {
        throw new ErrorApp(500, "El almacenamiento de archivos (AWS S3) no está configurado en el servidor.")
    }

    if (!s3) {
        s3 = new S3Client({
            region: entorno.awsRegion,
            credentials: {
                accessKeyId: entorno.awsAccessKeyId,
                secretAccessKey: entorno.awsSecretAccessKey,
            },
        })
    }

    return s3
}

function obtenerUrlPrefijo(): string {
    return `https://${entorno.awsS3BucketName}.s3.${entorno.awsRegion}.amazonaws.com/`
}

export function getS3Url(key: string): string {
    return `${obtenerUrlPrefijo()}${key}`
}

export function getKeyFromUrl(url: string): string {
    const prefix = obtenerUrlPrefijo()
    return url.startsWith(prefix) ? url.slice(prefix.length) : url
}

export function isBase64Image(value: string): boolean {
    return value.startsWith("data:image/")
}

export async function uploadImage(base64: string, folder: string): Promise<string> {
    const { mimeType, buffer } = decodeSignatureImage(base64)
    const extension = mimeType.split("/")[1]
    const key = `${folder}/${Date.now()}-${randomUUID()}.${extension}`

    const client = obtenerClienteS3()
    await client.send(
        new PutObjectCommand({
            Bucket: entorno.awsS3BucketName,
            Key: key,
            Body: buffer,
            ACL: "public-read",
            ContentType: mimeType,
        })
    )

    return getS3Url(key)
}

export async function deleteImage(url: string): Promise<void> {
    const client = obtenerClienteS3()
    await client.send(
        new DeleteObjectCommand({
            Bucket: entorno.awsS3BucketName,
            Key: getKeyFromUrl(url),
        })
    )
}

export async function readSignatureDataUri(url: string): Promise<string> {
    if (/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url) && url.length <= 4000000) return url
    const prefix = obtenerUrlPrefijo()
    if (!url.startsWith(prefix) || !/^signatures\/(field|plant|quality)\/[^/?#]+\.(png|jpeg|jpg)$/.test(url.slice(prefix.length))) {
        throw new ErrorApp(502, "La firma guardada no corresponde al almacenamiento configurado.")
    }
    try {
        const result = await obtenerClienteS3().send(new GetObjectCommand({ Bucket: entorno.awsS3BucketName, Key: url.slice(prefix.length) }))
        if (!result.Body || (result.ContentLength ?? 0) > 3000000) throw new Error("Invalid signature size")
        const buffer = Buffer.from(await result.Body.transformToByteArray())
        if (!buffer.length || buffer.length > 3000000) throw new Error("Invalid signature size")
        const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
        if (!png && !jpeg) throw new Error("Invalid signature image")
        return `data:image/${png ? "png" : "jpeg"};base64,${buffer.toString("base64")}`
    } catch {
        throw new ErrorApp(502, "No se pudo leer una firma de S3. Verifica que exista y que el servidor tenga permiso s3:GetObject antes de generar el PDF.")
    }
}
