import { forwardRef, useState, useEffect, useRef } from "react";
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
// 1. SECTION TABLE - With proper subtotal
// ============================================
function SectionTable({
  title,
  rows,
  amountLabel,
  showTitle = true,
  showSubtotal = true,
  isContinuation = false,
  totalForSubtotal = 0,
}: {
  title: string;
  rows: ReportRow[];
  amountLabel: string;
  showTitle?: boolean;
  showSubtotal?: boolean;
  isContinuation?: boolean;
  totalForSubtotal?: number;
}) {
  const total = totalForSubtotal > 0 ? totalForSubtotal : rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: showTitle && !isContinuation ? 20 : 0, breakInside: "avoid" }}>
      {showTitle && (
        <div
          style={{
            fontSize: "11pt",
            fontWeight: 700,
            color: "#000000",
            marginBottom: 6,
            borderBottom: "none",
          }}
        >
          {title} <span style={{ fontWeight: 400, fontSize: "9pt", color: "#666" }}>({rows.length} entrée{rows.length > 1 ? "s" : ""})</span>
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "9.5pt",
          border: "1px solid #000000",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #000000" }}>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                fontWeight: 700,
                width: "14%",
                fontSize: "8.5pt",
                borderBottom: "1px solid #000000",
              }}
            >
              Date
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                fontWeight: 700,
                fontSize: "8.5pt",
                borderBottom: "1px solid #000000",
              }}
            >
              {amountLabel}
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                fontWeight: 700,
                width: "15%",
                fontSize: "8.5pt",
                borderBottom: "1px solid #000000",
              }}
            >
              N° Réf.
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "6px 8px",
                fontWeight: 700,
                width: "18%",
                fontSize: "8.5pt",
                borderBottom: "1px solid #000000",
              }}
            >
              Montant (TND)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => {
            const isLast = index === rows.length - 1;
            return (
              <tr
                key={r.id}
                style={{
                  borderBottom: isLast ? "none" : "1px solid #000000",
                }}
              >
                <td
                  style={{
                    padding: "5px 8px",
                    color: "#000000",
                  }}
                >
                  {formatDate(r.date)}
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    color: "#000000",
                  }}
                >
                  {r.label}
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    fontFamily: "monospace",
                    fontSize: "8.5pt",
                    color: "#000000",
                  }}
                >
                  {r.reference}
                </td>
                <td
                  style={{
                    padding: "5px 8px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#000000",
                  }}
                >
                  {formatTND(r.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
        {showSubtotal && rows.length > 0 && (
          <tfoot>
            <tr style={{ borderTop: "1px solid #000000" }}>
              <td
                colSpan={3}
                style={{
                  padding: "6px 8px",
                  fontWeight: 700,
                  textAlign: "right",
                  fontSize: "9.5pt",
                }}
              >
                Sous-total
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  fontWeight: 700,
                  textAlign: "right",
                  fontSize: "9.5pt",
                }}
              >
                {formatTND(total)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ============================================
// 2. SUMMARY CARDS
// ============================================
function SummaryCards({
  salesTotal,
  totalEncaisse,
  purchasesTotal,
  expensesTotal,
  net,
  salesCount,
  purchasesCount,
  expensesCount,
}: {
  salesTotal: number;
  totalEncaisse: number;
  purchasesTotal: number;
  expensesTotal: number;
  net: number;
  salesCount: number;
  purchasesCount: number;
  expensesCount: number;
}) {
  const chargesTotal = purchasesTotal + expensesTotal;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        marginBottom: 20,
        border: "1px solid #000000",
        borderRadius: 0,
      }}
    >
      <div style={{ padding: "8px 12px", borderRight: "1px solid #000000" }}>
        <div style={{ fontSize: "7.5pt", color: "#666", textTransform: "uppercase", fontWeight: 600 }}>
          Chiffre d'affaires
        </div>
        <div style={{ fontSize: "14pt", fontWeight: 700, color: "#000000" }}>
          {formatTND(salesTotal)}
        </div>
        <div style={{ fontSize: "7pt", color: "#666" }}>{salesCount} facture{salesCount > 1 ? "s" : ""}</div>
      </div>
      <div style={{ padding: "8px 12px", borderRight: "1px solid #000000" }}>
        <div style={{ fontSize: "7.5pt", color: "#666", textTransform: "uppercase", fontWeight: 600 }}>
          Total encaissé
        </div>
        <div style={{ fontSize: "14pt", fontWeight: 700, color: "#000000" }}>
          {formatTND(totalEncaisse)}
        </div>
        <div style={{ fontSize: "7pt", color: "#666" }}>Paiements reçus</div>
      </div>
      <div style={{ padding: "8px 12px", borderRight: "1px solid #000000" }}>
        <div style={{ fontSize: "7.5pt", color: "#666", textTransform: "uppercase", fontWeight: 600 }}>
          Charges totales
        </div>
        <div style={{ fontSize: "14pt", fontWeight: 700, color: "#000000" }}>
          {formatTND(chargesTotal)}
        </div>
        <div style={{ fontSize: "7pt", color: "#666" }}>{purchasesCount + expensesCount} opérations</div>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: "7.5pt", color: "#666", textTransform: "uppercase", fontWeight: 600 }}>
          Résultat net
        </div>
        <div style={{ fontSize: "14pt", fontWeight: 700, color: net >= 0 ? "#000000" : "#DC2626" }}>
          {formatTND(net)}
        </div>
        <div style={{ fontSize: "7pt", color: "#666" }}>
          {net >= 0 ? "Bénéfice" : "Perte"}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 3. SYNTHÈSE FINANCIÈRE
// ============================================
function SyntheseFinanciere({
  salesTotal,
  purchasesTotal,
  expensesTotal,
  net,
  totalOperations,
  totalEncaisse,
}: {
  salesTotal: number;
  purchasesTotal: number;
  expensesTotal: number;
  net: number;
  totalOperations: number;
  totalEncaisse: number;
}) {
  return (
    <div
      style={{
        marginTop: 20,
        breakInside: "avoid",
        border: "1px solid #000000",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: "11pt",
          fontWeight: 700,
          borderBottom: "1px solid #000000",
          background: "#f9f9f9",
        }}
      >
        SYNTHÈSE FINANCIÈRE
        <span style={{ fontWeight: 400, fontSize: "8.5pt", color: "#666", marginLeft: 8 }}>
          ({totalOperations} opérations)
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #000000" }}>
            <td style={{ padding: "6px 12px", fontWeight: 600 }}>Chiffre d'affaires (ventes)</td>
            <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700 }}>
              {formatTND(salesTotal)}
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid #000000" }}>
            <td style={{ padding: "6px 12px", fontWeight: 600 }}>Factures d'achat</td>
            <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700 }}>
              − {formatTND(purchasesTotal)}
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid #000000" }}>
            <td style={{ padding: "6px 12px", fontWeight: 600 }}>Dépenses</td>
            <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700 }}>
              − {formatTND(expensesTotal)}
            </td>
          </tr>
          <tr
            style={{
              borderTop: "2px solid #000000",
              borderBottom: "1px solid #000000",
              background: "#f9f9f9",
            }}
          >
            <td style={{ padding: "8px 12px", fontWeight: 800, fontSize: "11pt" }}>
              RÉSULTAT NET
            </td>
            <td
              style={{
                padding: "8px 12px",
                textAlign: "right",
                fontWeight: 800,
                fontSize: "12pt",
                color: net >= 0 ? "#000000" : "#DC2626",
              }}
            >
              {formatTND(net)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "6px 12px", fontWeight: 600 }}>Total encaissé sur la période</td>
            <td
              style={{
                padding: "6px 12px",
                textAlign: "right",
                fontWeight: 700,
              }}
            >
              {formatTND(totalEncaisse)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// 4. PAGE TEMPLATE
// ============================================
function ReportPage({
  children,
  pageNumber,
  totalPages,
  showFooterBand = false,
  settings,
}: {
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
  showFooterBand?: boolean;
  settings: Settings;
}) {
  return (
    <div
      style={{
        width: "210mm",
        height: "297mm",
        padding: "10mm 12mm",
        boxSizing: "border-box",
        fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "10pt",
        lineHeight: 1.5,
        color: "#000000",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: "1 1 auto", minHeight: 0 }}>
        {children}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: "4mm" }} />

      {showFooterBand ? (
        <div style={{ breakInside: "avoid", flexShrink: 0 }}>
          <div
            style={{
              border: "1px solid #000000",
              display: "grid",
              gridTemplateColumns: "1.4fr 1.4fr 1fr 1.2fr",
              fontSize: "8pt",
            }}
          >
            <FooterCell>
              <div style={{ fontWeight: 700, color: "#000000", marginBottom: 2, fontSize: "8.5pt" }}>
                Adresse
              </div>
              <div style={{ color: "#000000" }}>{settings.footer_address}</div>
            </FooterCell>
            <FooterCell>
              <div style={{ fontWeight: 700, color: "#000000", marginBottom: 2, fontSize: "8.5pt" }}>
                Contact
              </div>
              <div style={{ color: "#000000" }}>Tél: {settings.phone}</div>
              <div style={{ color: "#000000" }}>Email: {settings.email}</div>
            </FooterCell>
            <FooterCell>
              <div style={{ fontWeight: 700, color: "#000000", marginBottom: 2, fontSize: "8.5pt" }}>
                Registre
              </div>
              <div style={{ color: "#000000" }}>RC: {settings.rc}</div>
              <div style={{ color: "#000000" }}>MF: {settings.matricule_fiscal}</div>
            </FooterCell>
            <FooterCell>
              <div style={{ fontWeight: 700, color: "#000000", marginBottom: 2, fontSize: "8.5pt" }}>
                Banque
              </div>
              <div style={{ color: "#000000", fontFamily: "monospace", fontSize: "7.5pt" }}>
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
              color: "#000000",
              marginTop: 6,
              borderTop: "1px solid #000000",
              paddingTop: 6,
            }}
          >
            <span>© {new Date().getFullYear()} {settings.company_name} — Tous droits réservés</span>
            <span>Document généré automatiquement</span>
            <span style={{ fontFamily: "monospace" }}>v1.0</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            flexShrink: 0,
            textAlign: "center",
            fontSize: "9pt",
            color: "#000000",
            paddingTop: "4mm",
            borderTop: "1px solid #000000",
          }}
        >
          Page {pageNumber} / {totalPages}
        </div>
      )}
    </div>
  );
}

// ============================================
// 5. HEADER
// ============================================
function ReportHeader({
  settings,
  periodLabel,
  reportNumber,
  currentDate,
}: {
  settings: Settings;
  periodLabel: string;
  reportNumber: string;
  currentDate: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #000000",
              padding: 2,
            }}
          >
            <LogoImg size={50} />
          </div>
          <div>
            <div
              style={{
                fontSize: "16pt",
                fontWeight: 700,
                lineHeight: 1.2,
                color: "#000000",
              }}
            >
              {settings.company_name}
            </div>
            <div style={{ fontSize: "7.5pt", color: "#000000", marginTop: 1 }}>
              {settings.footer_address}
            </div>
            <div style={{ fontSize: "7pt", color: "#000000" }}>
              RC: {settings.rc} | MF: {settings.matricule_fiscal}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "18pt",
              fontWeight: 700,
              color: "#000000",
              lineHeight: 1.1,
            }}
          >
            RAPPORT
          </div>
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 600,
              color: "#000000",
              marginTop: 1,
            }}
          >
            {periodLabel}
          </div>
          <div
            style={{
              fontSize: "7.5pt",
              color: "#000000",
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            N° {reportNumber}
          </div>
          <div style={{ fontSize: "7pt", color: "#000000", marginTop: 1 }}>
            Généré le {currentDate}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #000000",
          marginTop: 12,
          marginBottom: 16,
        }}
      />
    </>
  );
}

// ============================================
// 6. HOOK DE MESURE DES LIGNES
// ============================================
function useRowHeights(rows: ReportRow[]) {
  const [heights, setHeights] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    setHeights(null);
    rowRefs.current = new Map();
    let cancelled = false;

    function measure() {
      if (cancelled || !containerRef.current) return;

      const measured: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rowRefs.current.get(i);
        if (!row) {
          requestAnimationFrame(measure);
          return;
        }
        measured.push(row.getBoundingClientRect().height);
      }
      if (!cancelled) setHeights(measured);
    }

    if (rows.length === 0) {
      setHeights([]);
    } else if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(measure));
    } else {
      requestAnimationFrame(measure);
    }

    return () => {
      cancelled = true;
    };
  }, [rows]);

  const RowRenderer = () => (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: "210mm",
        padding: "10mm 12mm",
        boxSizing: "border-box",
        fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "10pt",
        lineHeight: 1.5,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "9.5pt",
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 8px", width: "14%" }}>Date</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Label</th>
            <th style={{ textAlign: "left", padding: "6px 8px", width: "15%" }}>N° Réf.</th>
            <th style={{ textAlign: "right", padding: "6px 8px", width: "18%" }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              ref={(el) => {
                if (el) rowRefs.current.set(i, el);
              }}
            >
              <td style={{ padding: "5px 8px" }}>{formatDate(r.date)}</td>
              <td style={{ padding: "5px 8px" }}>{r.label}</td>
              <td style={{ padding: "5px 8px" }}>{r.reference}</td>
              <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatTND(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return { heights, RowRenderer };
}

// ============================================
// 7. PAGE BUDGETS
// ============================================
const MM_TO_PX = 3.78;

const CHROME_HEIGHTS_MM = {
  sectionTitle: 16,
  tableHeaderRow: 28,
  subtotalRow: 28,
  footerBand: 72,
  simpleFooter: 22,
  syntheseBlock: 120,
  page1Overhead: 170,
};

const PAGE_HEIGHT_PX = 297 * MM_TO_PX;

function getPageBudget(isFirstPage: boolean, isLastPage: boolean): number {
  const footerHeight = isLastPage ? CHROME_HEIGHTS_MM.footerBand : CHROME_HEIGHTS_MM.simpleFooter;
  const overhead = isFirstPage ? CHROME_HEIGHTS_MM.page1Overhead : 0;
  const synthese = isLastPage ? CHROME_HEIGHTS_MM.syntheseBlock : 0;
  
  return PAGE_HEIGHT_PX - (footerHeight + overhead + synthese) * MM_TO_PX - 20;
}

// ============================================
// 8. SPLIT EN PAGES - Simple and clean
// ============================================
function splitContentIntoPages(
  sections: { rows: ReportRow[]; type: string; title: string; amountLabel: string }[],
  rowHeights: number[]
): { 
  rows: ReportRow[]; 
  type: string; 
  title: string; 
  amountLabel: string; 
  isContinuation: boolean;
  sectionTotal: number;
  isComplete: boolean;
}[][] {
  const pages: { 
    rows: ReportRow[]; 
    type: string; 
    title: string; 
    amountLabel: string; 
    isContinuation: boolean;
    sectionTotal: number;
    isComplete: boolean;
  }[][] = [];
  
  let currentPage: { 
    rows: ReportRow[]; 
    type: string; 
    title: string; 
    amountLabel: string; 
    isContinuation: boolean;
    sectionTotal: number;
    isComplete: boolean;
  }[] = [];
  
  let currentHeight = 0;
  let isFirstPage = true;
  let globalRowIndex = 0;
  let sectionStartedOnPage = false;

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const sectionRows = section.rows;
    
    if (sectionRows.length === 0) continue;

    const sectionTitleHeight = CHROME_HEIGHTS_MM.sectionTitle * MM_TO_PX;
    const sectionHeaderHeight = CHROME_HEIGHTS_MM.tableHeaderRow * MM_TO_PX;
    const sectionSubtotalHeight = CHROME_HEIGHTS_MM.subtotalRow * MM_TO_PX;
    
    const sectionTotal = sectionRows.reduce((sum, row) => sum + row.amount, 0);

    // Calculate rows height for this section
    let sectionRowsHeight = 0;
    for (let i = 0; i < sectionRows.length; i++) {
      sectionRowsHeight += rowHeights[globalRowIndex + i] || 20;
    }
    const totalSectionHeight = sectionTitleHeight + sectionHeaderHeight + sectionRowsHeight + sectionSubtotalHeight;

    // Check if the section fits on the current page
    const budget = getPageBudget(isFirstPage, false);
    
    // If current page is empty, we can always start a new section
    if (currentPage.length === 0) {
      // Start fresh page with this section
      currentPage.push({
        rows: [...sectionRows],
        type: section.type,
        title: section.title,
        amountLabel: section.amountLabel,
        isContinuation: false,
        sectionTotal: sectionTotal,
        isComplete: true,
      });
      currentHeight = totalSectionHeight;
      sectionStartedOnPage = true;
    } else {
      // Check if section fits on current page
      const fitsOnCurrentPage = currentHeight + totalSectionHeight <= budget;
      
      if (fitsOnCurrentPage) {
        // Add section to current page
        currentPage.push({
          rows: [...sectionRows],
          type: section.type,
          title: section.title,
          amountLabel: section.amountLabel,
          isContinuation: false,
          sectionTotal: sectionTotal,
          isComplete: true,
        });
        currentHeight += totalSectionHeight;
      } else {
        // Section doesn't fit - start a new page
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
        isFirstPage = false;
        sectionStartedOnPage = false;
        
        // Try to fit section on new page
        const newBudget = getPageBudget(isFirstPage, false);
        if (totalSectionHeight <= newBudget) {
          // Section fits on new page
          currentPage.push({
            rows: [...sectionRows],
            type: section.type,
            title: section.title,
            amountLabel: section.amountLabel,
            isContinuation: false,
            sectionTotal: sectionTotal,
            isComplete: true,
          });
          currentHeight = totalSectionHeight;
        } else {
          // Section is too large - split it
          let remainingRows = [...sectionRows];
          let rowOffset = 0;
          let isFirstChunk = true;
          let isComplete = false;

          while (remainingRows.length > 0) {
            // Start a new page for each chunk
            if (!isFirstChunk && currentPage.length > 0) {
              pages.push(currentPage);
              currentPage = [];
              currentHeight = 0;
              isFirstPage = false;
            }

            const chunkBudget = getPageBudget(isFirstPage, false);
            let chunkRows: ReportRow[] = [];
            let chunkHeight = 0;
            
            // Add title + header for first chunk only
            if (isFirstChunk) {
              chunkHeight += sectionTitleHeight + sectionHeaderHeight;
            } else {
              chunkHeight += sectionHeaderHeight;
            }

            // Pack as many rows as possible
            for (let i = 0; i < remainingRows.length; i++) {
              const rowHeight = rowHeights[globalRowIndex + rowOffset + i] || 20;
              // Check if adding this row would exceed budget
              if (chunkHeight + rowHeight <= chunkBudget) {
                chunkRows.push(remainingRows[i]);
                chunkHeight += rowHeight;
              } else {
                break;
              }
            }

            // If no rows fit, force at least one
            if (chunkRows.length === 0 && remainingRows.length > 0) {
              chunkRows.push(remainingRows[0]);
              chunkHeight += rowHeights[globalRowIndex + rowOffset] || 20;
            }

            const isLastChunk = chunkRows.length === remainingRows.length;
            isComplete = isLastChunk;

            // Add subtotal ONLY for the last chunk
            if (isLastChunk) {
              chunkHeight += sectionSubtotalHeight;
            }

            currentPage.push({
              rows: [...chunkRows],
              type: section.type,
              title: isFirstChunk ? section.title : "",
              amountLabel: section.amountLabel,
              isContinuation: !isFirstChunk,
              sectionTotal: sectionTotal,
              isComplete: isComplete,
            });

            currentHeight = chunkHeight;

            remainingRows = remainingRows.slice(chunkRows.length);
            rowOffset += chunkRows.length;
            isFirstChunk = false;

            // If there are more rows, push current page and continue
            if (remainingRows.length > 0) {
              pages.push(currentPage);
              currentPage = [];
              currentHeight = 0;
              isFirstPage = false;
            }
          }
        }
      }
    }

    globalRowIndex += sectionRows.length;
  }

  // Push the last page if it has content
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Verify all rows are assigned
  const totalRowsInPages = pages.reduce((sum, page) => sum + page.reduce((s, item) => s + item.rows.length, 0), 0);
  const totalOriginalRows = sections.reduce((sum, s) => sum + s.rows.length, 0);
  
  if (totalRowsInPages !== totalOriginalRows) {
    console.warn(`Row count mismatch: ${totalRowsInPages} vs ${totalOriginalRows}`);
  }

  return pages;
}

// ============================================
// 9. COMPOSANT PRINCIPAL
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

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Sort each section by date (oldest first)
  const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedPurchases = [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const allSections = [
    { rows: sortedSales, type: "sales", title: "Factures de vente", amountLabel: "Client" },
    { rows: sortedPurchases, type: "purchases", title: "Factures d'achat", amountLabel: "Fournisseur" },
    { rows: sortedExpenses, type: "expenses", title: "Dépenses", amountLabel: "Description" },
  ];

  const allRows = sortedSales.concat(sortedPurchases).concat(sortedExpenses);
  const { heights, RowRenderer } = useRowHeights(allRows);

  const [pageContents, setPageContents] = useState<{ 
    rows: ReportRow[]; 
    type: string; 
    title: string; 
    amountLabel: string; 
    isContinuation: boolean;
    sectionTotal: number;
    isComplete: boolean;
  }[][]>([]);
  const [allHeightsReady, setAllHeightsReady] = useState(false);

  useEffect(() => {
    if (heights && heights.length === allRows.length) {
      const split = splitContentIntoPages(allSections, heights);
      setPageContents(split);
      setAllHeightsReady(true);
    }
  }, [heights]);

  const totalPages = pageContents.length || 1;

  function groupRowsByPage(pageItems: { 
    rows: ReportRow[]; 
    type: string; 
    title: string; 
    amountLabel: string; 
    isContinuation: boolean;
    sectionTotal: number;
    isComplete: boolean;
  }[]) {
    const result: { 
      rows: ReportRow[]; 
      type: string; 
      title: string; 
      amountLabel: string; 
      isContinuation: boolean;
      sectionTotal: number;
      isComplete: boolean;
    }[] = [];
    
    let currentType = "";
    let currentRows: ReportRow[] = [];
    let currentTitle = "";
    let currentAmountLabel = "";
    let currentIsContinuation = false;
    let currentSectionTotal = 0;
    let currentIsComplete = false;

    pageItems.forEach((item) => {
      if (item.type !== currentType) {
        if (currentRows.length > 0) {
          result.push({
            rows: [...currentRows],
            type: currentType,
            title: currentTitle,
            amountLabel: currentAmountLabel,
            isContinuation: currentIsContinuation,
            sectionTotal: currentSectionTotal,
            isComplete: currentIsComplete,
          });
        }
        currentType = item.type;
        currentRows = [...item.rows];
        currentTitle = item.title;
        currentAmountLabel = item.amountLabel;
        currentIsContinuation = item.isContinuation || false;
        currentSectionTotal = item.sectionTotal || 0;
        currentIsComplete = item.isComplete || false;
      } else {
        currentRows.push(...item.rows);
        if (item.isContinuation) currentIsContinuation = true;
        if (item.isComplete) currentIsComplete = true;
        currentSectionTotal = item.sectionTotal || currentSectionTotal;
      }
    });

    if (currentRows.length > 0) {
      result.push({
        rows: [...currentRows],
        type: currentType,
        title: currentTitle,
        amountLabel: currentAmountLabel,
        isContinuation: currentIsContinuation,
        sectionTotal: currentSectionTotal,
        isComplete: currentIsComplete,
      });
    }

    return result;
  }

  return (
    <>
      <RowRenderer />

      <div ref={ref} data-printable-root style={{ position: "relative" }}>
        {allHeightsReady && pageContents.length > 0 ? (
          pageContents.map((pageItems, pageIndex) => {
            const isLastPage = pageIndex === pageContents.length - 1;
            const isFirstPage = pageIndex === 0;
            const pageNumber = pageIndex + 1;
            
            const sectionsForPage = groupRowsByPage(pageItems);
            const hasContentOnPage = sectionsForPage.some(s => s.rows.length > 0);

            return (
              <ReportPage
                key={pageIndex}
                pageNumber={pageNumber}
                totalPages={totalPages}
                showFooterBand={isLastPage}
                settings={settings}
              >
                {isFirstPage && (
                  <>
                    <ReportHeader
                      settings={settings}
                      periodLabel={periodLabel}
                      reportNumber={reportNumber}
                      currentDate={currentDate}
                    />
                    <SummaryCards
                      salesTotal={salesTotal}
                      totalEncaisse={totalEncaisse}
                      purchasesTotal={purchasesTotal}
                      expensesTotal={expensesTotal}
                      net={net}
                      salesCount={sortedSales.length}
                      purchasesCount={sortedPurchases.length}
                      expensesCount={sortedExpenses.length}
                    />
                  </>
                )}

                {hasContentOnPage && sectionsForPage.map((section, idx) => {
                  const showSubtotal = section.isComplete;
                  const totalForSubtotal = section.sectionTotal || 0;
                  
                  return (
                    <SectionTable
                      key={idx}
                      title={section.title}
                      rows={section.rows}
                      amountLabel={section.amountLabel}
                      showTitle={!section.isContinuation}
                      showSubtotal={showSubtotal}
                      isContinuation={section.isContinuation}
                      totalForSubtotal={totalForSubtotal}
                    />
                  );
                })}

                {isLastPage && (
                  <SyntheseFinanciere
                    salesTotal={salesTotal}
                    purchasesTotal={purchasesTotal}
                    expensesTotal={expensesTotal}
                    net={net}
                    totalOperations={totalOperations}
                    totalEncaisse={totalEncaisse}
                  />
                )}
              </ReportPage>
            );
          })
        ) : (
          <ReportPage
            pageNumber={1}
            totalPages={1}
            showFooterBand={true}
            settings={settings}
          >
            <ReportHeader
              settings={settings}
              periodLabel={periodLabel}
              reportNumber={reportNumber}
              currentDate={currentDate}
            />
            <SummaryCards
              salesTotal={salesTotal}
              totalEncaisse={totalEncaisse}
              purchasesTotal={purchasesTotal}
              expensesTotal={expensesTotal}
              net={net}
              salesCount={sortedSales.length}
              purchasesCount={sortedPurchases.length}
              expensesCount={sortedExpenses.length}
            />
            <SectionTable title="Factures de vente" rows={sortedSales} amountLabel="Client" showSubtotal={true} totalForSubtotal={salesTotal} />
            <SectionTable title="Factures d'achat" rows={sortedPurchases} amountLabel="Fournisseur" showSubtotal={true} totalForSubtotal={purchasesTotal} />
            <SectionTable title="Dépenses" rows={sortedExpenses} amountLabel="Description" showSubtotal={true} totalForSubtotal={expensesTotal} />
            <SyntheseFinanciere
              salesTotal={salesTotal}
              purchasesTotal={purchasesTotal}
              expensesTotal={expensesTotal}
              net={net}
              totalOperations={totalOperations}
              totalEncaisse={totalEncaisse}
            />
          </ReportPage>
        )}
      </div>
    </>
  );
});