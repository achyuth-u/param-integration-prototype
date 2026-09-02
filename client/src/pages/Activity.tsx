import { useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  processedAt: string | null;
  processedBy: string | null;
  error: string | null;
}

/* ── Publishing module derived from type (section 5 of SPEC.md) ───────── */

const PUBLISHER: Record<string, string> = {
  "purchase.requested": "procurement",
  "goods.received":     "procurement",
  "budget.approved":    "budget",
  "budget.rejected":    "budget",
  "gallery.closed":     "projects",
  "ticket.sold":        "ticketing",
};

/* ── Colour mapping for type pills (CSS vars) ─────────────────────────── */

const TYPE_COLOR: Record<string, string> = {
  "purchase.requested": "var(--type-purchase-requested)",
  "budget.approved":    "var(--type-budget-approved)",
  "budget.rejected":    "var(--type-budget-rejected)",
  "goods.received":     "var(--type-goods-received)",
  "gallery.closed":     "var(--type-gallery-closed)",
  "ticket.sold":        "var(--type-ticket-sold)",
};

/* ── Relative time helper ─────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec  = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function Activity() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/messages")
        .then((r) => r.json())
        .then(setMessages)
        .catch(console.error);

    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 20,
        }}
      >
        Activity
      </h1>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {/* ── Table header ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 180px 100px",
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>Type</span>
          <span>Flow</span>
          <span>Time</span>
          <span style={{ textAlign: "right" }}>Status</span>
        </div>

        {/* ── Rows ─────────────────────────────────────────────────────── */}
        {messages.map((msg) => {
          const publisher = PUBLISHER[msg.type] ?? "unknown";
          const handlers  = msg.processedBy ?? "";
          const isExpanded = expandedId === msg.id;
          const hasError   = !!msg.error;

          return (
            <div key={msg.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 180px 100px",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  alignItems: "center",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {/* Type pill */}
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "var(--font-mono)",
                      borderRadius: 4,
                      border: `1px solid ${TYPE_COLOR[msg.type] ?? "var(--text-muted)"}33`,
                      color: TYPE_COLOR[msg.type] ?? "var(--text-muted)",
                      background: `${TYPE_COLOR[msg.type] ?? "var(--text-muted)"}0d`,
                    }}
                  >
                    {msg.type}
                  </span>
                </span>

                {/* Flow: publisher → handlers */}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {publisher}
                  </span>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      margin: "0 8px",
                      fontSize: 12,
                    }}
                  >
                    →
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {handlers || "—"}
                  </span>
                </span>

                {/* Time */}
                <span
                  title={new Date(msg.createdAt).toLocaleString()}
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  {relativeTime(msg.createdAt)}
                </span>

                {/* Processed / error indicator */}
                <span style={{ textAlign: "right" }}>
                  {hasError ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--status-rejected)",
                      }}
                    >
                      error
                    </span>
                  ) : msg.processedAt ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--status-approved)",
                      }}
                    >
                      processed
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--status-pending)",
                      }}
                    >
                      pending
                    </span>
                  )}
                </span>
              </div>

              {/* ── Expanded payload ───────────────────────────────────── */}
              {isExpanded && (
                <div
                  style={{
                    padding: "12px 16px 12px 176px",
                    borderBottom: "1px solid var(--border)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  {hasError && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--status-rejected)",
                        marginBottom: 8,
                      }}
                    >
                      Error: {msg.error}
                    </div>
                  )}
                  <pre
                    style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {JSON.stringify(msg.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {messages.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No messages yet.
          </div>
        )}
      </div>
    </div>
  );
}