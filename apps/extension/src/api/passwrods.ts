import api from "./api";

type Credential = {
  username: string | null;
  password: string; // JSON string of encrypted data
  iv: number[];
  origin: string;
};

export const getPasswords = async () => {
    const result = await api.get("/passwords/")
    return result.data;
}

export const storePassword = async (credential: Credential) => {
    const result = await api.post("/passwords/", credential)
    return result.data;
}

export const deletePassword = async (id: number) => {
    const result = await api.delete(`/passwords/${id}/`)
    return result.data;
}

export const updatePassword = async (id: number, credential: Credential) => {
    const result = await api.put(`/passwords/${id}/`, credential)
    return result.data;
}