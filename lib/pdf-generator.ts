import { jsPDF } from "jspdf";

/**
 * PDF Generator utility
 * Note: For complex charts, this is often best triggered from the frontend
 * using html2canvas. This backend utility handles text-heavy reports.
 */
export class PDFGenerator {
  /**
   * Generates a basic research report PDF
   */
  static async generateResearchReport(research: any): Promise<Uint8Array> {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.text(research.title, 20, yPos);
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`Scope: ${research.scope}`, 20, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 20;

    // Executive Summary
    doc.setFontSize(16);
    doc.text("Executive Summary", 20, yPos);
    yPos += 10;
    doc.setFontSize(11);

    const summaryLines = doc.splitTextToSize(
      research.insights?.[0]?.content || "No summary available.",
      170,
    );
    doc.text(summaryLines, 20, yPos);
    yPos += summaryLines.length * 7 + 10;

    // Insights
    doc.setFontSize(16);
    doc.text("Key Insights", 20, yPos);
    yPos += 10;

    research.insights?.forEach((insight: any, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text(`${index + 1}. ${insight.title}`, 20, yPos);
      yPos += 7;

      doc.setFontSize(10);
      const contentLines = doc.splitTextToSize(insight.content, 160);
      doc.text(contentLines, 25, yPos);
      yPos += contentLines.length * 5 + 10;
    });

    // Action Items
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text("Action Items", 20, yPos);
    yPos += 10;

    research.actionItems?.forEach((item: any, index: number) => {
      doc.setFontSize(10);
      doc.text(`[ ] ${item.description} (${item.priority})`, 25, yPos);
      yPos += 7;
    });

    return new Uint8Array(doc.output("arraybuffer"));
  }
}
