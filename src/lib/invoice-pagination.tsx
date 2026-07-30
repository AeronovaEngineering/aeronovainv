import { useEffect, useRef, useState } from "react";
import type { Item } from "@/components/InvoiceTemplate";

/**
 * Hook that measures the rendered height of each item row in a hidden table.
 * Returns an array of pixel heights in the same order as `items`, or null
 * while measurements are pending.
 */
export function useRowHeights(items: Item[]) {
  const [heights, setHeights] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  useEffect(() => {
    // Reset measurements when items change
    setHeights(null);
    rowRefs.current = new Map();
    let cancelled = false;

    function measure() {
      if (cancelled || !containerRef.current) return;

      const measured: number[] = [];
      for (let i = 0; i < items.length; i++) {
        const row = rowRefs.current.get(i);
        if (!row) {
          // Rows not mounted yet: retry next frame instead of giving up silently.
          requestAnimationFrame(measure);
          return;
        }
        measured.push(row.getBoundingClientRect().height);
      }
      if (!cancelled) setHeights(measured);
    }

    // Wait for web fonts to actually be loaded before measuring — otherwise
    // row heights are measured against fallback fonts and the pagination
    // (and therefore the pages array PaginatedInvoiceTemplate's ref depends
    // on) can end up wrong or, in edge cases, never settle.
    if (items.length === 0) {
      setHeights([]);
    } else if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(measure));
    } else {
      requestAnimationFrame(measure);
    }

    return () => {
      cancelled = true;
    };
  }, [items]);

  // Hidden renderer that mirrors the table styles exactly
  const RowRenderer = () => (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: "210mm",
        padding: "12mm 14mm",
        boxSizing: "border-box",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "10.5pt",
        lineHeight: 1.35,
      }}
    >
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
            <tr
              key={i}
              ref={(el) => {
                if (el) rowRefs.current.set(i, el);
              }}
            >
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
              <td style={{ padding: "5px 4px", textAlign: "right", verticalAlign: "bottom" }}>
                {it.unit_price_ht.toFixed(3)}
              </td>
              <td style={{ padding: "5px 4px", textAlign: "right", verticalAlign: "bottom" }}>
                {it.total_ht.toFixed(3)}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#666" }}>Aucune ligne</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return { heights, RowRenderer };
}

/**
 * Splits items into pages based on measured row heights and page budgets.
 * 
 * @param items - The items to split
 * @param rowHeightsPx - Array of pixel heights per item (from useRowHeights)
 * @param budgetsPx - Page budgets in pixels: { first, middle, last }
 * @returns Array of item arrays, one per page
 */
export function splitItemsIntoPages(
  items: Item[],
  rowHeightsPx: number[],
  budgetsPx: { first: number; middle: number; last: number }
): Item[][] {
  if (items.length === 0) return [[]];
  if (rowHeightsPx.length !== items.length) {
    throw new Error("rowHeightsPx must have the same length as items");
  }

  const pages: Item[][] = [];
  let currentPage: Item[] = [];
  let currentHeight = 0;
  let isFirstPage = true;

  // First pass: fill pages using first/middle budgets
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowHeight = rowHeightsPx[i];
    const budget = isFirstPage ? budgetsPx.first : budgetsPx.middle;

    // If a single item is too tall for a page, split it
    if (rowHeight > budget) {
      // Split the item's description at newline boundaries
      const lines = item.description.split("\n").filter((l) => l.trim().length > 0);
      const avgHeightPerLine = rowHeight / (lines.length || 1);
      const maxLines = Math.floor(budget / avgHeightPerLine);

      if (maxLines > 0 && maxLines < lines.length) {
        // Create first chunk with remaining budget
        const firstChunkLines = lines.slice(0, maxLines);
        const remainingLines = lines.slice(maxLines);

        // First chunk: keep description, zero out numbers
        const firstChunk: Item = {
          ...item,
          description: firstChunkLines.join("\n"),
          unit: null,
          quantity: 0,
          unit_price_ht: 0,
          total_ht: 0,
        };

        // Remaining chunk: keep original numbers, rest of description
        const remainingChunk: Item = {
          ...item,
          description: remainingLines.join("\n"),
        };

        // Push current page if it has items and firstChunk fits
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }

        // Start a new page with firstChunk
        const firstPage = [firstChunk];
        pages.push(firstPage);

        // Now process the remaining chunk
        const remainderPages = splitItemsIntoPages(
          [remainingChunk],
          [remainingLines.length * avgHeightPerLine],
          { first: budgetsPx.first, middle: budgetsPx.middle, last: budgetsPx.last }
        );
        pages.push(...remainderPages);

        // Reset current page state for the rest of the loop
        currentPage = [];
        currentHeight = 0;
        isFirstPage = false;
        continue;
      }
    }

    // Normal case: item fits (or can't be split further)
    if (currentHeight + rowHeight <= budget) {
      currentPage.push(item);
      currentHeight += rowHeight;
    } else {
      // Start new page
      if (currentPage.length > 0) {
        pages.push(currentPage);
      }
      currentPage = [item];
      currentHeight = rowHeight;
      isFirstPage = false;
    }
  }

  // Push the last page
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Second pass: check if the last page fits in budgets.last
  if (pages.length > 0) {
    const lastPage = pages[pages.length - 1];
    const lastPageHeight = lastPage.reduce((sum, _, idx) => {
      const globalIdx = items.indexOf(lastPage[idx]);
      return sum + rowHeightsPx[globalIdx];
    }, 0);

    if (lastPageHeight > budgetsPx.last && pages.length > 1) {
      // Move items from last page to previous page if possible
      const prevPage = pages[pages.length - 2];
      const movedItems: Item[] = [];
      let movedHeight = 0;

      // Move items from the end of the last page backwards
      for (let i = lastPage.length - 1; i >= 0; i--) {
        const item = lastPage[i];
        const idx = items.indexOf(item);
        const h = rowHeightsPx[idx];
        if (movedHeight + h <= budgetsPx.last) {
          movedItems.unshift(item);
          movedHeight += h;
          lastPage.pop();
        } else {
          break;
        }
      }

      if (movedItems.length > 0) {
        prevPage.push(...movedItems);
        // Re-check last page height after moving
        const newLastPageHeight = lastPage.reduce((sum, _, idx) => {
          const globalIdx = items.indexOf(lastPage[idx]);
          return sum + rowHeightsPx[globalIdx];
        }, 0);
        if (newLastPageHeight > budgetsPx.last) {
          // If still too tall, the items are oversized - keep them on their own page
          pages.push(lastPage);
        }
      }
    }
  }

  return pages;
}