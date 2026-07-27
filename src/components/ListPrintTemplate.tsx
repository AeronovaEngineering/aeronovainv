import type { ReactNode } from "react";
import type { Database } from "@/integrations/supabase/types";
import { FooterCell, LogoImg } from "@/components/InvoiceTemplate";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

export type PrintColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string;
};

export function ListPrintTemplate({
  title, subtitle, settings, columns, rows, totalLabel, totalValue,
}: {
  title: string;
  subtitle?: string;
  settings: Settings;
  columns: PrintColumn[];
  rows: Record<string, ReactNode>[];
  totalLabel: string;
  totalValue: string;
}) {
  return (
    <div
      data-printable-root
      className="bg-white text-black mx-auto"
      style={{
        width: "210mm", minHeight: "297mm", padding: "12mm 14mm", boxSizing: "border-box",
        fontFamily: "Inter, Arial, sans-serif", fontSize: "10pt", lineHeight: 1.35, color: "#000",
      }}
    >
      {/* Header: logo + company name + report title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogoImg size={60} />
          </div>
          <div style={{ fontSize: "14pt", fontWeight: 700, lineHeight: 1.15 }}>{settings.company_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18pt", fontWeight: 800, letterSpacing: "0.02em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "9pt", color: "#555", marginTop: 4 }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000", marginTop: 12 }} />

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? "left", padding: "6px 4px", fontWeight: 700, width: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ padding: 16, textAlign: "center", color: "#666" }}>Aucune donnée</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd", breakInside: "avoid" }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? "left", padding: "5px 4px" }}>{r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <table style={{ minWidth: "45%" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid #000" }}>
              <td style={{ padding: "6px 8px", fontWeight: 800 }}>{totalLabel} :</td>
              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 800 }}>{totalValue}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer band — same branding footer used on invoices/devis */}
      <div style={{ marginTop: 30, breakInside: "avoid" }}>
        <div style={{ border: "1px solid #000", display: "grid", gridTemplateColumns: "1.3fr 1.5fr 1fr 1.4fr", fontSize: "8.5pt" }}>
          <FooterCell><div>{settings.footer_address}</div></FooterCell>
          <FooterCell>
            <div>Tél: {settings.phone}</div>
            <div>Email:</div>
            <div>{settings.email}</div>
          </FooterCell>
          <FooterCell>
            <div>R.C: {settings.rc}</div>
            <div>M.F:</div>
            <div>{settings.matricule_fiscal}</div>
          </FooterCell>
          <FooterCell>{settings.ccb}</FooterCell>
        </div>
      </div>
    </div>
  );
}