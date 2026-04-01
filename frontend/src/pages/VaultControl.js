import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { VaultAPI } from "../services/api";
import { Card } from "../components/Card";
import { VaultStatus } from "../components/VaultStatus";
export const VaultControl = () => {
    const [status, setStatus] = useState(null);
    const [panicResult, setPanicResult] = useState(null);
    const [generatedShares, setGeneratedShares] = useState(null);
    const [shareNotice, setShareNotice] = useState(null);
    const refresh = () => VaultAPI.status()
        .then((response) => setStatus(response.data))
        .catch(() => setStatus({ sealed: true }));
    useEffect(() => {
        refresh();
    }, []);
    const seal = async () => {
        try {
            await VaultAPI.seal();
        }
        finally {
            refresh();
        }
    };
    const panic = async () => {
        try {
            const response = await VaultAPI.panic();
            setPanicResult(`Revoked ${response.data.revoked} leases`);
        }
        catch {
            setPanicResult("Panic command requires admin scope");
        }
        finally {
            refresh();
        }
    };
    const generateShares = async () => {
        setShareNotice(null);
        try {
            const { data } = await VaultAPI.init();
            setGeneratedShares(data.shares);
            setShareNotice(`Generated ${data.shares.length} fragments • ${data.threshold} required to unseal.`);
        }
        catch (error) {
            setGeneratedShares(null);
            setShareNotice("Share generation failed (Admin scope required).");
        }
        finally {
            refresh();
        }
    };
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm text-slate-500", children: "Shamir \u2022 Threshold \u2022 Panic Mode" }), _jsx("h2", { className: "text-3xl font-semibold", children: "Vault Governance" })] }), _jsxs("section", { className: "grid grid-cols-2 gap-6", children: [_jsx(Card, { title: "Status", accent: status?.sealed ? "SEALED" : "UNSEALED", children: _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-4xl font-semibold", children: status?.sealed ? "Sealed" : "Unsealed" }), status?.progress !== undefined && (_jsxs("p", { className: "text-sm text-slate-400", children: [status.progress, "/", status.threshold ?? status.required, " fragments submitted"] })), status?.remote && (_jsxs("p", { className: "text-xs text-slate-500", children: ["Backing Vault: ", status.remote.sealed ? "Sealed" : "Unsealed", " \u00B7 threshold ", status.remote.threshold] })), _jsxs("div", { className: "flex gap-4", children: [_jsx("button", { onClick: seal, className: "flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3", children: "Seal Vault" }), _jsx("button", { onClick: panic, className: "flex-1 bg-critical/20 text-critical rounded-xl py-3", children: "Panic Mode" })] }), panicResult && _jsx("p", { className: "text-sm text-critical", children: panicResult })] }) }), _jsx(Card, { title: "Unseal", accent: "3 of 5", children: _jsxs("div", { className: "space-y-5", children: [_jsx(VaultStatus, { onStatusChange: setStatus }), _jsxs("div", { className: "space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-300", children: "Need fresh fragments?" }), _jsx("p", { className: "text-xs text-slate-500", children: "Generates a new 5-of-3 share set." })] }), _jsx("button", { type: "button", onClick: generateShares, className: "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm", children: "Generate Shares" })] }), shareNotice && _jsx("p", { className: "text-xs text-slate-500", children: shareNotice }), generatedShares && (_jsx("div", { className: "space-y-2 max-h-40 overflow-y-auto text-xs font-mono text-slate-200", children: generatedShares.map((share) => (_jsxs("div", { className: "flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2", children: [_jsxs("span", { className: "font-semibold", children: ["#", share.index] }), _jsx("span", { className: "truncate", children: share.fragment })] }, share.index))) }))] })] }) })] })] }));
};
