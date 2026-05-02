import api from "./api";

export const CheckPhishingUrl = async (url: string) => {
    const response = await api.get("/check-url", {
        params: {
            url
        }
    })

    return response.data
}