import { useEffect, useState } from "react";
import { VaultAPI } from "../services/api";
import { Card } from "../components/Card";
import { VaultStatus } from "../components/VaultStatus";

type VaultShare = { index: number; fragment: string };
type VaultStatusPayload = {
  sealed: boolean;
  progress?: number;
  threshold?: number;
  required?: number;
  remote?: {
    sealed?: boolean;
    threshold?: number;
    required?: number;
  } | null;
};

export const VaultControl = () => {
  const [status, setStatus] = useState<VaultStatusPayload | null>(null);
  const [panicResult, setPanicResult] = useState<string | null>(null);
  const [generatedShares, setGeneratedShares] = useState<VaultShare[] | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const refresh = () =>
    VaultAPI.status()
      .then((response) => setStatus(response.data))
      .catch(() => setStatus({ sealed: true }));

  useEffect(() => {
    refresh();
  }, []);

  const seal = async () => {
    try {
      await VaultAPI.seal();
    } finally {
      refresh();
    }
  };

  const panic = async () => {
    try {
      const response = await VaultAPI.panic();
      setPanicResult(`Revoked ${response.data.revoked} leases`);
    } catch {
      setPanicResult("Panic command requires admin scope");
    } finally {
      refresh();
    }
  };

  const generateShares = async () => {
    setShareNotice(null);
    try {
      const { data } = await VaultAPI.init();
      setGeneratedShares(data.shares);
      setShareNotice(`Generated ${data.shares.length} fragments • ${data.threshold} required to unseal.`);
    } catch (error) {
      setGeneratedShares(null);
      setShareNotice("Share generation failed (Admin scope required).");
    } finally {
      refresh();
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-slate-500">Shamir • Threshold • Panic Mode</p>
        <h2 className="text-3xl font-semibold">Vault Governance</h2>
      </header>
      <section className="grid grid-cols-2 gap-6">
        <Card title="Status" accent={status?.sealed ? "SEALED" : "UNSEALED"}>
          <div className="space-y-2">
            <p className="text-4xl font-semibold">{status?.sealed ? "Sealed" : "Unsealed"}</p>
            {status?.progress !== undefined && (
              <p className="text-sm text-slate-400">
                {status.progress}/{status.threshold ?? status.required} fragments submitted
              </p>
            )}
            {status?.remote && (
              <p className="text-xs text-slate-500">
                Backing Vault: {status.remote.sealed ? "Sealed" : "Unsealed"} · threshold {status.remote.threshold}
              </p>
            )}
            <div className="flex gap-4">
              <button onClick={seal} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-3">
                Seal Vault
              </button>
              <button onClick={panic} className="flex-1 bg-critical/20 text-critical rounded-xl py-3">
                Panic Mode
              </button>
            </div>
            {panicResult && <p className="text-sm text-critical">{panicResult}</p>}
          </div>
        </Card>
        <Card title="Unseal" accent="3 of 5">
          <div className="space-y-5">
            <VaultStatus onStatusChange={setStatus} />
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Need fresh fragments?</p>
                  <p className="text-xs text-slate-500">Generates a new 5-of-3 share set.</p>
                </div>
                <button
                  type="button"
                  onClick={generateShares}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
                >
                  Generate Shares
                </button>
              </div>
              {shareNotice && <p className="text-xs text-slate-500">{shareNotice}</p>}
              {generatedShares && (
                <div className="space-y-2 max-h-40 overflow-y-auto text-xs font-mono text-slate-200">
                  {generatedShares.map((share) => (
                    <div
                      key={share.index}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2"
                    >
                      <span className="font-semibold">#{share.index}</span>
                      <span className="truncate">{share.fragment}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
