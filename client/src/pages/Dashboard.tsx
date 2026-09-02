import { useEffect, useState } from "react";

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
    projects: Array<{ code: string; name: string; status: string; milestoneProgress: string }>;
  };
  ticketing: {
    totalRevenue: string;
    totalTickets: number;
    galleries: Gallery[];
  };
}

/* ── Format helpers ───────────────────────────────────────────────────── */

const fmt = (v: string) =>
  `\u20B9${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

/* ── Component ─────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div style={{ color: "var(--text-muted)" }}>Loading…</div>;

  const totalAllocated = data.budget.reduce((s, b) => s + Number(b.allocated), 0);
  const totalCommitted = data.budget.reduce((s, b) => s + Number(b.committed), 0);
  const totalSpent     = data.budget.reduce((s, b) => s + Number(b.spent), 0);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
        Dashboard
      </h1>

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <MetricCard label="Total allocated" value={fmt(String(totalAllocated))} />
        <MetricCard label="Total committed" value={fmt(String(totalCommitted))} />
        <MetricCard label="Total spent" value={fmt(String(totalSpent))} />
        <MetricCard label="Ticket revenue" value={fmt(data.ticketing.totalRevenue)} />
      </div>

      {/* ── Budget bars ────────────────────────────────────────────────── */}
      <SectionTitle>Budget by project</SectionTitle>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: 16,
          marginBottom: 24,
        }}
      >
        {data.budget.map((b) => (
          <BudgetBar key={b.id} line={b} />
        ))}
      </div>

      {/* ── Gallery availability ───────────────────────────────────────── */}
      <SectionTitle>Gallery availability</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {data.ticketing.galleries.map((g) => (
          <div
            key={g.galleryCode}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 16,
              opacity: g.isOpen ? 1 : 0.5,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: g.isOpen ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {g.name}
            </div>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {g.galleryCode}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginTop: 8,
                color: g.isOpen ? "var(--status-approved)" : "var(--status-rejected)",
              }}
            >
              {g.isOpen ? "Open" : `Closed — ${g.closedFor ?? "maintenance"}`}
            </div>
          </div>
        ))}
      </div>

      {/* ── Projects ───────────────────────────────────────────────────── */}
      <SectionTitle>Projects</SectionTitle>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {data.projects.projects.map((p) => (
          <div
            key={p.code}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 120px 100px",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {p.code}
            </span>
            <span>{p.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {p.milestoneProgress} milestones
            </span>
            <span>
              <StatusPill status={p.status} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
    </div>
  );
}

function BudgetBar({ line }: { line: BudgetLine }) {
  const alloc = Number(line.allocated);
  const com   = Number(line.committed);
  const sp    = Number(line.spent);
  const comPct  = alloc > 0 ? (com / alloc) * 100 : 0;
  const spPct   = alloc > 0 ? (sp / alloc) * 100 : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500 }}>{line.projectCode}</span>
        <span
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          {fmt(line.available)} available of {fmt(line.allocated)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--border)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${spPct}%`,
            background: "var(--status-rejected)",
          }}
        />
        <div
          style={{
            width: `${comPct}%`,
            background: "var(--status-pending)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 4,
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        <span>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--status-rejected)", marginRight: 4, verticalAlign: "middle" }} />
          Spent {fmt(line.spent)}
        </span>
        <span>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--status-pending)", marginRight: 4, verticalAlign: "middle" }} />
          Committed {fmt(line.committed)}
        </span>
        <span>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--border)", marginRight: 4, verticalAlign: "middle" }} />
          Available {fmt(line.available)}
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 10,
      }}
    >
      {children}
    </h2>
  );
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    PLANNING:    "var(--status-pending)",
    IN_PROGRESS: "var(--accent)",
    COMPLETE:    "var(--status-approved)",
  };
  const color = colorMap[status] ?? "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 4,
        border: `1px solid ${color}33`,
        color,
        background: `${color}0d`,
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}