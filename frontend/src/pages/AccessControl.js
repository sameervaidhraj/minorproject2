import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AuthAPI } from "../services/api";
import { Card } from "../components/Card";
export const AccessControl = () => {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        AuthAPI.users()
            .then((response) => setUsers(response.data))
            .catch(() => setUsers([]));
    }, []);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm text-slate-500", children: "RBAC \u2022 MFA \u2022 Device Trust" }), _jsx("h2", { className: "text-3xl font-semibold", children: "Identity Perimeter" })] }), _jsx(Card, { title: "User Registry", accent: `${users.length} identities`, children: _jsx("div", { className: "overflow-hidden rounded-2xl border border-slate-800", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-slate-900 text-slate-500 uppercase tracking-widest text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "py-3 px-4 text-left", children: "User" }), _jsx("th", { className: "py-3 px-4 text-left", children: "Role" }), _jsx("th", { className: "py-3 px-4 text-left", children: "Last Login IP" }), _jsx("th", { className: "py-3 px-4 text-left", children: "Created" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { className: "odd:bg-slate-900/40", children: [_jsx("td", { className: "py-3 px-4 font-medium", children: user.username }), _jsx("td", { className: "py-3 px-4 text-slate-300", children: user.role }), _jsx("td", { className: "py-3 px-4 text-slate-400", children: user.last_login_ip ?? "—" }), _jsx("td", { className: "py-3 px-4 text-slate-400", children: user.created_at ? new Date(user.created_at).toLocaleDateString() : "—" })] }, user.id))) })] }) }) })] }));
};
