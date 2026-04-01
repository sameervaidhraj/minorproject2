type Alert = {
  id: number;
  severity: string;
  title: string;
  description: string;
  created_at: string;
};

const severityBadge: Record<string, string> = {
  INFO: "text-success",
  WARNING: "text-amber-300",
  CRITICAL: "text-critical"
};

export const AlertsFeed = ({ alerts }: { alerts: Alert[] }) => (
  <div className="space-y-4">
    {alerts.map((alert) => (
      <article key={alert.id} className="border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium">{alert.title}</p>
          <span className={`text-xs font-semibold ${severityBadge[alert.severity] ?? "text-slate-400"}`}>
            {alert.severity}
          </span>
        </div>
        <p className="text-sm text-slate-400">{alert.description}</p>
        <p className="mt-3 text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</p>
      </article>
    ))}
    {alerts.length === 0 && <p className="text-slate-500 text-sm">All quiet across the perimeter.</p>}
  </div>
);
