import api from './api'

export const getWhitelist = async() => {
    const res = await api.get("/whitelisted-domains/")
    return res.data;
}

export const addDomainToWhitelist = async(domain: string) => {
    const res = await api.post("/whitelisted-domains/", { domain })
    return res.data;
}

export const removeDomainFromWhitelist = async(entryId: number) => {
    const res = await api.delete(`/whitelisted-domains/${entryId}/`)
    return res.data;
}