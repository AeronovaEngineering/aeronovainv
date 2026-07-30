/**
 * Exports a single element to PDF (used for reports)
 * This function ONLY runs in the browser.
 * Libraries are loaded dynamically to avoid server-side failures.
 */
export async function exportReportToPdf(
  element: HTMLElement,
  filename = "rapport.pdf"
) {
  // ✅ Load libraries ONLY when function is called (in browser)
  const html2canvas = (await import("html2canvas-pro")).default;
  const jsPDF = (await import("jspdf")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeightMm;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeightMm);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeightMm);
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
}

/**
 * Generates a PDF from a container with multiple child divs
 * This function ONLY runs in the browser.
 */
export async function generatePaginatedPdf(
  containerEl: HTMLDivElement,
  filename = "document.pdf"
) {
  // ✅ Load libraries ONLY when function is called (in browser)
  const html2canvas = (await import("html2canvas-pro")).default;
  const jsPDF = (await import("jspdf")).default;

  const pageDivs = Array.from(containerEl.children).filter(
    (child) => child.tagName === "DIV"
  ) as HTMLDivElement[];

 if (pageDivs.length === 0) {
    throw new Error(
      "Le document n'a pas encore fini de se préparer (aucune page trouvée). Réessayez dans un instant."
    );
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < pageDivs.length; i++) {
    const pageDiv = pageDivs[i];

    const canvas = await html2canvas(pageDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;

    if (i > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeightMm);
  }

  pdf.save(filename);
}