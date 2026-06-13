import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

/**
 * Helper to write a PDF document to a memory buffer
 */
const buildPDFBuffer = (setupDocFn) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', data => buffers.push(data));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));
      setupDocFn(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ─── AUDIT EXPORTS ────────────────────────────────────────────────────────────

export const exportAuditLogsToCSV = (logs) => {
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Reference', 'IP Address', 'Description'];
  const rows = logs.map(log => [
    log.createdAt ? new Date(log.createdAt).toISOString().replace('T', ' ').substring(0, 19) : '',
    log.user ? `${log.user.name} (${log.user.email})` : 'System',
    log.action,
    log.entityType,
    log.entityRef || '',
    log.ipAddress || '',
    log.description.replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val}"`).join(',')),
  ].join('\r\n');

  return Buffer.from(csvContent, 'utf-8');
};

export const exportAuditLogsToXLSX = (logs) => {
  const rows = logs.map(log => ({
    Timestamp: log.createdAt ? new Date(log.createdAt).toISOString().replace('T', ' ').substring(0, 19) : '',
    User: log.user ? log.user.name : 'System',
    Email: log.user ? log.user.email : '',
    Action: log.action,
    EntityType: log.entityType,
    EntityId: log.entityId,
    Reference: log.entityRef || '',
    IPAddress: log.ipAddress || '',
    UserAgent: log.userAgent || '',
    Description: log.description,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

export const exportAuditLogsToPDF = (logs) => {
  return buildPDFBuffer((doc) => {
    // Title
    doc.fontSize(18).text("Rapid ERP — Enterprise Audit Trail Report", { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text("Timestamp", 40, 120, { width: 110 });
    doc.text("User", 150, 120, { width: 90 });
    doc.text("Action", 240, 120, { width: 120 });
    doc.text("Ref", 360, 120, { width: 70 });
    doc.text("Description", 430, 120, { width: 130 });
    
    doc.moveTo(40, 135).lineTo(560, 135).stroke();
    doc.font('Helvetica');

    let y = 145;
    for (const log of logs) {
      if (y > 750) {
        doc.addPage();
        // Reprint header on new page
        doc.font('Helvetica-Bold');
        doc.text("Timestamp", 40, 40, { width: 110 });
        doc.text("User", 150, 40, { width: 90 });
        doc.text("Action", 240, 40, { width: 120 });
        doc.text("Ref", 360, 40, { width: 70 });
        doc.text("Description", 430, 40, { width: 130 });
        doc.moveTo(40, 55).lineTo(560, 55).stroke();
        doc.font('Helvetica');
        y = 65;
      }

      const timestamp = log.createdAt ? new Date(log.createdAt).toISOString().replace('T', ' ').substring(0, 19) : '';
      const userName = log.user ? log.user.name : 'System';
      const action = log.action;
      const ref = log.entityRef || '-';
      const desc = log.description;

      doc.fontSize(8);
      doc.text(timestamp, 40, y, { width: 110, lineBreak: false });
      doc.text(userName, 150, y, { width: 90, lineBreak: false });
      doc.text(action, 240, y, { width: 120, lineBreak: false });
      doc.text(ref, 360, y, { width: 70, lineBreak: false });
      doc.text(desc, 430, y, { width: 130 });

      y += Math.max(15, doc.heightOfString(desc, { width: 130 }) + 5);
    }
  });
};

// ─── INVENTORY LEDGER EXPORTS ──────────────────────────────────────────────────

export const exportInventoryLedgerToCSV = (product, warehouse, ledgerData) => {
  const title = `Inventory Ledger for ${product.name} (${product.sku}) in ${warehouse ? warehouse.name : 'All Warehouses'}`;
  const summary = `Opening Balance: ${ledgerData.openingStock}, Inward: ${ledgerData.purchases + ledgerData.manufacturingProduced + ledgerData.transfers}, Outward: ${ledgerData.sales + ledgerData.manufacturingConsumed}, Net Change: ${ledgerData.netChange}, Closing Balance: ${ledgerData.closingStock}`;

  const headers = ['Date', 'Reference', 'Movement Type', 'In Qty', 'Out Qty', 'Running Balance', 'Reason'];
  const rows = ledgerData.rows.map(row => [
    row.date ? new Date(row.date).toISOString().replace('T', ' ').substring(0, 19) : '',
    row.reference || '',
    row.movementType,
    row.inQty || 0,
    row.outQty || 0,
    row.runningBalance,
    (row.reason || '').replace(/"/g, '""'),
  ]);

  const csvContent = [
    `"${title}"`,
    `"${summary}"`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(val => `"${val}"`).join(',')),
  ].join('\r\n');

  return Buffer.from(csvContent, 'utf-8');
};

export const exportInventoryLedgerToXLSX = (product, warehouse, ledgerData) => {
  const summaryRows = [
    { Label: 'Product', Value: `${product.name} (${product.sku})` },
    { Label: 'Warehouse', Value: warehouse ? warehouse.name : 'All Warehouses' },
    { Label: 'Opening Balance', Value: ledgerData.openingStock },
    { Label: 'Total Inward', Value: ledgerData.purchases + ledgerData.manufacturingProduced + ledgerData.transfers },
    { Label: 'Total Outward', Value: ledgerData.sales + ledgerData.manufacturingConsumed },
    { Label: 'Net Change', Value: ledgerData.netChange },
    { Label: 'Closing Balance', Value: ledgerData.closingStock },
  ];

  const detailRows = ledgerData.rows.map(row => ({
    Date: row.date ? new Date(row.date).toISOString().replace('T', ' ').substring(0, 19) : '',
    Reference: row.reference || '',
    MovementType: row.movementType,
    InQty: Number(row.inQty) || 0,
    OutQty: Number(row.outQty) || 0,
    RunningBalance: Number(row.runningBalance),
    Reason: row.reason || '',
  }));

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  const wsDetails = XLSX.utils.json_to_sheet(detailRows);

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  XLSX.utils.book_append_sheet(wb, wsDetails, "Ledger Entries");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

export const exportInventoryLedgerToPDF = (product, warehouse, ledgerData) => {
  return buildPDFBuffer((doc) => {
    // Title
    doc.fontSize(16).text("Rapid ERP — Inventory Ledger Report", { align: 'center' });
    doc.moveDown(0.5);

    // Meta metadata block
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`Product: `, 40, 70, { continued: true }).font('Helvetica').text(`${product.name} (${product.sku})`);
    doc.font('Helvetica-Bold').text(`Warehouse: `, 40, 85, { continued: true }).font('Helvetica').text(warehouse ? warehouse.name : 'All Warehouses');
    doc.font('Helvetica-Bold').text(`Generated: `, 40, 100, { continued: true }).font('Helvetica').text(new Date().toLocaleString());

    // Summary Metric boxes
    doc.rect(40, 120, 520, 50).fillAndStroke("#f8f9fa", "#dee2e6");
    doc.fill("#212529");
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text("Opening Balance", 50, 130);
    doc.text("Total Inward", 150, 130);
    doc.text("Total Outward", 250, 130);
    doc.text("Net Change", 350, 130);
    doc.text("Closing Balance", 450, 130);

    doc.font('Helvetica').fontSize(10);
    doc.text(String(ledgerData.openingStock), 50, 145);
    doc.text(String(ledgerData.purchases + ledgerData.manufacturingProduced + ledgerData.transfers), 150, 145);
    doc.text(String(ledgerData.sales + ledgerData.manufacturingConsumed), 250, 145);
    doc.text(String(ledgerData.netChange), 350, 145);
    doc.text(String(ledgerData.closingStock), 450, 145);

    // Grid details
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text("Date", 40, 190, { width: 110 });
    doc.text("Reference", 150, 190, { width: 80 });
    doc.text("Movement Type", 230, 190, { width: 120 });
    doc.text("In", 350, 190, { width: 50, align: 'right' });
    doc.text("Out", 410, 190, { width: 50, align: 'right' });
    doc.text("Balance", 480, 190, { width: 80, align: 'right' });

    doc.moveTo(40, 205).lineTo(560, 205).stroke();
    doc.font('Helvetica');

    let y = 215;
    for (const row of ledgerData.rows) {
      if (y > 750) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text("Date", 40, 40, { width: 110 });
        doc.text("Reference", 150, 40, { width: 80 });
        doc.text("Movement Type", 230, 40, { width: 120 });
        doc.text("In", 350, 40, { width: 50, align: 'right' });
        doc.text("Out", 410, 40, { width: 50, align: 'right' });
        doc.text("Balance", 480, 40, { width: 80, align: 'right' });
        doc.moveTo(40, 55).lineTo(560, 55).stroke();
        doc.font('Helvetica');
        y = 65;
      }

      const dateStr = row.date ? new Date(row.date).toISOString().replace('T', ' ').substring(0, 19) : '';
      const ref = row.reference || '-';
      const type = row.movementType;
      const inVal = row.inQty ? String(row.inQty) : '-';
      const outVal = row.outQty ? String(row.outQty) : '-';
      const bal = String(row.runningBalance);

      doc.fontSize(8);
      doc.text(dateStr, 40, y, { width: 110 });
      doc.text(ref, 150, y, { width: 80 });
      doc.text(type, 230, y, { width: 120 });
      doc.text(inVal, 350, y, { width: 50, align: 'right' });
      doc.text(outVal, 410, y, { width: 50, align: 'right' });
      doc.text(bal, 480, y, { width: 80, align: 'right' });

      y += 18;
    }
  });
};
