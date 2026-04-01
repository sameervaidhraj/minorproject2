import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("aegis_token");
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
export const fetchDashboard = async () => {
    const [leases, alerts, audit, vault] = await Promise.all([
        api.get("/secrets/leases"),
        api.get("/alerts"),
        api.get("/audit/entries"),
        api.get("/vault/status")
    ]);
    return {
        leases: leases.data,
        alerts: alerts.data,
        audit: audit.data,
        vault: vault.data
    };
};
export const VaultAPI = {
    status: () => api.get("/vault/status"),
    init: () => api.post("/vault/init"),
    unseal: (payload) => api.post("/vault/unseal", payload),
    seal: () => api.post("/vault/seal"),
    panic: () => api.post("/vault/panic")
};
export const SecretAPI = {
    store: (payload) => api.post("/secrets/store", payload),
    issue: (payload) => api.post("/secrets/issue", payload),
    leases: () => api.get("/secrets/leases"),
    listStatic: () => api.get("/secrets/static"),
    view: (secretId) => api.post(`/secrets/static/${secretId}/view`, {})
};
export const AuthAPI = {
    login: (payload) => api.post("/auth/login", payload),
    users: () => api.get("/auth/users")
};
