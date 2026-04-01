import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card } from "../components/Card";
import { AuditTimeline } from "../components/AuditTimeline";
export const AuditTrail = () => {
    const [entries, setEntries] = useState([]);
    const [tamper, setTamper] = useState(false);
    useEffect(() => {
        api
            .get("/audit/entries")
            .then((response) => {
            setEntries(response.data.logs);
            setTamper(response.data.tamper_detected);
        })
            .catch(() => {
            setEntries([]);
            setTamper(false);
        });
    }, []);
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm text-slate-500", children: "Immutable \u2022 Linked \u2022 Verifiable" }), _jsx("h2", { className: "text-3xl font-semibold", children: "Audit Chain" })] }), _jsx(Card, { title: "Timeline", accent: tamper ? "CHAIN BREAK" : "VERIFIED", children: _jsx(AuditTimeline, { entries: entries.map((entry) => ({ ...entry, tampered: tamper })) }) })] }));
};
