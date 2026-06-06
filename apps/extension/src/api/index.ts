import api from "./api";

export const CheckPhishingUrl = async (url: string) => {
    const response = await api.get("/check-url", {
        params: {
            url
        }
    })

    return response.data
}

export const CheckDownloadUrl = async (url: string, apiKey?: string) => {
    const response = await api.get("/downloads/check-url", {
        params: {
            url,
            api_key: apiKey
        }
    })

    return response.data
}

export const CheckDownloadHash = async (hash: string, apiKey?: string) => {
    const response = await api.get("/downloads/check-hash", {
        params: {
            hash,
            api_key: apiKey
        }
    })

    return response.data
}

export * from "./auth";

