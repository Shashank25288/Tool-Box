import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { BakeryOrder, Ingredient, Product, PurchaseOrder } from '../types/bakery';

export function exportOrdersAndInventoryToExcel(
  orders: BakeryOrder[],
  products: Product[],
  ingredients: Ingredient[],
  purchaseOrders: PurchaseOrder[]
) {
  const wb = XLSX.utils.book_new();

  const orderRows = orders.map((o) => ({
    'Order Number': o.orderNumber,
    Customer: o.customerName,
    Email: o.customerEmail,
    Fulfillment: o.fulfillmentType,
    Slot: o.pickupSlot,
    Status: o.status,
    Payment: `${o.paymentMethod} (${o.paymentStatus})`,
    'Items Summary': [
      ...o.items.map((i) => `${i.quantity}x ${i.name}`),
      ...o.customCakes.map((c) => `${c.quantity}x Custom ${c.sizeLabel} (${c.sponge})`),
    ].join('; '),
    Subtotal: Number(o.subtotal.toFixed(2)),
    Discount: Number(o.discountAmount.toFixed(2)),
    Tax: Number(o.taxAmount.toFixed(2)),
    Total: Number(o.totalAmount.toFixed(2)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), 'Orders');

  const productRows = products.map((p) => ({
    ID: p.id,
    Product: p.name,
    Category: p.category,
    Price: p.price,
    'Current Stock': p.stockCount,
    'Reorder Threshold': p.reorderThreshold,
    'Par Level': p.parLevel,
    'Auto Reorder': p.autoReorder ? 'Enabled' : 'Manual',
    Supplier: p.supplier,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), 'Product Inventory');

  const ingredientRows = ingredients.map((i) => ({
    ID: i.id,
    Ingredient: i.name,
    'Current Stock': i.currentStock,
    Unit: i.unit,
    'Reorder Point': i.reorderPoint,
    'Par Level': i.parLevel,
    'Unit Cost': i.unitCost,
    Supplier: i.supplier,
    'Auto Reorder': i.autoReorder ? 'Enabled' : 'Manual',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ingredientRows), 'Raw Ingredients');

  const poRows = purchaseOrders.map((po) => ({
    'PO ID': po.id,
    Item: po.itemName,
    Type: po.itemType,
    Quantity: `${po.quantity} ${po.unit}`,
    Supplier: po.supplier,
    Status: po.status,
    Triggered: po.triggeredBy,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poRows), 'Replenishment POs');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `hearth-crumb-bakery-report-${stamp}.xlsx`);
}

export function exportBakeryReportToPdf(
  orders: BakeryOrder[],
  products: Product[],
  ingredients: Ingredient[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const stamp = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.text('Hearth & Crumb Bakery — Daily Operations & Analytics Report', 40, 48);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Generated: ${stamp}  |  Total Orders: ${orders.length}  |  Active SKUs: ${products.length}`, 40, 66);

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Gross Revenue: $${totalRevenue.toFixed(2)}`, 40, 88);

  autoTable(doc, {
    startY: 104,
    head: [['Order #', 'Customer', 'Fulfillment', 'Status', 'Items', 'Total']],
    body: orders.slice(0, 30).map((o) => [
      o.orderNumber,
      o.customerName,
      `${o.fulfillmentType} (${o.pickupSlot})`,
      o.status.toUpperCase(),
      [
        ...o.items.map((i) => `${i.quantity}x ${i.name}`),
        ...o.customCakes.map((c) => `${c.quantity}x Custom ${c.sizeLabel}`),
      ].join(', '),
      `$${o.totalAmount.toFixed(2)}`,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 83, 45] },
  });

  const afterOrdersY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 300;
  doc.setFontSize(12);
  doc.text('Inventory & Low-Stock Replenishment Snapshot', 40, afterOrdersY + 26);

  autoTable(doc, {
    startY: afterOrdersY + 36,
    head: [['Item', 'Type', 'On Hand', 'Reorder At', 'Status', 'Supplier']],
    body: [
      ...products.map((p) => [
        p.name,
        p.category,
        `${p.stockCount} ${p.unit}`,
        `${p.reorderThreshold}`,
        p.stockCount <= p.reorderThreshold ? 'REORDER' : 'OK',
        p.supplier,
      ]),
      ...ingredients.map((i) => [
        i.name,
        'ingredient',
        `${i.currentStock} ${i.unit}`,
        `${i.reorderPoint}`,
        i.currentStock <= i.reorderPoint ? 'REORDER' : 'OK',
        i.supplier,
      ]),
    ],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [24, 24, 27] },
  });

  doc.save(`hearth-crumb-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function computeChecksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `HC-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function downloadJsonBackup(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
