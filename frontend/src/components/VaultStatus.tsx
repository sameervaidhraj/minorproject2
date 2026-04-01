import { useCallback, useEffect, useState } from "react";
import { VaultAPI } from "../services/api";

type GatekeeperStatus = {
  sealed: boolean;
  progress: number;
  required: number;
  threshold?: number;
  remote?: {
    sealed?: boolean;
    threshold?: number;
    required?: number;
  } | null;
};

type VaultStatusProps = {
  onStatusChange?: (status: GatekeeperStatus | null) => void;
};

export const VaultStatus = ({ onStatusChange }: VaultStatusProps) => {
  const [share, setShare] = useState({ index: "", fragment: "" });
  const [status, setStatus] = useState<GatekeeperStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await VaultAPI.status();
      setStatus(data);
      setNotice(null);
      onStatusChange?.(data);
    } catch {
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
    } catch {
      setNotice("Fragment rejected or insufficient scope.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
          placeholder="Share Index"
          value={share.index}
          onChange={(e) => setShare({ ...share, index: e.target.value })}
        />
        <input
          className="flex-[2] rounded-xl bg-slate-900 border border-slate-800 px-4 py-3"
          placeholder="Key Fragment"
          value={share.fragment}
          onChange={(e) => setShare({ ...share, fragment: e.target.value })}
        />
      </div>
      <button
        type="button"
        onClick={submitShare}
        className="w-full bg-success/20 text-success rounded-xl py-3"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit Fragment"}
      </button>
      {status && (
        <div className="text-sm text-slate-400 space-y-1">
          <p>
            Gatekeeper: {status.sealed ? "Sealed" : "Unsealed"} · {status.progress}/{status.threshold ?? status.required}
          </p>
          {status.remote && (
            <p className="text-xs text-slate-500">
              Remote Vault: {status.remote.sealed ? "Sealed" : "Unsealed"} · threshold {status.remote.threshold ?? status.remote.required}
            </p>
          )}
        </div>
      )}
      {notice && <p className="text-xs text-critical">{notice}</p>}
    </div>
  );
};
