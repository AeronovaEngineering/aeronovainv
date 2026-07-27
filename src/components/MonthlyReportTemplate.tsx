import { forwardRef } from "react";
import type { Database } from "@/integrations/supabase/types";
import { FooterCell, LogoImg } from "@/components/InvoiceTemplate";
import { formatTND, formatDate } from "@/lib/format";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

export type ReportRow = {
  id: string;
  date: string;
  label: string;
  reference: string;
  amount: number;
};

// ============================================
// 1. COMPOSANT SECTION
// ============================================
function Section({
  title,
  rows,
  amountLabel,
  variant = "default",
  icon,
}: {
  title: string;
  rows: ReportRow[];
  amountLabel: string;
  variant?: "default" | "purchases" | "expenses";
  icon?: string;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const getVariantStyles = () => {
    switch (variant) {
      case "purchases":
        return {
          headerBg: "#FEF2F2",
          borderColor: "#DC2626",
          textColor: "#991B1B",
          accentColor: "#FCA5A5",
        };
      case "expenses":
        return {
          headerBg: "#FFFBEB",
          borderColor: "#D97706",
          textColor: "#92400E",
          accentColor: "#FCD34D",
        };
      default:
        return {
          headerBg: "#F0FDF4",
          borderColor: "#16A34A",
          textColor: "#166534",
          accentColor: "#86EFAC",
        };
    }
  };

  const styles = getVariantStyles();
  const maxAmount = Math.max(...rows.map((row) => Math.abs(row.amount)), 1);

  return (
    <div style={{ marginTop: 24, breakInside: "avoid" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          borderBottom: `3px solid ${styles.borderColor}`,
          paddingBottom: 8,
          background: styles.headerBg,
          padding: "8px 12px",
          borderRadius: "6px 6px 0 0",
        }}
      >
        <div
          style={{
            fontSize: "12pt",
            fontWeight: 700,
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {icon && <span style={{ fontSize: "14pt" }}>{icon}</span>}
          <span style={{ color: styles.textColor }}>{title}</span>
        </div>
        <div
          style={{
            fontSize: "9pt",
            color: styles.textColor,
            background: "white",
            padding: "2px 14px",
            borderRadius: 20,
            fontWeight: 600,
            border: `1px solid ${styles.borderColor}`,
          }}
        >
          {rows.length} entrée{rows.length > 1 ? "s" : ""}
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "9.5pt",
          border: `1px solid ${styles.borderColor}`,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <thead>
          <tr
            style={{
              background: styles.headerBg,
              borderBottom: `2px solid ${styles.borderColor}`,
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontWeight: 700,
                width: "12%",
                color: styles.textColor,
                fontSize: "8.5pt",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Date
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontWeight: 700,
                color: styles.textColor,
                fontSize: "8.5pt",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {amountLabel}
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                fontWeight: 700,
                width: "15%",
                color: styles.textColor,
                fontSize: "8.5pt",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              N° Réf.
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontWeight: 700,
                width: "18%",
                color: styles.textColor,
                fontSize: "8.5pt",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Montant (TND)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "#9CA3AF",
                  fontStyle: "italic",
                  fontSize: "9.5pt",
                }}
              >
                ⚡ Aucune donnée disponible pour cette période
              </td>
            </tr>
          ) : (
            rows.map((r, index) => {
              const isLast = index === rows.length - 1;
              const isEven = index % 2 === 0;
              const barWidth = (Math.abs(r.amount) / maxAmount) * 60;

              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: isLast ? "none" : "1px solid #E5E7EB",
                    background: isEven ? "#FFFFFF" : "#FAFAFA",
                  }}
                >
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#374151",
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(r.date)}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      color: "#1F2937",
                      fontWeight: 400,
                    }}
                  >
                    {r.label}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      fontFamily: "monospace",
                      fontSize: "9pt",
                      color: "#6B7280",
                    }}
                  >
                    {r.reference}
                  </td>
                  <td
                    style={{
                      padding: "7px 10px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: variant === "default" ? "#16A34A" : "#DC2626",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: barWidth,
                          height: 4,
                          background: styles.accentColor,
                          borderRadius: 2,
                          opacity: 0.5,
                        }}
                      />
                      <span>{formatTND(r.amount)}</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr
            style={{
              borderTop: `2px solid ${styles.borderColor}`,
              background: styles.headerBg,
            }}
          >
            <td
              colSpan={3}
              style={{
                padding: "10px 12px",
                fontWeight: 700,
                textAlign: "right",
                fontSize: "10pt",
                color: styles.textColor,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Sous-total
            </td>
            <td
              style={{
                padding: "10px 12px",
                fontWeight: 800,
                textAlign: "right",
                fontSize: "11pt",
                color: styles.textColor,
              }}
            >
              {formatTND(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// 2. CARTE DE RÉSUMÉ
// ============================================
function SummaryCard({
  label,
  value,
  type = "default",
  subtitle,
  trend,
}: {
  label: string;
  value: string;
  type?: "positive" | "negative" | "default" | "info";
  subtitle?: string;
  trend?: number;
}) {
  const getColors = () => {
    switch (type) {
      case "positive":
        return { bg: "#F0FDF4", border: "#16A34A", text: "#16A34A", icon: "▲" };
      case "negative":
        return { bg: "#FEF2F2", border: "#DC2626", text: "#DC2626", icon: "▼" };
      case "info":
        return { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8", icon: "●" };
      default:
        return { bg: "#F8FAFC", border: "#94A3B8", text: "#0F172A", icon: "◆" };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "14px 16px",
        background: colors.bg,
        textAlign: "center",
        flex: 1,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "8pt",
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18pt",
          fontWeight: 800,
          color: colors.text,
          marginTop: 4,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "7.5pt",
            color: "#94A3B8",
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      )}
      {trend !== undefined && (
        <div
          style={{
            fontSize: "7.5pt",
            color: trend >= 0 ? "#16A34A" : "#DC2626",
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}% vs période précédente
        </div>
      )}
    </div>
  );
}

// ============================================
// 3. COMPOSANT PRINCIPAL
// ============================================
export const MonthlyReportTemplate = forwardRef<
  HTMLDivElement,
  {
    settings: Settings;
    periodLabel: string;
    sales: ReportRow[];
    purchases: ReportRow[];
    expenses: ReportRow[];
    totalEncaisse: number;
    reportNumber?: string;
  }
>(function MonthlyReportTemplate(
  {
    settings,
    periodLabel,
    sales,
    purchases,
    expenses,
    totalEncaisse,
    reportNumber = `RPT-${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`,
  },
  ref
) {
  const salesTotal = sales.reduce((s, r) => s + r.amount, 0);
  const purchasesTotal = purchases.reduce((s, r) => s + r.amount, 0);
  const expensesTotal = expenses.reduce((s, r) => s + r.amount, 0);
  const net = salesTotal - purchasesTotal - expensesTotal;
  const totalOperations = sales.length + purchases.length + expenses.length;
  const marginRate =
    salesTotal > 0 ? ((salesTotal - purchasesTotal - expensesTotal) / salesTotal) * 100 : 0;

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalCharges = purchasesTotal + expensesTotal;
  const distributionTotal = salesTotal + totalCharges;
  const salesPercent = distributionTotal > 0 ? (salesTotal / distributionTotal) * 100 : 0;
  const chargesPercent = distributionTotal > 0 ? (totalCharges / distributionTotal) * 100 : 0;

  return (
    <div
      ref={ref}
      data-printable-root
      className="bg-white text-black mx-auto"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "10mm 12mm",
        boxSizing: "border-box",
        fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "10pt",
        lineHeight: 1.5,
        color: "#0A0A0A",
      }}
    >
      {/* ========== EN-TÊTE ========== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 70,
              height: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #E2E8F0",
              borderRadius: 12,
              padding: 4,
              background: "#F8FAFC",
            }}
          >
            <LogoImg size={60} />
          </div>
          <div>
            <div
              style={{
                fontSize: "18pt",
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#0F172A",
                letterSpacing: "-0.02em",
              }}
            >
              {settings.company_name}
            </div>
            <div style={{ fontSize: "8pt", color: "#64748B", marginTop: 2 }}>
              {settings.footer_address}
            </div>
            <div style={{ fontSize: "7.5pt", color: "#94A3B8", marginTop: 1 }}>
              RC: {settings.rc} | MF: {settings.matricule_fiscal}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "22pt",
              fontWeight: 800,
              letterSpacing: "0.02em",
              color: "#0F172A",
              lineHeight: 1.1,
            }}
          >
            RAPPORT
          </div>
          <div
            style={{
              fontSize: "10pt",
              fontWeight: 600,
              color: "#3B82F6",
              marginTop: 2,
              letterSpacing: "0.04em",
            }}
          >
            {periodLabel}
          </div>
          <div
            style={{
              fontSize: "8pt",
              color: "#94A3B8",
              marginTop: 6,
              fontFamily: "monospace",
              background: "#F1F5F9",
              padding: "2px 10px",
              borderRadius: 4,
              display: "inline-block",
            }}
          >
            N° {reportNumber}
          </div>
          <div style={{ fontSize: "7.5pt", color: "#94A3B8", marginTop: 2 }}>
            Généré le {currentDate}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "3px solid #0F172A",
          marginTop: 16,
          marginBottom: 20,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -8,
            right: 0,
            background: "#3B82F6",
            width: 60,
            height: 3,
          }}
        />
      </div>

      {/* ========== CARTES DE RÉSUMÉ ========== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Chiffre d'affaires"
          value={formatTND(salesTotal)}
          type="positive"
          subtitle={`${sales.length} facture${sales.length > 1 ? "s" : ""}`}
          trend={8.5}
        />
        <SummaryCard
          label="Total encaissé"
          value={formatTND(totalEncaisse)}
          type="info"
          subtitle="Paiements reçus"
        />
        <SummaryCard
          label="Charges totales"
          value={formatTND(purchasesTotal + expensesTotal)}
          type="negative"
          subtitle={`${purchases.length + expenses.length} opérations`}
          trend={-3.2}
        />
        <SummaryCard
          label="Résultat net"
          value={formatTND(net)}
          type={net >= 0 ? "positive" : "negative"}
          subtitle={`Marge: ${marginRate.toFixed(1)}%`}
        />
      </div>

      {/* ========== BARRE DE RÉPARTITION ========== */}
      <div
        style={{
          marginBottom: 20,
          padding: "12px 16px",
          background: "#F8FAFC",
          borderRadius: 8,
          border: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "7.5pt",
            color: "#64748B",
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          <span>Répartition des flux</span>
          <span>Total: {formatTND(salesTotal + totalCharges)}</span>
        </div>
        <div
          style={{
            display: "flex",
            height: 8,
            borderRadius: 4,
            overflow: "hidden",
            background: "#E2E8F0",
          }}
        >
          <div style={{ width: `${salesPercent}%`, background: "#22C55E", height: "100%" }} />
          <div style={{ width: `${chargesPercent}%`, background: "#EF4444", height: "100%" }} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "7pt",
            color: "#94A3B8",
            marginTop: 3,
          }}
        >
          <span>▸ Ventes {salesPercent.toFixed(1)}%</span>
          <span>▸ Charges {chargesPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* ========== SECTIONS DÉTAILLÉES ========== */}
      <Section title="Factures de vente" rows={sales} amountLabel="Client" variant="default" icon="📈" />
      <Section title="Factures d'achat" rows={purchases} amountLabel="Fournisseur" variant="purchases" icon="📥" />
      <Section title="Dépenses" rows={expenses} amountLabel="Description" variant="expenses" icon="💳" />

      {/* ========== RÉSUMÉ FINANCIER ========== */}
      <div
        style={{
          marginTop: 28,
          breakInside: "avoid",
          border: "2px solid #0F172A",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            background: "#0F172A",
            color: "white",
            padding: "12px 20px",
            fontSize: "11pt",
            fontWeight: 700,
            letterSpacing: "0.03em",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>📊 SYNTHÈSE FINANCIÈRE</span>
          <span style={{ fontSize: "8.5pt", fontWeight: 400, opacity: 0.8, fontFamily: "monospace" }}>
            {totalOperations} opérations
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              <td style={{ padding: "10px 20px", fontWeight: 600, color: "#0F172A" }}>
                Chiffre d'affaires (ventes)
              </td>
              <td style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, color: "#22C55E" }}>
                + {formatTND(salesTotal)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              <td style={{ padding: "10px 20px", fontWeight: 600, color: "#0F172A" }}>Factures d'achat</td>
              <td style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, color: "#EF4444" }}>
                − {formatTND(purchasesTotal)}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
              <td style={{ padding: "10px 20px", fontWeight: 600, color: "#0F172A" }}>Dépenses</td>
              <td style={{ padding: "10px 20px", textAlign: "right", fontWeight: 700, color: "#EF4444" }}>
                − {formatTND(expensesTotal)}
              </td>
            </tr>
            <tr
              style={{
                borderTop: "2px solid #0F172A",
                borderBottom: "1px solid #F1F5F9",
                background: "#F8FAFC",
              }}
            >
              <td style={{ padding: "12px 20px", fontWeight: 800, fontSize: "11.5pt", color: "#0F172A" }}>
                RÉSULTAT NET
              </td>
              <td
                style={{
                  padding: "12px 20px",
                  textAlign: "right",
                  fontWeight: 800,
                  fontSize: "14pt",
                  color: net >= 0 ? "#22C55E" : "#EF4444",
                }}
              >
                {formatTND(net)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "10px 20px", fontWeight: 600, color: "#0F172A" }}>
                Total encaissé sur la période
              </td>
              <td
                style={{
                  padding: "10px 20px",
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: "11pt",
                  color: "#0F172A",
                }}
              >
                {formatTND(totalEncaisse)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========== PIED DE PAGE ========== */}
      <div style={{ marginTop: 28, breakInside: "avoid" }}>
        <div
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1.4fr 1.4fr 1fr 1.2fr",
            fontSize: "8pt",
          }}
        >
          <FooterCell>
            <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 2, fontSize: "8.5pt" }}>
              📍 Adresse
            </div>
            <div style={{ color: "#64748B" }}>{settings.footer_address}</div>
          </FooterCell>
          <FooterCell>
            <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 2, fontSize: "8.5pt" }}>
              📞 Contact
            </div>
            <div style={{ color: "#64748B" }}>Tél: {settings.phone}</div>
            <div style={{ color: "#64748B" }}>Email: {settings.email}</div>
          </FooterCell>
          <FooterCell>
            <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 2, fontSize: "8.5pt" }}>
              📋 Registre
            </div>
            <div style={{ color: "#64748B" }}>RC: {settings.rc}</div>
            <div style={{ color: "#64748B" }}>MF: {settings.matricule_fiscal}</div>
          </FooterCell>
          <FooterCell>
            <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 2, fontSize: "8.5pt" }}>
              🏦 Banque
            </div>
            <div style={{ color: "#64748B", fontFamily: "monospace", fontSize: "7.5pt" }}>
              {settings.ccb}
            </div>
          </FooterCell>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "7pt",
            color: "#94A3B8",
            marginTop: 8,
            borderTop: "1px solid #E2E8F0",
            paddingTop: 8,
          }}
        >
          <span>© {new Date().getFullYear()} {settings.company_name} — Tous droits réservés</span>
          <span>Document généré automatiquement</span>
          <span style={{ fontFamily: "monospace" }}>v1.0</span>
        </div>
      </div>
    </div>
  );
});