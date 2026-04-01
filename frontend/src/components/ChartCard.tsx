import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

export const ChartCard = ({ data }: { data: { name: string; leases: number }[] }) => (
  <div className="h-56">
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="leases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b" }} />
        <Area type="monotone" dataKey="leases" stroke="#38bdf8" fill="url(#leases)" strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
