import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const severityBadge = {
    INFO: "text-success",
    WARNING: "text-amber-300",
    CRITICAL: "text-critical"
};
export const AlertsFeed = ({ alerts }) => (_jsxs("div", { className: "space-y-4", children: [alerts.map((alert) => (_jsxs("article", { className: "border border-slate-800 rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("p", { className: "font-medium", children: alert.title }), _jsx("span", { className: `text-xs font-semibold ${severityBadge[alert.severity] ?? "text-slate-400"}`, children: alert.severity })] }), _jsx("p", { className: "text-sm text-slate-400", children: alert.description }), _jsx("p", { className: "mt-3 text-xs text-slate-500", children: new Date(alert.created_at).toLocaleString() })] }, alert.id))), alerts.length === 0 && _jsx("p", { className: "text-slate-500 text-sm", children: "All quiet across the perimeter." })] }));
