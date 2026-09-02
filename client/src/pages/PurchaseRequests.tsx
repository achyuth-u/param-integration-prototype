import { useEffect, useState, type FormEvent } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Vendor {
  id: string;
  name: string;
  category: string;
}

interface PurchaseRequest {
  id: string;
  prNumber: string;
  projectCode: string;
  vendorId: string;
  vendor: Vendor;
  description: string;
  amount: string;
  status: string;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  receivedAt: string | null;
}

/* ── Status pill colours ──────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  APPROVED: "var(--status-approved)",
  REJECTED: "var(--status-rejected)",
  PENDING:  "var(--status-pending)",
  RECEIVED: "var(--status-received)",
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function PurchaseRequests() {
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([
      fetch("/api/purchase-requests").then((r) => r.json()),
      fetch("/api/vendors").then((r) => r.json()),
    ]).then(([p, v]) => {
      setPrs(p);
      setVendors(v);
    });

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      projectCode: fd.get("projectCode"),
      vendorId:    fd.get("vendorId"),
      description: fd.get("description"),
      amount:      fd.get("amount"),
    };
    await fetch("/api/purchase-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    setSubmitting(false);
    // Short delay for dispatch to run
    setTimeout(load, 500);
  };

  const receiveGoods = async (id: string) => {
    await fetch(`/api/purchase-requests/${id}/receive-goods`, {
      method: "POST",
    });
    setTimeout(load, 500);
  };

  const formatAmount = (v: string) =>
    `\u20B9${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Purchase Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 4,
            border: "1px solid var(--accent)",
            background: showForm ? "transparent" : "rgba(77,159,255,0.1)",
            color: "var(--accent)",
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "New request"}
        </button>
      </div>

      {/* ── New request form ──────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 20,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={labelStyle}>
            <span style={labelTextStyle}>Project code</span>
            <select name="projectCode" required style={inputStyle}>
              <option value="">Select…</option>
              <option value="PROJ-OCN">PROJ-OCN</option>
              <option value="PROJ-AVM">PROJ-AVM</option>
              <option value="PROJ-ENE">PROJ-ENE</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Vendor</span>
            <select name="vendorId" required style={inputStyle}>
              <option value="">Select…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelTextStyle}>Description</span>
            <input
              name="description"
              required
              maxLength={255}
              style={inputStyle}
              placeholder="What is being purchased"
            />
          </label>

          <label style={labelStyle}>
            <span style={labelTextStyle}>Amount (₹)</span>
            <input
              name="amount"
              type="number"
              required
              min="1"
              step="0.01"
              style={inputStyle}
              placeholder="0.00"
            />
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 4,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div style={{ ...rowStyle, borderBottom: "1px solid var(--border)" }}>
          <span style={thStyle}>PR #</span>
          <span style={thStyle}>Project</span>
          <span style={thStyle}>Vendor</span>
          <span style={thStyle}>Amount</span>
          <span style={thStyle}>Status</span>
          <span style={thStyle}>Reason / Action</span>
        </div>

        {prs.map((pr) => (
          <div
            key={pr.id}
            style={{
              ...rowStyle,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {pr.prNumber}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              {pr.projectCode}
            </span>
            <span style={{ fontSize: 13 }}>{pr.vendor.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {formatAmount(pr.amount)}
            </span>
            <span>
              <StatusPill status={pr.status} />
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {pr.status === "REJECTED" && pr.decisionReason && (
                <span style={{ color: "var(--status-rejected)" }}>
                  {pr.decisionReason}
                </span>
              )}
              {pr.status === "APPROVED" && (
                <button
                  onClick={() => receiveGoods(pr.id)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: "1px solid var(--status-received)",
                    background: "transparent",
                    color: "var(--status-received)",
                    cursor: "pointer",
                  }}
                >
                  Mark goods received
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Status pill ──────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "var(--text-muted)";
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
      {status}
    </span>
  );
}

/* ── Shared styles ────────────────────────────────────────────────────── */

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px 100px 1fr 130px 100px 1fr",
  padding: "10px 16px",
  alignItems: "center",
  gap: 8,
};

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  color: "var(--text-primary)",
  outline: "none",
};