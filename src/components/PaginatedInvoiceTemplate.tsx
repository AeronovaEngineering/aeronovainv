import { forwardRef, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";
import {
  InvoiceFullHeader,
  InvoiceCondensedHeader,
  InvoiceItemsTable,
  InvoiceFooterBand,
  type Doc,
  type Item,
} from "@/components/InvoiceTemplate";
import { useRowHeights, splitItemsIntoPages } from "@/lib/invoice-pagination";
import { formatTND, amountInWordsFR } from "@/lib/format";

type Settings = Database["public"]["Tables"]["company_settings"]["Row"];
type PartyLike = { company_name: string; address: string | null; telephone: string | null; matricule_fiscal: string | null };

interface PaginatedInvoiceTemplateProps {
  kind: "FACTURE" | "DEVIS";
  doc: Doc;
  client: PartyLike;
  items: Item[];
  settings: Settings;
}

/**
 * Hardcoded page budgets in pixels based on A4 page at 210mm x 297mm
 * with 12mm top/bottom and 14mm left/right padding.
 * 
 * Total page height: 297mm ≈ 1122.5px (at 96dpi)
 * Padding: 12mm ≈ 45.35px top + bottom = 90.7px
 * Available body: ≈ 1031.8px
 * 
 * First page overhead (full header + parties + project):
 * - Full header: ~200px
 * - Parties grid: ~120px
 * - Project block: ~60px
 * - Borders/spacing: ~30px
 * Total: ~410px
 * 
 * Condensed header overhead: ~50px
 * 
 * Last page overhead (totals + amount + conditions + signatures):
 * - Totals table: ~180px
 * - Amount in words: ~60px
 * - Conditions (if present): variable, estimated 50px
 * - Signatures: ~110px
 * - Spacing: ~40px
 * Total: ~440px (or ~490px with conditions)
 */
const PAGE_BUDGETS = {
  first: 1031.8 - 410, // ~621.8px for items
  middle: 1031.8 - 50, // ~981.8px for items
  last: 1031.8 - 440, // ~591.8px for items (without conditions)
  lastWithConditions: 1031.8 - 490, // ~541.8px for items (with conditions)
};

export const PaginatedInvoiceTemplate = forwardRef<
  HTMLDivElement,
  PaginatedInvoiceTemplateProps
>(function PaginatedInvoiceTemplate(
  { kind, doc, client, items, settings },
  ref
) {
  const { heights, RowRenderer } = useRowHeights(items);

  // Calculate last page budget based on whether conditions are shown
  const lastBudget = useMemo(() => {
    const hasConditions = kind === "DEVIS" && doc.conditions_generales;
    return hasConditions ? PAGE_BUDGETS.lastWithConditions : PAGE_BUDGETS.last;
  }, [kind, doc.conditions_generales]);

  // Split items into pages once heights are measured
  const pages = useMemo(() => {
    if (!heights) return null;
    return splitItemsIntoPages(items, heights, {
      first: PAGE_BUDGETS.first,
      middle: PAGE_BUDGETS.middle,
      last: lastBudget,
    });
  }, [items, heights, lastBudget]);

  // While measuring, render hidden rows and nothing visible
  if (!heights || !pages) {
    return <RowRenderer />;
  }

  const totalPages = pages.length;

  return (
    <div ref={ref}>
      {pages.map((pageItems, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            style={{
              width: "210mm",
              height: "297mm",
              padding: "12mm 14mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              background: "#fff",
              fontFamily: "Inter, Arial, sans-serif",
              fontSize: "10.5pt",
              lineHeight: 1.35,
              color: "#000",
              marginBottom: "10mm",
              // @ts-ignore - print margin reset
              "@media print": { marginBottom: 0 },
            }}
          >
            {/* Top block */}
            <div style={{ flexShrink: 0 }}>
              {isFirst ? (
                <>
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
                  <div style={{ marginTop: 18 }}>
                    <div><strong>Projet :</strong> {doc.project_name ?? ""}</div>
                    <div><strong>Adresse :</strong> {doc.project_address ?? ""}</div>
                  </div>
                  <div style={{ borderTop: "1px solid #000", marginTop: 14 }} />
                </>
              ) : (
                <InvoiceCondensedHeader kind={kind} doc={doc} />
              )}
            </div>

            {/* Items table - flex:1 pushes footer down */}
            <div style={{ flex: "1 1 auto" }}>
              <InvoiceItemsTable items={pageItems} />
              <div style={{ borderTop: "1px solid #000", marginTop: 8 }} />
            </div>

            {/* Bottom block - only on last page */}
            {isLast && (
              <div style={{ flexShrink: 0 }}>
                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <table style={{ minWidth: "48%" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "3px 8px", fontWeight: 700 }}>TOTAL HT :</td>
                        <td style={{ padding: "3px 0", textAlign: "right" }}>
                          {formatTND(doc.subtotal_ht, { symbol: false })}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 8px", fontWeight: 700 }}>
                          TVA {Number(doc.vat_rate).toFixed(0)}% :
                        </td>
                        <td style={{ padding: "3px 0", textAlign: "right" }}>
                          {formatTND(doc.vat_amount, { symbol: false })}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 8px", fontWeight: 700 }}>Timbre fiscale :</td>
                        <td style={{ padding: "3px 0", textAlign: "right" }}>
                          {formatTND(doc.fiscal_stamp, { symbol: false })}
                        </td>
                      </tr>
                      <tr style={{ borderTop: "1px solid #000" }}>
                        <td style={{ padding: "5px 8px", fontWeight: 800 }}>TOTAL TTC :</td>
                        <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 800 }}>
                          {formatTND(doc.total_ttc, { symbol: false })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Amount in words */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontWeight: 700 }}>
                    Arrêtée la présente {kind === "FACTURE" ? "facture" : "devis"} à la somme de :
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>
                    {amountInWordsFR(Number(doc.total_ttc))} TTC.
                  </div>
                </div>

                {/* Conditions générales - only for DEVIS */}
                {kind === "DEVIS" && doc.conditions_generales && (
                  <div style={{ marginTop: 12, fontSize: "9pt" }}>
                    <div style={{ fontWeight: 700 }}>Conditions générales :</div>
                    {doc.conditions_generales.split("\n").map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                )}

                {/* Signatures */}
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
            )}

            {/* Spacer for non-last pages to push footer down */}
            {!isLast && <div style={{ flex: "1 1 auto" }} />}

            {/* Footer */}
            <div style={{ flexShrink: 0, marginTop: isLast ? 24 : 0 }}>
              <InvoiceFooterBand
                settings={settings}
                pageLabel={`${pageIndex + 1}/${totalPages}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});