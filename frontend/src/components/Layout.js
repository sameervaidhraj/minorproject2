import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
const TOKEN_KEY = "aegis_token";
const PUBLIC_PATHS = ["/login"];
const links = [
    { to: "/", label: "Dashboard" },
    { to: "/secrets", label: "Secrets" },
    { to: "/audit", label: "Audit Trail" },
    { to: "/access", label: "Access Control" },
    { to: "/vault", label: "Vault" }
];
const isPublicPath = (pathname) => PUBLIC_PATHS.some((path) => pathname.startsWith(path));
export const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const onPublicRoute = isPublicPath(location.pathname);
    useEffect(() => {
        if (!token && !onPublicRoute) {
            navigate("/login", { replace: true, state: { from: location.pathname } });
        }
    }, [navigate, location.pathname, token, onPublicRoute]);
    if (!token && !onPublicRoute) {
        return null;
    }
    return (_jsxs("div", { className: "min-h-screen grid grid-cols-[260px_1fr] bg-slate-950 text-white", children: [_jsxs("aside", { className: "border-r border-slate-800 p-6 flex flex-col gap-10", children: [_jsxs("div", { children: [_jsx("p", { className: "uppercase tracking-[0.4em] text-xs text-slate-400", children: "Project" }), _jsx("h1", { className: "text-2xl font-semibold mt-2", children: "Aegis" })] }), _jsx("nav", { className: "flex flex-col gap-2", children: links.map((link) => (_jsx(NavLink, { to: link.to, className: ({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-slate-800 text-accent" : "text-slate-300 hover:bg-slate-900"}`, children: link.label }, link.to))) }), _jsxs("div", { className: "mt-auto text-xs text-slate-500", children: ["Zero Trust Secrets Ops \u00B7 ", new Date().getFullYear()] })] }), _jsx("main", { className: "p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950", children: _jsx(Outlet, {}) })] }));
};
