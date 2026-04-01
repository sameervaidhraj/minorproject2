import { ReactNode } from "react";

export const Card = ({ title, children, accent }: { title: string; children: ReactNode; accent?: string }) => (
  <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
      {accent && <span className="text-sm text-slate-400">{accent}</span>}
    </div>
    {children}
  </section>
);
