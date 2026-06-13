import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

/**
 * 1. CSV Generator
 */
export const generateCSV = (data, columns) => {
  const headers = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const rows = data.map(item => {
    return columns.map(col => {
      const val = typeof col.value === "function" ? col.value(item) : String(item[col.value] ?? "");
      return `"${val.replace(/"/g, '""')}"`;
    }).join(",");
  });
  return [headers, ...rows].join("\n");
};

/**
 * 2. Excel Generator (XLSX binary buffer via SheetJS)
 */
export const generateExcel = (data, sheetName, columns) => {
  const rows = data.map(item => {
    const row = {};
    columns.forEach(col => {
      row[col.header] = typeof col.value === "function" ? col.value(item) : item[col.value];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Report");

  // Write workbook into binary buffer representation
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
};

/**
 * 3. PDF Generator (Professional PDF document via PDFKit)
 */
export const generatePDF = (data, title, columns) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: "A4" });
    const buffers = [];

    doc.on("data", buffer => buffers.push(buffer));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", err => reject(err));

    // Document styling
    doc.fillColor("#111827");

    // Header Banners
    doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica").fillColor("#6B7280").text(`Generated on: ${new Date().toLocaleString()}`, { align: "right" });
    doc.moveDown(1.5);

    // Simple Table Grid
    let y = doc.y;
    const tableWidth = 530;
    const colWidth = tableWidth / columns.length;

    // Header Row Background Fill
    doc.rect(30, y - 5, tableWidth, 20).fill("#F3F4F6");
    doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9.5);

    columns.forEach((col, idx) => {
      doc.text(col.header, 35 + idx * colWidth, y, { width: colWidth - 10, align: "left" });
    });
    doc.moveDown(1.2);

    // Rows Grid
    doc.fillColor("#4B5563").font("Helvetica").fontSize(9);
    data.forEach((item, rowIndex) => {
      y = doc.y;

      // Add page breaks if drawing outside viewport
      if (y > 780) {
        doc.addPage();
        y = doc.y;

        // Redraw Header Row
        doc.rect(30, y - 5, tableWidth, 20).fill("#F3F4F6");
        doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9.5);
        columns.forEach((col, idx) => {
          doc.text(col.header, 35 + idx * colWidth, y, { width: colWidth - 10, align: "left" });
        });
        doc.moveDown(1.2);
        y = doc.y;
        doc.fillColor("#4B5563").font("Helvetica").fontSize(9);
      }

      // Draw horizontal line before row (alternating light fill backgrounds)
      if (rowIndex % 2 === 1) {
        doc.rect(30, y - 3, tableWidth, 16).fill("#F9FAFB");
        doc.fillColor("#4B5563");
      }

      columns.forEach((col, idx) => {
        const val = typeof col.value === "function" ? col.value(item) : String(item[col.value] ?? "");
        doc.text(val, 35 + idx * colWidth, y, { width: colWidth - 10, align: "left" });
      });

      doc.moveDown(1);
    });

    doc.end();
  });
};
