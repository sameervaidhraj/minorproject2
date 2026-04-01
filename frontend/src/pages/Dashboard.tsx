import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, VaultAPI } from "../services/api";
import { createChannel } from "../services/websocket";
import { Card } from "../components/Card";
import { AlertsFeed } from "../components/AlertsFeed";
import { LeaseTable } from "../components/LeaseTable";
import { ChartCard } from "../components/ChartCard";

export const Dashboard = () => {
  const [leases, setLeases] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>({ logs: [], tamper_detected: false });
  const [vaultStatus, setVaultStatus] = useState<any | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await fetchDashboard();
        setLeases(data.leases);
        setAlerts(data.alerts);
        setAudit(data.audit);
        setVaultStatus(data.vault);
      } catch (error) {
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

    const pullVaultStatus = () =>
      VaultAPI.status()
        .then((response) => setVaultStatus(response.data))
        .catch(() => setVaultStatus(null));

    const unsubAudit = auditChannel.subscribe(() =>
      fetchDashboard().then((data) => {
        setAudit(data.audit);
        setVaultStatus(data.vault);
      })
    );
    const unsubAlerts = alertChannel.subscribe((payload) => setAlerts((current) => [payload, ...current].slice(0, 5)));
    const unsubVault = vaultChannel.subscribe(() => pullVaultStatus());
    const unsubLeases = leaseChannel.subscribe(() =>
      fetchDashboard().then((data) => {
        setLeases(data.leases);
      })
    );

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
    const byHour = leases.reduce<Record<string, number>>((acc, lease) => {
      const hour = new Date(lease.expires_at).getHours().toString().padStart(2, "0");
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(byHour).map(([name, leases]) => ({ name: `${name}:00`, leases }));
  }, [leases]);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">Zero Trust Command Center</p>
        <h2 className="text-4xl font-semibold">Live Operations Dashboard</h2>
      </header>
      <section className="grid grid-cols-3 gap-6">
        <Card title="Vault" accent={vaultStatus?.sealed ? "SEALED" : "UNSEALED"}>
          <p className={`text-3xl font-semibold ${vaultStatus?.sealed ? "text-critical" : "text-success"}`}>
            {vaultStatus ? (vaultStatus.sealed ? "Sealed" : "Unsealed") : "Unknown"}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            {vaultStatus
              ? `Fragments ${vaultStatus.progress}/${vaultStatus.threshold ?? vaultStatus.required}`
              : "Awaiting gatekeeper status"}
          </p>
          {audit.tamper_detected && <p className="text-xs text-critical mt-1">Audit tamper detected</p>}
          {vaultStatus?.remote && (
            <p className="text-xs text-slate-500 mt-1">
              Backing Vault: {vaultStatus.remote.sealed ? "Sealed" : "Unsealed"} · threshold {
                vaultStatus.remote.threshold ?? vaultStatus.remote.required
              }
            </p>
          )}
        </Card>
        <Card title="Active Leases" accent="15 min TTL">
          <p className="text-5xl font-semibold">{leases.filter((lease) => lease.status === "active").length}</p>
          <p className="text-sm text-slate-400 mt-2">Dynamic credentials currently in circulation</p>
        </Card>
        <Card title="Alerts" accent="Realtime">
          <p className="text-5xl font-semibold">{alerts.length}</p>
          <p className="text-sm text-slate-400 mt-2">Security anomalies in the last hour</p>
        </Card>
      </section>
      <section className="grid grid-cols-2 gap-6">
        <Card title="Lease Velocity" accent="Last 24h">
          <ChartCard data={chartData} />
        </Card>
        <Card title="Critical Alerts" accent="Live">
          <AlertsFeed alerts={alerts} />
        </Card>
      </section>
      <section className="grid grid-cols-1 gap-6">
        <Card title="Lease Ledger" accent="Ephemeral">
          <LeaseTable leases={leases} />
        </Card>
      </section>
    </div>
  );
};
