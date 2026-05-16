/// <reference types="vite/client" />
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_URL
console.log("API Base URL:", API_BASE_URL);

if (!API_BASE_URL) {
    console.error("VITE_API_URL is not defined! API calls will fail.");
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
})

api.interceptors.request.use(async (config) => {
    const data = await chrome.storage.local.get("token")
    const token = data.token

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
}, (error) => {
    return Promise.reject(error)
})

api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status == 401) {
        console.log("Session Expired")
        chrome.storage.local.remove(['token', 'user'])
    }
    return Promise.reject(error)
})

export default api