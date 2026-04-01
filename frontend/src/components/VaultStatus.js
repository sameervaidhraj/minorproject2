import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { VaultAPI } from "../services/api";
export const VaultStatus = ({ onStatusChange }) => {
    const [share, setShare] = useState({ index: "", fragment: "" });
    const [status, setStatus] = useState(null);
    const [notice, setNotice] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const refreshStatus = useCallback(async () => {
        try {
            const { data } = await VaultAPI.status();
            setStatus(data);
            setNotice(null);
            onStatusChange?.(data);
        }
        catch {
            setNotice("Unable to fetch current status.");
            onStatusChange?.(null);
        }
    }, [onStatusChange]);
    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);
    const submitShare = async () => {
        if (!share.index || !share.fragment) {
            setNotice("Provide both index and fragment.");
            return;
        }
        const parsedIndex = Number.parseInt(share.index, 10);
        if (Number.isNaN(parsedIndex)) {
            setNotice("Share index must be numeric.");
            return;
        }
        setSubmitting(true);
        setNotice(null);
        try {
            await VaultAPI.unseal({ index: parsedIndex, fragment: share.fragment });
            setShare({ index: "", fragment: "" });
            await refreshStatus();
        }
        catch {
            setNotice("Fragment rejected or insufficient scope.");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-4", children: [_jsx("input", { className: "flex-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Share Index", value: share.index, onChange: (e) => setShare({ ...share, index: e.target.value }) }), _jsx("input", { className: "flex-[2] rounded-xl bg-slate-900 border border-slate-800 px-4 py-3", placeholder: "Key Fragment", value: share.fragment, onChange: (e) => setShare({ ...share, fragment: e.target.value }) })] }), _jsx("button", { type: "button", onClick: submitShare, className: "w-full bg-success/20 text-success rounded-xl py-3", disabled: submitting, children: submitting ? "Submitting..." : "Submit Fragment" }), status && (_jsxs("div", { className: "text-sm text-slate-400 space-y-1", children: [_jsxs("p", { children: ["Gatekeeper: ", status.sealed ? "Sealed" : "Unsealed", " \u00B7 ", status.progress, "/", status.threshold ?? status.required] }), status.remote && (_jsxs("p", { className: "text-xs text-slate-500", children: ["Remote Vault: ", status.remote.sealed ? "Sealed" : "Unsealed", " \u00B7 threshold ", status.remote.threshold ?? status.remote.required] }))] })), notice && _jsx("p", { className: "text-xs text-critical", children: notice })] }));
};
