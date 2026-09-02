import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface BudgetLine {
  id: string;
  projectCode: string;
  fiscalYear: string;
  allocated: string;
  committed: string;
  spent: string;
  available: string;
}

interface Gallery {
  galleryCode: string;
  name: string;
  isOpen: boolean;
  closedFrom: string | null;
  closedTo: string | null;
  closedFor: string | null;
}

interface DashboardData {
  budget: BudgetLine[];
  procurement: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    received: number;
    vendors: number;
  };
  projects: {
    total: number;
    byStatus: { planning: number; inProgress: number; complete: number };
    projects: Array<{
      code: string;
      name: string;
      status: string;
      milestoneProgress: string;
    }>;
  };
  ticketing: {
    totalRevenue: string;
    totalTickets: number;
    galleries: Gallery[];
    recentSales: Array<{
      id: string;
      ticketType: string;
      quantity: number;
      amount: string;
      soldAt: string;
    }>;
  };
}

/* ── Format helpers ───────────────────────────────────────────────────── */

const fmt = (v: string | number) =>
  `\u20B9${Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const axisStyle = {
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  fill: "var(--text-muted)",
};

/* ── Custom Tooltip ───────────────────────────────────────────────────── */

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 12px",
          boxShadow: "none",
        }}
      >
        {label && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            {label}
          </div>
        )}
        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            style={{
              fontSize: 12,
              display: "flex",
              gap: 16,
              justifyContent: "space-between",
              marginBottom: index < payload.length - 1 ? 4 : 0,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{entry.name}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: entry.color || "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  // Prepare chart data
  const budgetData = useMemo(() => {
    if (!data) return [];
    return data.budget.map((b) => ({
      projectCode: b.projectCode,
      Spent: Number(b.spent),
      Committed: Number(b.committed),
      Available: Number(b.available),
    }));
  }, [data]);

  const prData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "PENDING", value: data.procurement.pending, color: "var(--status-pending)" },
      { name: "APPROVED", value: data.procurement.approved, color: "var(--status-approved)" },
      { name: "REJECTED", value: data.procurement.rejected, color: "var(--status-rejected)" },
      { name: "RECEIVED", value: data.procurement.received, color: "var(--status-received)" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const revenueData = useMemo(() => {
    if (!data?.ticketing?.recentSales) return [];
    const grouped = new Map<string, number>();
    data.ticketing.recentSales.forEach((sale) => {
      const d = new Date(sale.soldAt).toISOString().split("T")[0];
      grouped.set(d, (grouped.get(d) || 0) + Number(sale.amount));
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date,
        amount: amount / 1000,
      }));
  }, [data]);

  if (!data) return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading…</div>;

  const totalAllocated = data.budget.reduce((s, b) => s + Number(b.allocated), 0);
  const totalCommitted = data.budget.reduce((s, b) => s + Number(b.committed), 0);
  const totalSpent = data.budget.reduce((s, b) => s + Number(b.spent), 0);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
        Dashboard
      </h1>

      {/* ── Row 1: Metric cards ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard
          label="Total allocated"
          value={fmt(totalAllocated)}
          subtitle={`across ${data.projects.total} projects`}
        />
        <MetricCard label="Total committed" value={fmt(totalCommitted)} />
        <MetricCard label="Total spent" value={fmt(totalSpent)} />
        <MetricCard
          label="Ticket revenue"
          value={fmt(data.ticketing.totalRevenue)}
          subtitle={`${data.ticketing.totalTickets} tickets sold`}
        />
      </div>

      {/* ── Row 2: 60/40 Split ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <ChartCard title="Budget utilisation by project">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border)" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => fmt(v)} stroke="transparent" tick={{ ...axisStyle, dy: 5 }} />
                <YAxis dataKey="projectCode" type="category" stroke="transparent" tick={{ ...axisStyle, dx: -5 }} width={80} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  content={<CustomTooltip formatter={(v: number) => fmt(v)} />}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--text-muted)", paddingTop: 10 }} />
                <Bar dataKey="Spent" stackId="a" fill="var(--status-rejected)" />
                <Bar dataKey="Committed" stackId="a" fill="var(--status-pending)" />
                <Bar dataKey="Available" stackId="a" fill="var(--status-approved)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Purchase requests by status">
          <div style={{ display: "flex", height: 240, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prData}
                    innerRadius="65%"
                    outerRadius="85%"
                    dataKey="value"
                    stroke="none"
                  >
                    {prData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: 24, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {data.procurement.total}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Requests
                </div>
              </div>
            </div>
            <div style={{ width: 140, display: "flex", flexDirection: "column", gap: 12, paddingLeft: 16 }}>
              {prData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {d.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", marginTop: 2 }}>
                      {d.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Row 3: Full width ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <ChartCard title="Ticket revenue, last 14 days">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" horizontal={true} vertical={false} />
                <XAxis dataKey="date" stroke="transparent" tick={{ ...axisStyle, dy: 10 }} />
                <YAxis
                  tickFormatter={(v) => `₹${v}k`}
                  stroke="transparent"
                  tick={{ ...axisStyle, dx: -5 }}
                  width={60}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={<CustomTooltip formatter={(v: number) => `\u20B9${v}k`} />}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Revenue"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Row 4: Two panels ──────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <ChartCard title="Gallery availability">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.ticketing.galleries.map((g) => (
              <div
                key={g.galleryCode}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  opacity: g.isOpen ? 1 : 0.5,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: g.isOpen ? "var(--status-approved)" : "var(--status-rejected)",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{g.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {g.galleryCode}
                    {!g.isOpen && g.closedFor && ` • Closed for ${g.closedFor}`}
                    {!g.isOpen && g.closedFrom && g.closedTo && (
                      <>
                        <br />
                        {new Date(g.closedFrom).toLocaleDateString()} – {new Date(g.closedTo).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Project milestones">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {data.projects.projects.map((p) => {
              const parts = p.milestoneProgress.split("/");
              const done = Number(parts[0]);
              const total = Number(parts[1]);
              const pct = total > 0 ? (done / total) * 100 : 0;
              return (
                <div key={p.code}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          marginRight: 8,
                        }}
                      >
                        {p.code}
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>{p.name}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {p.milestoneProgress}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 20,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}