type SignatureStorage = {
    upload: (image: string, folder: string) => Promise<string>
    remove: (url: string) => Promise<void>
}

// Compensate only uploads from this operation, never persisted historical files.
export async function withSignatureUploads<T>(
    images: { image: string; folder: string }[], storage: SignatureStorage,
    persist: (urls: string[]) => Promise<T>,
): Promise<T> {
    const results = await Promise.allSettled(images.map(({ image, folder }) => storage.upload(image, folder)))
    const urls = results.flatMap(result => result.status === "fulfilled" ? [result.value] : [])
    try {
        const failed = results.find(result => result.status === "rejected")
        if (failed?.status === "rejected") throw failed.reason
        return await persist(urls)
    } catch (error) {
        const removals = await Promise.allSettled(urls.map(async url => storage.remove(url)))
        if (removals.some(result => result.status === "rejected")) console.error("No se pudieron limpiar todas las firmas de una operación fallida")
        throw error
    }
}
