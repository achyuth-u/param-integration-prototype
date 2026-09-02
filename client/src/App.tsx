import { useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PurchaseRequests from "./pages/PurchaseRequests";
import Activity from "./pages/Activity";

const ROLES = ["Finance", "Procurement", "Project Lead", "Operations"] as const;
type Role = (typeof ROLES)[number];

export default function App() {
  const [role, setRole] = useState<Role>("Finance");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            padding: "0 20px 20px",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Param
        </div>

        <SidebarLink to="/" label="Dashboard" />
        <SidebarLink to="/purchase-requests" label="Purchase Requests" />
        <SidebarLink to="/activity" label="Activity" />
      </nav>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header
          style={{
            height: 52,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginRight: 4,
            }}
          >
            Viewing as
          </span>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 4,
                border: "1px solid",
                borderColor:
                  role === r ? "var(--accent)" : "var(--border)",
                background:
                  role === r ? "rgba(77,159,255,0.1)" : "transparent",
                color:
                  role === r ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </header>

        {/* ── Page content ────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/purchase-requests" element={<PurchaseRequests />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ── Sidebar link ──────────────────────────────────────────────────────── */
function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      style={({ isActive }) => ({
        display: "block",
        padding: "8px 20px",
        fontSize: 14,
        fontWeight: 500,
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        textDecoration: "none",
        borderLeft: isActive
          ? "2px solid var(--accent)"
          : "2px solid transparent",
        background: isActive ? "rgba(77,159,255,0.06)" : "transparent",
        transition: "all 0.15s",
      })}
    >
      {label}
    </NavLink>
  );
}