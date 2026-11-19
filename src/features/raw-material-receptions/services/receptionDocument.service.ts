import { readSignatureDataUri } from "../../../shared/servicios/s3.service"
import { rmReceptionService } from "./rmReception.service"

export async function getReceptionDocument(id: number) {
    const receipt = await rmReceptionService.getRmReceptionById(id)
    // Work on a detached copy: never persist data URIs or change editable signature URLs.
    const document = receipt.toJSON()
    // The official document uses the same latest evaluation as edits and dashboard.
    if (document.qualityControlDocs?.length) {
        document.qualityControlDocs = [...document.qualityControlDocs].sort((a, b) => b.id - a.id).slice(0, 1)
    }
    const pending: Promise<void>[] = []
    const cache = new Map<string, Promise<string>>()
    function embed(record: Record<string, unknown>, keys: string[]) {
        for (const key of keys) {
            const url = record[key]
            if (typeof url !== "string" || !url) continue
            if (!cache.has(url)) cache.set(url, readSignatureDataUri(url))
            pending.push(cache.get(url)!.then(value => { record[key] = value }))
        }
    }
    for (const field of document.fieldDataReceptions ?? []) embed(field, ["inspectorSignature", "driverSignature", "prodSignature"])
    for (const plant of document.prodDataReceptions ?? []) embed(plant, ["receptorSignature"])
    for (const quality of document.qualityControlDocs ?? []) embed(quality, ["inspectorSignature"])
    await Promise.all(pending)
    return document
}
