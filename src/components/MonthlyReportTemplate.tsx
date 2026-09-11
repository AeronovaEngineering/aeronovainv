import { forwardRef, memo, useState, useEffect, useMemo, useRef } from "react";
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
// Footer is ALWAYS the same band, on every page, at the same fixed height.
// It never toggles between a "simple" and a "full" variant anymore — that
// toggle was the source of the page-budget mismatch that caused overlap.
// Pulled out as its own component so the measurement hook below can render
// an identical hidden copy and find out its REAL height instead of guessing.
function FooterBand({
  settings,
  pageNumber,
  totalPages,
}: {
  settings: Settings;
  pageNumber: number;
  totalPages: number;
}) {
  return (
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
        <span style={{ fontFamily: "monospace" }}>Page {pageNumber} / {totalPages}</span>
      </div>
    </div>
  );
}

function ReportPage({
  children,
  pageNumber,
  totalPages,
  settings,
}: {
  children: React.ReactNode;
  pageNumber: number;
  totalPages: number;
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
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        {children}
      </div>

      <div style={{ flex: "1 1 auto", minHeight: "4mm" }} />

      <FooterBand settings={settings} pageNumber={pageNumber} totalPages={totalPages} />
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
// 6b. HOOK DE MESURE DU "CHROME" (header, titres, lignes de
// tête/sous-total, footer, synthèse) — mesure réelle au lieu de
// constantes devinées. Les anciennes valeurs CHROME_HEIGHTS_MM étaient
// des estimations approximatives (souvent 2x trop généreuses), ce qui
// gaspillait de la place et forçait des sauts de page inutiles.
// ============================================
type ChromeHeights = {
  page1Overhead: number;
  sectionTitle: number;
  tableHeaderRow: number;
  subtotalRow: number;
  footerBand: number;
  syntheseBlock: number;
};

function useChromeHeights(params: {
  settings: Settings;
  periodLabel: string;
  reportNumber: string;
  currentDate: string;
  salesTotal: number;
  purchasesTotal: number;
  expensesTotal: number;
  net: number;
  totalOperations: number;
  totalEncaisse: number;
}) {
  const {
    settings, periodLabel, reportNumber, currentDate,
    salesTotal, purchasesTotal, expensesTotal, net, totalOperations, totalEncaisse,
  } = params;

  const [chrome, setChrome] = useState<ChromeHeights | null>(null);
  const overheadRef = useRef<HTMLDivElement>(null);
  const sectionTitleRef = useRef<HTMLDivElement>(null);
  const tableHeaderRowRef = useRef<HTMLTableRowElement>(null);
  const subtotalRowRef = useRef<HTMLTableRowElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const syntheseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChrome(null);
    let cancelled = false;

    function measure() {
      if (cancelled) return;
      if (
        !overheadRef.current || !sectionTitleRef.current || !tableHeaderRowRef.current ||
        !subtotalRowRef.current || !footerRef.current || !syntheseRef.current
      ) {
        requestAnimationFrame(measure);
        return;
      }
      setChrome({
        page1Overhead: overheadRef.current.getBoundingClientRect().height,
        sectionTitle: sectionTitleRef.current.getBoundingClientRect().height,
        tableHeaderRow: tableHeaderRowRef.current.getBoundingClientRect().height,
        subtotalRow: subtotalRowRef.current.getBoundingClientRect().height,
        footerBand: footerRef.current.getBoundingClientRect().height,
        syntheseBlock: syntheseRef.current.getBoundingClientRect().height,
      });
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(measure));
    } else {
      requestAnimationFrame(measure);
    }

    return () => {
      cancelled = true;
    };
  }, [settings, periodLabel, reportNumber, currentDate, salesTotal, purchasesTotal, expensesTotal, net, totalOperations, totalEncaisse]);

  const ChromeRenderer = () => (
    <div style={{ position: "fixed", left: -99999, top: 0 }}>
      {/* Real header + real summary cards, same width/padding as an actual page */}
      <div
        ref={overheadRef}
        style={{
          width: "210mm",
          padding: "10mm 12mm",
          boxSizing: "border-box",
          fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "10pt",
          lineHeight: 1.5,
          overflow: "hidden",
        }}
      >
        <ReportHeader settings={settings} periodLabel={periodLabel} reportNumber={reportNumber} currentDate={currentDate} />
        <SummaryCards
          salesTotal={salesTotal}
          totalEncaisse={totalEncaisse}
          purchasesTotal={purchasesTotal}
          expensesTotal={expensesTotal}
          net={net}
          salesCount={0}
          purchasesCount={0}
          expensesCount={0}
        />
      </div>

      {/* Section title block — identical markup to SectionTable's title */}
      <div
        style={{
          width: "186mm",
          fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "10pt",
          lineHeight: 1.5,
          overflow: "hidden",
        }}
      >
        <div ref={sectionTitleRef} style={{ marginTop: 20, fontSize: "11pt", fontWeight: 700, marginBottom: 6 }}>
          Titre d'exemple <span style={{ fontWeight: 400, fontSize: "9pt" }}>(1 entrée)</span>
        </div>
      </div>

      {/* Table header row — identical markup to SectionTable's <thead> */}
      <table style={{ width: "186mm", borderCollapse: "collapse", fontSize: "9.5pt", border: "1px solid #000000" }}>
        <thead>
          <tr ref={tableHeaderRowRef} style={{ borderBottom: "1px solid #000000" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, width: "14%", fontSize: "8.5pt" }}>Date</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, fontSize: "8.5pt" }}>Label</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, width: "15%", fontSize: "8.5pt" }}>N° Réf.</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, width: "18%", fontSize: "8.5pt" }}>Montant</th>
          </tr>
        </thead>
      </table>

      {/* Subtotal row — identical markup to SectionTable's <tfoot> */}
      <table style={{ width: "186mm", borderCollapse: "collapse", fontSize: "9.5pt" }}>
        <tfoot>
          <tr ref={subtotalRowRef} style={{ borderTop: "1px solid #000000" }}>
            <td colSpan={3} style={{ padding: "6px 8px", fontWeight: 700, textAlign: "right", fontSize: "9.5pt" }}>
              Sous-total
            </td>
            <td style={{ padding: "6px 8px", fontWeight: 700, textAlign: "right", fontSize: "9.5pt" }}>
              0,000 DT
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Real footer band, real settings */}
      <div
        style={{
          width: "186mm",
          fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "10pt",
          lineHeight: 1.5,
          overflow: "hidden",
        }}
      >
        <div ref={footerRef}>
          <FooterBand settings={settings} pageNumber={1} totalPages={1} />
        </div>
      </div>

      {/* Real Synthèse block, with the real final totals */}
      <div
        style={{
          width: "186mm",
          fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
          fontSize: "10pt",
          lineHeight: 1.5,
          overflow: "hidden",
        }}
      >
        <div ref={syntheseRef}>
          <SyntheseFinanciere
            salesTotal={salesTotal}
            purchasesTotal={purchasesTotal}
            expensesTotal={expensesTotal}
            net={net}
            totalOperations={totalOperations}
            totalEncaisse={totalEncaisse}
          />
        </div>
      </div>
    </div>
  );

  return { chrome, ChromeRenderer };
}

// ============================================
// 7. PAGE BUDGETS
// ============================================
const MM_TO_PX = 3.78;
const PAGE_HEIGHT_PX = 297 * MM_TO_PX;

// Budget is built entirely from REAL measured heights now (see
// useChromeHeights above) instead of guessed constants — the footer is
// constant on every page, so the only thing that varies is the header +
// summary-cards overhead on page 1. A small safety margin (a few px) is
// kept to absorb sub-pixel rounding, nothing more.
function getPageBudget(isFirstPage: boolean, chrome: ChromeHeights): number {
  const overhead = isFirstPage ? chrome.page1Overhead : 0;
  return PAGE_HEIGHT_PX - chrome.footerBand - overhead - 8;
}

// ============================================
// 8. SPLIT EN PAGES - Simple and clean
// ============================================
function splitContentIntoPages(
  sections: { rows: ReportRow[]; type: string; title: string; amountLabel: string }[],
  rowHeights: number[],
  chrome: ChromeHeights
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

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const sectionRows = section.rows;
    
    if (sectionRows.length === 0) continue;

    // Each section (ventes / achats / dépenses) always starts on a fresh
    // page — sections are never mixed together on the same page. This is
    // what keeps "page 1 = ventes, page 2 = achats, page 3 = dépenses"
    // predictable instead of depending on fragile height math.
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
      isFirstPage = false;
    }

    const sectionTitleHeight = chrome.sectionTitle;
    const sectionHeaderHeight = chrome.tableHeaderRow;
    const sectionSubtotalHeight = chrome.subtotalRow;
    
    const sectionTotal = sectionRows.reduce((sum, row) => sum + row.amount, 0);

    // Calculate rows height for this section
    let sectionRowsHeight = 0;
    for (let i = 0; i < sectionRows.length; i++) {
      sectionRowsHeight += rowHeights[globalRowIndex + i] || 20;
    }
    const totalSectionHeight = sectionTitleHeight + sectionHeaderHeight + sectionRowsHeight + sectionSubtotalHeight;
    const budget = getPageBudget(isFirstPage, chrome);

    if (totalSectionHeight <= budget) {
      // Whole section fits on this (fresh) page
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
      // Section is too large for one page — split it across as many
      // continuation pages as needed. The subtotal is only ever emitted
      // on the final chunk, and only that chunk is marked complete.
      let remainingRows = [...sectionRows];
      let rowOffset = 0;
      let isFirstChunk = true;

      while (remainingRows.length > 0) {
        if (!isFirstChunk) {
          pages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
          isFirstPage = false;
        }

        const chunkBudget = getPageBudget(isFirstPage, chrome);
        let chunkRows: ReportRow[] = [];
        let chunkHeight = isFirstChunk
          ? sectionTitleHeight + sectionHeaderHeight
          : sectionHeaderHeight;

        // Pack as many rows as possible
        for (let i = 0; i < remainingRows.length; i++) {
          const rowHeight = rowHeights[globalRowIndex + rowOffset + i] || 20;
          if (chunkHeight + rowHeight <= chunkBudget) {
            chunkRows.push(remainingRows[i]);
            chunkHeight += rowHeight;
          } else {
            break;
          }
        }

        // If no rows fit, force at least one (avoids an infinite loop)
        if (chunkRows.length === 0 && remainingRows.length > 0) {
          chunkRows.push(remainingRows[0]);
          chunkHeight += rowHeights[globalRowIndex + rowOffset] || 20;
        }

        const isLastChunk = chunkRows.length === remainingRows.length;
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
          isComplete: isLastChunk,
        });

        currentHeight = chunkHeight;
        remainingRows = remainingRows.slice(chunkRows.length);
        rowOffset += chunkRows.length;
        isFirstChunk = false;
      }
    }

    globalRowIndex += sectionRows.length;
  }

  // Reserve real room for the Synthèse Financière block, instead of
  // guessing at split time whether the current page would be "last".
  // Now that splitting is finished we know for certain — so check whether
  // it actually fits in what's left of the current (last) page, and if
  // not, give it a dedicated page of its own instead of letting it spill
  // over the footer.
  const syntheseHeight = chrome.syntheseBlock;
  const finalBudget = getPageBudget(isFirstPage, chrome);

  if (currentPage.length === 0 || currentHeight + syntheseHeight > finalBudget) {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    currentPage = [];
  }
  pages.push(currentPage);

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

  // Sort each section by date (oldest first).
  //
  // IMPORTANT: these are memoized on the `sales`/`purchases`/`expenses`
  // prop arrays. Without this, `.sort()`/`.concat()` create brand-new
  // array instances on *every* render of this component — and since
  // `useRowHeights` below restarts its whole measurement effect whenever
  // its `rows` argument's reference changes, any unrelated re-render of
  // this component (e.g. a parent re-render caused by React Query
  // refetching `company_settings` on window focus — the default
  // behaviour — while the export is in flight) would reset the
  // measurement mid-flight. Repeated resets can keep the pagination
  // from ever reaching `data-pagination-ready="true"` inside the 10s
  // budget, which is what surfaces as "La pagination du rapport n'a pas
  // abouti à temps." This is far more likely to happen in production
  // (real users tabbing away while a report exports) than in local dev,
  // where nobody switches windows mid-test.
  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sales]
  );
  const sortedPurchases = useMemo(
    () => [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [purchases]
  );
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [expenses]
  );

  const allSections = useMemo(
    () => [
      { rows: sortedSales, type: "sales", title: "Factures de vente", amountLabel: "Client" },
      { rows: sortedPurchases, type: "purchases", title: "Factures d'achat", amountLabel: "Fournisseur" },
      { rows: sortedExpenses, type: "expenses", title: "Dépenses", amountLabel: "Description" },
    ],
    [sortedSales, sortedPurchases, sortedExpenses]
  );

  const allRows = useMemo(
    () => sortedSales.concat(sortedPurchases).concat(sortedExpenses),
    [sortedSales, sortedPurchases, sortedExpenses]
  );
  const { heights, RowRenderer } = useRowHeights(allRows);
  const { chrome, ChromeRenderer } = useChromeHeights({
    settings,
    periodLabel,
    reportNumber,
    currentDate,
    salesTotal,
    purchasesTotal,
    expensesTotal,
    net,
    totalOperations,
    totalEncaisse,
  });

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
    if (heights && heights.length === allRows.length && chrome) {
      const split = splitContentIntoPages(allSections, heights, chrome);
      setPageContents(split);
      setAllHeightsReady(true);
    }
  }, [heights, chrome]);

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
      <ChromeRenderer />

      <div
        ref={ref}
        data-printable-root
        data-pagination-ready={allHeightsReady ? "true" : "false"}
        style={{ position: "relative" }}
      >
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