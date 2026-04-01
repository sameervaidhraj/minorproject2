import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card } from "../components/Card";
import { AuditTimeline } from "../components/AuditTimeline";

export const AuditTrail = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [tamper, setTamper] = useState(false);

  useEffect(() => {
    api
      .get("/audit/entries")
      .then((response) => {
        setEntries(response.data.logs);
        setTamper(response.data.tamper_detected);
      })
      .catch(() => {
        setEntries([]);
        setTamper(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-slate-500">Immutable • Linked • Verifiable</p>
        <h2 className="text-3xl font-semibold">Audit Chain</h2>
      </header>
      <Card title="Timeline" accent={tamper ? "CHAIN BREAK" : "VERIFIED"}>
        <AuditTimeline entries={entries.map((entry) => ({ ...entry, tampered: tamper }))} />
      </Card>
    </div>
  );
};
