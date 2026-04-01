import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, VaultAPI } from "../services/api";
import { createChannel } from "../services/websocket";
import { Card } from "../components/Card";
import { AlertsFeed } from "../components/AlertsFeed";
import { LeaseTable } from "../components/LeaseTable";
import { ChartCard } from "../components/ChartCard";
export const Dashboard = () => {
    const [leases, setLeases] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [audit, setAudit] = useState({ logs: [], tamper_detected: false });
    const [vaultStatus, setVaultStatus] = useState(null);
    useEffect(() => {
        const bootstrap = async () => {
            try {
                const data = await fetchDashboard();
                setLeases(data.leases);
                setAlerts(data.alerts);
                setAudit(data.audit);
                setVaultStatus(data.vault);
            }
            catch (error) {
                console.warn("Fallback data in use", error);
                setLeases([]);
                setAlerts([]);
                setAudit({ logs: [], tamper_detected: false });
                setVaultStatus(null);
            }
        };
        bootstrap();
        const auditChannel = createChannel("/ws/audit");
        const alertChannel = createChannel("/ws/alerts");
        const vaultChannel = createChannel("/ws/vault");
        const leaseChannel = createChannel("/ws/leases");
        const pullVaultStatus = () => VaultAPI.status()
            .then((response) => setVaultStatus(response.data))
            .catch(() => setVaultStatus(null));
        const unsubAudit = auditChannel.subscribe(() => fetchDashboard().then((data) => {
            setAudit(data.audit);
            setVaultStatus(data.vault);
        }));
        const unsubAlerts = alertChannel.subscribe((payload) => setAlerts((current) => [payload, ...current].slice(0, 5)));
        const unsubVault = vaultChannel.subscribe(() => pullVaultStatus());
        const unsubLeases = leaseChannel.subscribe(() => fetchDashboard().then((data) => {
            setLeases(data.leases);
        }));
        return () => {
            unsubAudit();
            unsubAlerts();
            unsubVault();
            unsubLeases();
            auditChannel.close();
            alertChannel.close();
            vaultChannel.close();
            leaseChannel.close();
        };
    }, []);
    const chartData = useMemo(() => {
        const byHour = leases.reduce((acc, lease) => {
            const hour = new Date(lease.expires_at).getHours().toString().padStart(2, "0");
            acc[hour] = (acc[hour] ?? 0) + 1;
            return acc;
        }, {});
        return Object.entries(byHour).map(([name, leases]) => ({ name: `${name}:00`, leases }));
    }, [leases]);
    return (_jsxs("div", { className: "space-y-10", children: [_jsxs("header", { className: "flex flex-col gap-2", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Zero Trust Command Center" }), _jsx("h2", { className: "text-4xl font-semibold", children: "Live Operations Dashboard" })] }), _jsxs("section", { className: "grid grid-cols-3 gap-6", children: [_jsxs(Card, { title: "Vault", accent: vaultStatus?.sealed ? "SEALED" : "UNSEALED", children: [_jsx("p", { className: `text-3xl font-semibold ${vaultStatus?.sealed ? "text-critical" : "text-success"}`, children: vaultStatus ? (vaultStatus.sealed ? "Sealed" : "Unsealed") : "Unknown" }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: vaultStatus
                                    ? `Fragments ${vaultStatus.progress}/${vaultStatus.threshold ?? vaultStatus.required}`
                                    : "Awaiting gatekeeper status" }), audit.tamper_detected && _jsx("p", { className: "text-xs text-critical mt-1", children: "Audit tamper detected" }), vaultStatus?.remote && (_jsxs("p", { className: "text-xs text-slate-500 mt-1", children: ["Backing Vault: ", vaultStatus.remote.sealed ? "Sealed" : "Unsealed", " \u00B7 threshold ", vaultStatus.remote.threshold ?? vaultStatus.remote.required] }))] }), _jsxs(Card, { title: "Active Leases", accent: "15 min TTL", children: [_jsx("p", { className: "text-5xl font-semibold", children: leases.filter((lease) => lease.status === "active").length }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: "Dynamic credentials currently in circulation" })] }), _jsxs(Card, { title: "Alerts", accent: "Realtime", children: [_jsx("p", { className: "text-5xl font-semibold", children: alerts.length }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: "Security anomalies in the last hour" })] })] }), _jsxs("section", { className: "grid grid-cols-2 gap-6", children: [_jsx(Card, { title: "Lease Velocity", accent: "Last 24h", children: _jsx(ChartCard, { data: chartData }) }), _jsx(Card, { title: "Critical Alerts", accent: "Live", children: _jsx(AlertsFeed, { alerts: alerts }) })] }), _jsx("section", { className: "grid grid-cols-1 gap-6", children: _jsx(Card, { title: "Lease Ledger", accent: "Ephemeral", children: _jsx(LeaseTable, { leases: leases }) }) })] }));
};
