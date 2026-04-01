import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { SecretAPI } from "../services/api";
import { Card } from "../components/Card";
import { LeaseTable } from "../components/LeaseTable";
import { SecretsForm } from "../components/SecretsForm";
const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const secs = Math.max(seconds % 60, 0)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
};
export const SecretsManager = () => {
    const [leases, setLeases] = useState([]);
    const [storedSecrets, setStoredSecrets] = useState([]);
    const [issueForm, setIssueForm] = useState({ target: "", secret_type: "DB", ttl_minutes: 15 });
    const [issued, setIssued] = useState(null);
    const [activeSecret, setActiveSecret] = useState(null);
    const [remaining, setRemaining] = useState(0);
    const [viewError, setViewError] = useState(null);
    const refreshLeases = () => SecretAPI.leases()
        .then((response) => setLeases(response.data))
        .catch(() => setLeases([]));
    const refreshStored = () => SecretAPI.listStatic()
        .then((response) => setStoredSecrets(response.data))
        .catch(() => setStoredSecrets([]));
    useEffect(() => {
        refreshLeases();
        refreshStored();
    }, []);
    useEffect(() => {
        if (!activeSecret)
            return;
        const timer = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setActiveSecret(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeSecret?.lease_token]);
    const issueSecret = async (event) => {
        event.preventDefault();
        try {
            const response = await SecretAPI.issue(issueForm);
            setIssued(response.data.lease_id);
            refreshLeases();
        }
        catch (error) {
            setIssued(null);
        }
    };
    const viewSecret = async (secretId) => {
        try {
            const response = await SecretAPI.view(secretId);
            setActiveSecret(response.data);
            setRemaining(response.data.expires_in);
            setViewError(null);
        }
        catch (error) {
            setActiveSecret(null);
            setRemaining(0);
            setViewError("Unable to retrieve secret. Check permissions or vault status.");
        }
    };
    const onSecretStored = () => {
        refreshStored();
    };
    return (_jsxs("div", { className: "space-y-10", children: [_jsxs("header", { children: [_jsx("p", { className: "text-sm text-slate-500", children: "Encrypt \u2022 Classify \u2022 Lease" }), _jsx("h2", { className: "text-3xl font-semibold", children: "Secrets Control Plane" })] }), _jsxs("section", { className: "grid grid-cols-2 gap-6", children: [_jsx(Card, { title: "Store Static Secret", accent: "AES-256 + Vault", children: _jsx(SecretsForm, { onStored: onSecretStored }) }), _jsx(Card, { title: "Issue Dynamic Credential", accent: "15 min TTL", children: _jsxs("form", { onSubmit: issueSecret, className: "space-y-4", children: [_jsx("input", { className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Target System", value: issueForm.target, onChange: (e) => setIssueForm({ ...issueForm, target: e.target.value }), required: true }), _jsx("input", { className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Secret Type", value: issueForm.secret_type, onChange: (e) => setIssueForm({ ...issueForm, secret_type: e.target.value }) }), _jsx("input", { type: "number", min: 5, max: 60, className: "w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", value: issueForm.ttl_minutes, onChange: (e) => setIssueForm({ ...issueForm, ttl_minutes: Number(e.target.value) }) }), _jsx("button", { className: "w-full bg-accent text-slate-950 rounded-xl py-3 font-semibold", type: "submit", children: "Issue Credential" }), issued && _jsxs("p", { className: "text-sm text-success", children: ["Lease #", issued.slice(0, 8), " issued"] })] }) })] }), _jsx(Card, { title: "Static Secret Retrieval", accent: `${storedSecrets.length} stored`, children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-400", children: "Pick a record to mint a 15-minute viewing lease." }), storedSecrets.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "No static secrets have been stored yet." })) : (_jsx("div", { className: "space-y-2 max-h-64 overflow-y-auto pr-1", children: storedSecrets.map((secret) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-white", children: secret.name }), _jsx("p", { className: "text-xs text-slate-400", children: secret.category })] }), _jsx("button", { type: "button", onClick: () => viewSecret(secret.id), className: "text-xs font-semibold text-success bg-success/10 rounded-full px-3 py-1.5", children: "View" })] }, secret.id))) })), viewError && _jsx("p", { className: "text-xs text-critical", children: viewError })] }), _jsx("div", { className: "rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4", children: activeSecret ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm text-slate-300", children: ["Viewing ", activeSecret.name] }), _jsx("p", { className: "text-xs text-slate-500", children: activeSecret.category })] }), _jsx("span", { className: "text-xl font-mono text-critical", children: formatCountdown(remaining) })] }), _jsx("p", { className: "rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-sm break-all", children: activeSecret.secret }), _jsxs("p", { className: "text-[11px] text-slate-500", children: ["Lease token: ", activeSecret.lease_token.slice(0, 12), "\u2026"] })] })) : (_jsx("p", { className: "text-sm text-slate-500", children: "Select a secret to reveal it. The UI will purge the value when the countdown reaches zero." })) })] }) }), _jsx(Card, { title: "Lease Ledger", accent: `${leases.length} records`, children: _jsx(LeaseTable, { leases: leases }) })] }));
};
