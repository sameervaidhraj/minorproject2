type AuditEntry = {
  id: number;
  action: string;
  actor_id: number | null;
  created_at: string;
  tampered?: boolean;
};

export const AuditTimeline = ({ entries }: { entries: AuditEntry[] }) => (
  <ol className="relative border-l border-slate-800 pl-6 space-y-6">
    {entries.map((entry) => (
      <li key={entry.id} className="space-y-1">
        <span
          className={`absolute -left-3 w-5 h-5 rounded-full border-2 ${
            entry.tampered ? "border-critical" : "border-accent"
          } bg-slate-950`}
        />
        <p className="text-sm font-semibold">
          {entry.action}
          {entry.tampered && <span className="ml-2 text-critical text-xs">CHAIN BREAK</span>}
        </p>
        <p className="text-xs text-slate-500">Actor #{entry.actor_id ?? "system"}</p>
        <p className="text-xs text-slate-600">{new Date(entry.created_at).toLocaleString()}</p>
      </li>
    ))}
    {entries.length === 0 && <p className="text-slate-500 text-sm">No audit events recorded yet.</p>}
  </ol>
);
