import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AxiosError } from "axios";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthAPI } from "../services/api";
const inputStyles = "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-white focus:border-accent focus:outline-none";
export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from ?? "/";
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!username || !password) {
            setError("Enter both username and password");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const { data } = await AuthAPI.login({ username, password });
            localStorage.setItem("aegis_token", data.access_token);
            localStorage.setItem("aegis_refresh", data.refresh_token);
            navigate(from, { replace: true });
        }
        catch (err) {
            const detail = err instanceof AxiosError ? err.response?.data?.detail : null;
            setError(detail ?? "Invalid credentials or rate limit hit");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-slate-950 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.4em] text-slate-500", children: "Project" }), _jsx("h1", { className: "mt-2 text-3xl font-semibold text-white", children: "Aegis Console" }), _jsx("p", { className: "text-sm text-slate-400", children: "Zero Trust Secrets Operations" })] }), _jsxs("form", { className: "space-y-5", onSubmit: handleSubmit, children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-slate-400", children: "Username" }), _jsx("input", { className: inputStyles, value: username, onChange: (e) => setUsername(e.target.value), autoComplete: "username" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-slate-400", children: "Password" }), _jsx("input", { type: "password", className: inputStyles, value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password" })] }), error && _jsx("p", { className: "text-sm text-red-400", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-lg bg-accent px-4 py-3 font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50", children: loading ? "Securing..." : "Continue" })] })] }) }));
};
