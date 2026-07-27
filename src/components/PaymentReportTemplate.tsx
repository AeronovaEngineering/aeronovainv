import React, { forwardRef } from "react";
import type { Database } from "@/integrations/supabase/types";
import { formatDate, formatTND } from "@/lib/format";
import { LogoImg, FooterCell } from "@/components/InvoiceTemplate";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];

export type PaymentRow = {
  id: string;
  invoiceRef: string;
  invoiceDate: string;
  clientName: string;
  paymentDate: string;
  method: string;
  amount: number;
};

type PaymentReportTemplateProps = {
  settings: Settings;
  periodLabel: string;
  payments: PaymentRow[];
  totalEncaisse: number;
  totalDepenses: number;
  totalAchats: number;
  solde: number;
};

export const PaymentReportTemplate = forwardRef<
  HTMLDivElement,
  PaymentReportTemplateProps
>(function PaymentReportTemplate(
  { settings, periodLabel, payments, totalEncaisse, totalDepenses, totalAchats, solde },
  ref
) {
  return (
    <div
      ref={ref}
      data-printable-root
      className="bg-white text-black mx-auto"
      style={{
        width: "210mm",
        height: "297mm",
        padding: "12mm 14mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "10.5pt",
        lineHeight: 1.35,
        color: "#000",
      }}
    >
      {/* Header - fixed at top */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 94,
              height: 94,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              border: "0",
            }}>
              <LogoImg size={120} />
            </div>
            <div style={{ fontSize: "20pt", fontWeight: 700, lineHeight: 1.05 }}>
              {settings.company_name.split(" ")[0]}<br />
              <span style={{ fontWeight: 600 }}>
                {settings.company_name.split(" ").slice(1).join(" ") || "Engineering"}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "20pt", fontWeight: 700, letterSpacing: "0.02em" }}>
              RAPPORT DE PAIEMENTS
            </div>
            <div style={{ fontSize: "12pt", fontWeight: 500, marginTop: 4 }}>
              {periodLabel}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #000", marginTop: 16 }} />

        {/* Payments table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000" }}>
              <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>N° Facture</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>Date facture</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>Client</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>Date de paiement</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>Mode</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontWeight: 700 }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                  Aucun paiement
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #ddd", breakInside: "avoid" }}>
                  <td style={{ padding: "5px 4px" }}>{p.invoiceRef}</td>
                  <td style={{ padding: "5px 4px" }}>{formatDate(p.invoiceDate)}</td>
                  <td style={{ padding: "5px 4px" }}>{p.clientName}</td>
                  <td style={{ padding: "5px 4px" }}>{formatDate(p.paymentDate)}</td>
                  <td style={{ padding: "5px 4px" }}>{p.method}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>
                    {formatTND(p.amount, { symbol: false })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #000", marginTop: 8 }} />
      </div>

      {/* Spacer - pushes content down */}
      <div style={{ flex: "1 1 auto" }} />

      {/* Summary block - pinned at bottom, above footer */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <table style={{ minWidth: "48%" }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 8px", fontWeight: 700 }}>Total encaissé :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>
                  {formatTND(totalEncaisse, { symbol: false })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 8px", fontWeight: 700 }}>Total dépenses (période) :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>
                  {formatTND(totalDepenses, { symbol: false })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 8px", fontWeight: 700 }}>Total achats (période) :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>
                  {formatTND(totalAchats, { symbol: false })}
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid #000" }}>
                <td style={{ padding: "5px 8px", fontWeight: 800 }}>Solde :</td>
                <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 800 }}>
                  {formatTND(solde, { symbol: false })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer band - fixed at bottom of page */}
        <div style={{ marginTop: 20, breakInside: "avoid" }}>
          <div
            style={{
              border: "1px solid #000",
              display: "grid",
              gridTemplateColumns: "1.3fr 1.5fr 1fr 1.4fr",
              fontSize: "8.5pt",
            }}
          >
            <FooterCell>
              <div>{settings.footer_address}</div>
            </FooterCell>
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
    </div>
  );
});