type Lease = {
  lease_id: string;
  target: string;
  secret_type: string;
  expires_at: string;
  status: string;
};

export const LeaseTable = ({ leases }: { leases: Lease[] }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-800">
    <table className="w-full text-sm">
      <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-xs">
        <tr>
          <th className="py-3 px-4 text-left">Lease</th>
          <th className="py-3 px-4 text-left">Target</th>
          <th className="py-3 px-4 text-left">Type</th>
          <th className="py-3 px-4 text-left">Expires</th>
          <th className="py-3 px-4 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {leases.map((lease) => (
          <tr key={lease.lease_id} className="odd:bg-slate-900/30">
            <td className="py-3 px-4 font-mono text-xs">{lease.lease_id.slice(0, 8)}…</td>
            <td className="py-3 px-4">{lease.target}</td>
            <td className="py-3 px-4">{lease.secret_type}</td>
            <td className="py-3 px-4">{new Date(lease.expires_at).toLocaleTimeString()}</td>
            <td className="py-3 px-4">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  lease.status === "active" ? "bg-success/20 text-success" : "bg-slate-800 text-slate-300"
                }`}
              >
                {lease.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {leases.length === 0 && <p className="p-6 text-center text-slate-500">No leases issued.</p>}
  </div>
);
