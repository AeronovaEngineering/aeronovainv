import { forwardRef, useState } from "react";
import type { Database } from "@/integrations/supabase/types";
import { formatDate, formatTND, amountInWordsFR, formatDocNumber } from "@/lib/format";
import { LOGO_BASE64 } from "../lib/logo";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];
type PartyLike = { company_name: string; address: string | null; telephone: string | null; matricule_fiscal: string | null };
export type Doc = {
  number: number; year: number; document_date: string;
  project_name: string | null; project_address: string | null;
  subtotal_ht: number; vat_amount: number; vat_rate: number;
  fiscal_stamp: number; total_ttc: number;
  conditions_generales?: string | null;
};
export type Item = {
  description: string; unit: string | null;
  quantity: number; unit_price_ht: number; total_ht: number;
};

export function InvoiceFullHeader({ kind, doc, settings }: { kind: "FACTURE" | "DEVIS"; doc: Doc; settings: Settings }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 94, height: 94, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fff", border: "0",
          }}>
            <LogoImg size={120} />
          </div>
          <div style={{ fontSize: "20pt", fontWeight: 700, lineHeight: 1.05 }}>
            {settings.company_name.split(" ")[0]}<br />
            <span style={{ fontWeight: 600 }}>{settings.company_name.split(" ").slice(1).join(" ") || "Engineering"}</span>
          </div>
        </div>
        <div style={{ fontSize: "26pt", fontWeight: 800, letterSpacing: "0.02em" }}>{kind}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: "10.5pt" }}>
        <div><strong>DATE :</strong> {formatDate(doc.document_date)}</div>
        <div><strong>{kind === "FACTURE" ? "FACTURE" : "DEVIS"} N° :</strong> {formatDocNumber(doc.number, doc.year)}</div>
      </div>

      <div style={{ borderTop: "1px solid #000", marginTop: 8 }} />
    </>
  );
}

export function InvoiceCondensedHeader({ kind, doc }: { kind: "FACTURE" | "DEVIS"; doc: Doc }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: "14pt", fontWeight: 700 }}>
          {doc.project_name || "Document"}
        </div>
        <div style={{ fontSize: "9pt", display: "flex", gap: 16 }}>
          <span><strong>DATE :</strong> {formatDate(doc.document_date)}</span>
          <span><strong>{kind === "FACTURE" ? "FACTURE" : "DEVIS"} N° :</strong> {formatDocNumber(doc.number, doc.year)}</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #000", marginTop: 6, borderBottom: "1px solid #000", marginBottom: 6 }} />
    </>
  );
}

export function InvoiceItemsTable({ items }: { items: Item[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #000" }}>
          <th style={{ textAlign: "left", padding: "6px 4px", fontWeight: 700 }}>Description :</th>
          <th style={{ textAlign: "left", padding: "6px 4px", width: "12%", fontWeight: 700 }}>Unité</th>
          <th style={{ textAlign: "left", padding: "6px 4px", width: "8%", fontWeight: 700 }}>Qté</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: "16%", fontWeight: 700 }}>P.U.H.T</th>
          <th style={{ textAlign: "right", padding: "6px 4px", width: "16%", fontWeight: 700 }}>P.T.H.T</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td style={{ padding: "5px 4px" }}>
              {it.description
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((line, idx) => (
                  <div key={idx}>· {line}</div>
                ))}
            </td>
            <td style={{ padding: "5px 4px", verticalAlign: "bottom" }}>{it.unit ?? "unité"}</td>
            <td style={{ padding: "5px 4px", verticalAlign: "bottom" }}>{Number(it.quantity).toLocaleString("fr-FR")}</td>
            <td style={{ padding: "5px 4px", textAlign: "right", verticalAlign: "bottom" }}>{formatTND(it.unit_price_ht, { symbol: false })}</td>
            <td style={{ padding: "5px 4px", textAlign: "right", verticalAlign: "bottom" }}>{formatTND(it.total_ht, { symbol: false })}</td>
          </tr>
        ))}
        {items.length === 0 && (
          <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#666" }}>Aucune ligne</td></tr>
        )}
      </tbody>
    </table>
  );
}

export function InvoiceFooterBand({ settings, pageLabel }: { settings: Settings; pageLabel?: string }) {
  return (
    <>
      <div style={{
        border: "1px solid #000", display: "grid",
        gridTemplateColumns: "1.3fr 1.5fr 1fr 1.4fr", fontSize: "10pt",
      }}>
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
      {pageLabel && (
        <div style={{ marginTop: 4, fontSize: "8pt", textAlign: "right" }}>
          {pageLabel}
        </div>
      )}
    </>
  );
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, {
  kind: "FACTURE" | "DEVIS";
  doc: Doc; client: PartyLike; items: Item[]; settings: Settings;
}>(function InvoiceTemplate({ kind, doc, client, items, settings }, ref) {
  return (
    <div
      ref={ref}
      data-printable-root
      className="mx-auto"
      style={{
        width: "210mm", height: "297mm", padding: "12mm 14mm", boxSizing: "border-box",
        display: "flex", flexDirection: "column", background: "#fff",
        fontFamily: "Inter, Arial, sans-serif", fontSize: "10.5pt", lineHeight: 1.35, color: "#000",
      }}
    >
      {/* Top block: header through items table — natural height, never shrinks */}
      <div style={{ flexShrink: 0 }}>
        <InvoiceFullHeader kind={kind} doc={doc} settings={settings} />

        {/* Parties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{settings.company_name}</div>
            <div>{settings.address}</div>
            <div>{settings.phone}</div>
            <div><strong>MF:</strong> {settings.matricule_fiscal}</div>
          </div>
          <div>
            <div><strong>Client :</strong> {client.company_name}</div>
            <div><strong>Adresse :</strong> {client.address ?? "—"}</div>
            <div><strong>Tél :</strong> {client.telephone ?? "—"}</div>
            <div><strong>MF:</strong> {client.matricule_fiscal ?? "—"}</div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #000", marginTop: 14 }} />

        {/* Project */}
        <div style={{ marginTop: 18 }}>
          <div><strong>Projet :</strong> {doc.project_name ?? ""}</div>
          <div><strong>Adresse :</strong> {doc.project_address ?? ""}</div>
        </div>

        <div style={{ borderTop: "1px solid #000", marginTop: 14 }} />

        {/* Items table */}
        <InvoiceItemsTable items={items} />

        <div style={{ borderTop: "1px solid #000", marginTop: 8 }} />
      </div>
      
      {/* Spacer: absorbs all leftover vertical space so the block below is always
          anchored just above the footer, never floating high up on short invoices */}
      <div style={{ flex: "1 1 auto" }} />

      {/* Bottom block: totals, amount in words, signatures — fixed height, pinned above footer */}
      <div style={{ flexShrink: 0 }}>
        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <table style={{ minWidth: "48%" }}>
            <tbody>
              <tr><td style={{ padding: "3px 8px", fontWeight: 700 }}>TOTAL HT :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>{formatTND(doc.subtotal_ht, { symbol: false })}</td></tr>
              <tr><td style={{ padding: "3px 8px", fontWeight: 700 }}>TVA {Number(doc.vat_rate).toFixed(0)}% :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>{formatTND(doc.vat_amount, { symbol: false })}</td></tr>
              <tr><td style={{ padding: "3px 8px", fontWeight: 700 }}>Timbre fiscale :</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>{formatTND(doc.fiscal_stamp, { symbol: false })}</td></tr>
              <tr style={{ borderTop: "1px solid #000" }}>
                <td style={{ padding: "5px 8px", fontWeight: 800 }}>TOTAL TTC :</td>
                <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 800 }}>{formatTND(doc.total_ttc, { symbol: false })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700 }}>Arrêtée la présente {kind === "FACTURE" ? "facture" : "devis"} à la somme de :</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>{amountInWordsFR(Number(doc.total_ttc))} TTC.</div>
        </div>

        {/* Conditions générales - only for DEVIS */}
        {kind === "DEVIS" && doc.conditions_generales && (
          <div style={{ marginTop: 12, fontSize: "9pt" }}>
            <div style={{ fontWeight: 700 }}>Conditions générales :</div>
            {doc.conditions_generales
              .split("\n")
              .map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 40 }}>
          <div style={{ width: "28%" }} />
          <div style={{ display: "flex", gap: 50 }}>
            <div style={{ width: 130, textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>CLIENT</div>
              <div style={{ height: 70 }} />
            </div>
            <div style={{ width: 130, textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>DIRECTION</div>
              <div style={{ height: 70 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer — always the last flex item, so it always sits at the same fixed
          position at the bottom of the page regardless of how much content is above */}
      <div style={{ flexShrink: 0, marginTop: 24 }}>
        <InvoiceFooterBand settings={settings} />
      </div>
    </div>
  );
});

export function FooterCell({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "6px 8px", borderRight: "1px solid #000" }}>{children}</div>;
}

export function LogoImg({ src = LOGO_BASE64, size = 94 }: { src?: string; size?: number }) {
  const [error, setError] = useState(false);

  if (error) {
    return <AeronovaLogo />;
  }

  return <img src={src} alt="" style={{ maxWidth: size, maxHeight: size }} onError={() => setError(true)} />;
}

export function AeronovaLogo() {
  return (
    <svg viewBox="0 0 100 100" width="88" height="88">
      <path d="M50 12 L82 78 L66 78 L58 60 L42 60 L34 78 L18 78 Z" fill="#c9a75a" />
      <path d="M50 34 L58 52 L42 52 Z" fill="#fff" />
      <text x="50" y="93" textAnchor="middle" fontSize="9" fontWeight="700" fill="#3b332a" fontFamily="Inter,Arial">
        AERONOVA
      </text>
    </svg>
  );
}