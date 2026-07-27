import { jsPDF } from "jspdf";
// html2canvas-pro is a drop-in fork of html2canvas that additionally understands
// modern CSS color functions (oklch/color-mix/lab) which Tailwind v4 emits.
// Plain html2canvas throws on those and silently breaks the render, so this
// fork is required here rather than the base package.
import html2canvas from "html2canvas-pro";

/**
 * Renders a DOM node (expected to be a fixed 210mm x 297mm A4 page, like
 * InvoiceTemplate's root) to a high-resolution canvas and saves it as a
 * single-page A4 PDF. Because the PDF is literally a snapshot of the same
 * DOM the user is previewing on screen, the output is guaranteed to match
 * the preview exactly — unlike window.print(), whose layout can shift
 * depending on the browser/OS print engine.
 */
export async function generatePdfFromNode(node: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(node, {
    scale: 3, // high-res render so the logo and text stay crisp
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // The node is authored as an exact 210mm x 297mm A4 page, so the captured
  // image is dropped in to fill the page 1:1 — no scaling surprises.
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  pdf.save(filename);
}