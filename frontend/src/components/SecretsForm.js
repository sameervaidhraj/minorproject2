import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { SecretAPI } from "../services/api";
const categories = [
    { label: "API Key", value: "API_KEY" },
    { label: "Database", value: "DATABASE" },
    { label: "SSH", value: "SSH_KEY" }
];
export const SecretsForm = ({ onStored }) => {
    const [form, setForm] = useState({ name: "", category: "API_KEY", secret_value: "" });
    const [message, setMessage] = useState(null);
    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await SecretAPI.store(form);
            setMessage("Secret encrypted & stored in Vault");
            setForm({ ...form, secret_value: "" });
            onStored?.();
        }
        catch (error) {
            setMessage("Unable to store secret (auth required)");
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("input", { className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Name (e.g. prod-stripe-key)", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true }), _jsx("select", { className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), children: categories.map((category) => (_jsx("option", { value: category.value, children: category.label }, category.value))) }), _jsx("textarea", { className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Secret value", rows: 4, value: form.secret_value, onChange: (e) => setForm({ ...form, secret_value: e.target.value }), required: true }), _jsx("button", { className: "w-full bg-accent text-slate-950 rounded-xl py-3 font-semibold", type: "submit", children: "Store Secret" }), message && _jsx("p", { className: "text-sm text-success", children: message })] }));
};
