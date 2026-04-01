import { useEffect, useState } from "react";
import { SecretAPI } from "../services/api";
import { Card } from "../components/Card";
import { LeaseTable } from "../components/LeaseTable";
import { SecretsForm } from "../components/SecretsForm";

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.max(seconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
};

export const SecretsManager = () => {
  const [leases, setLeases] = useState<any[]>([]);
  const [storedSecrets, setStoredSecrets] = useState<any[]>([]);
  const [issueForm, setIssueForm] = useState({ target: "", secret_type: "DB", ttl_minutes: 15 });
  const [issued, setIssued] = useState<string | null>(null);
  const [activeSecret, setActiveSecret] = useState<any | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [viewError, setViewError] = useState<string | null>(null);

  const refreshLeases = () =>
    SecretAPI.leases()
      .then((response) => setLeases(response.data))
      .catch(() => setLeases([]));

  const refreshStored = () =>
    SecretAPI.listStatic()
      .then((response) => setStoredSecrets(response.data))
      .catch(() => setStoredSecrets([]));

  useEffect(() => {
    refreshLeases();
    refreshStored();
  }, []);

  useEffect(() => {
    if (!activeSecret) return;
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

  const issueSecret = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await SecretAPI.issue(issueForm);
      setIssued(response.data.lease_id);
      refreshLeases();
    } catch (error) {
      setIssued(null);
    }
  };

  const viewSecret = async (secretId: number) => {
    try {
      const response = await SecretAPI.view(secretId);
      setActiveSecret(response.data);
      setRemaining(response.data.expires_in);
      setViewError(null);
    } catch (error) {
      setActiveSecret(null);
      setRemaining(0);
      setViewError("Unable to retrieve secret. Check permissions or vault status.");
    }
  };

  const onSecretStored = () => {
    refreshStored();
  };

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm text-slate-500">Encrypt • Classify • Lease</p>
        <h2 className="text-3xl font-semibold">Secrets Control Plane</h2>
      </header>
      <section className="grid grid-cols-2 gap-6">
        <Card title="Store Static Secret" accent="AES-256 + Vault">
          <SecretsForm onStored={onSecretStored} />
        </Card>
        <Card title="Issue Dynamic Credential" accent="15 min TTL">
          <form onSubmit={issueSecret} className="space-y-4">
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
              placeholder="Target System"
              value={issueForm.target}
              onChange={(e) => setIssueForm({ ...issueForm, target: e.target.value })}
              required
            />
            <input
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
              placeholder="Secret Type"
              value={issueForm.secret_type}
              onChange={(e) => setIssueForm({ ...issueForm, secret_type: e.target.value })}
            />
            <input
              type="number"
              min={5}
              max={60}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
              value={issueForm.ttl_minutes}
              onChange={(e) => setIssueForm({ ...issueForm, ttl_minutes: Number(e.target.value) })}
            />
            <button className="w-full bg-accent text-slate-950 rounded-xl py-3 font-semibold" type="submit">
              Issue Credential
            </button>
            {issued && <p className="text-sm text-success">Lease #{issued.slice(0, 8)} issued</p>}
          </form>
        </Card>
      </section>
      <Card title="Static Secret Retrieval" accent={`${storedSecrets.length} stored`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Pick a record to mint a 15-minute viewing lease.</p>
            {storedSecrets.length === 0 ? (
              <p className="text-sm text-slate-500">No static secrets have been stored yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {storedSecrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{secret.name}</p>
                      <p className="text-xs text-slate-400">{secret.category}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => viewSecret(secret.id)}
                      className="text-xs font-semibold text-success bg-success/10 rounded-full px-3 py-1.5"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
            {viewError && <p className="text-xs text-critical">{viewError}</p>}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            {activeSecret ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Viewing {activeSecret.name}</p>
                    <p className="text-xs text-slate-500">{activeSecret.category}</p>
                  </div>
                  <span className="text-xl font-mono text-critical">{formatCountdown(remaining)}</span>
                </div>
                <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-sm break-all">
                  {activeSecret.secret}
                </p>
                <p className="text-[11px] text-slate-500">
                  Lease token: {activeSecret.lease_token.slice(0, 12)}…
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Select a secret to reveal it. The UI will purge the value when the countdown reaches zero.
              </p>
            )}
          </div>
        </div>
      </Card>
      <Card title="Lease Ledger" accent={`${leases.length} records`}>
        <LeaseTable leases={leases} />
      </Card>
    </div>
  );
};
