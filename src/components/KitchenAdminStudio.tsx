import React, { useMemo, useState } from 'react';
import {
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import type {
  BackupSnapshot,
  BakeryOrder,
  Ingredient,
  LanguageCode,
  OrderStatus,
  Product,
  PurchaseOrder,
} from '../types/bakery';
import {
  downloadJsonBackup,
  exportBakeryReportToPdf,
  exportOrdersAndInventoryToExcel,
} from '../utils/exports';

interface KitchenAdminStudioProps {
  language: LanguageCode;
  isAdmin: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  onSignIn: () => Promise<void>;
  products: Product[];
  ingredients: Ingredient[];
  orders: BakeryOrder[];
  purchaseOrders: PurchaseOrder[];
  backups: BackupSnapshot[];
  onAdvanceOrderStatus: (order: BakeryOrder, nextStatus: OrderStatus) => Promise<void>;
  onAdjustProductStock: (product: Product, delta: number) => Promise<void>;
  onAdjustIngredientStock: (ingredient: Ingredient, delta: number) => Promise<void>;
  onRunAutoReplenish: () => Promise<number>;
  onUpdatePoStatus: (po: PurchaseOrder, nextStatus: 'ordered' | 'received') => Promise<void>;
  onCreateBackup: (label: string) => Promise<void>;
  onRestoreBackup: (backup: BackupSnapshot) => Promise<void>;
  onSeedCatalog: () => Promise<void>;
}

type AdminTab = 'queue' | 'inventory' | 'analytics' | 'backups';

export const KitchenAdminStudio: React.FC<KitchenAdminStudioProps> = ({
  language,
  isAdmin,
  isSignedIn,
  userEmail,
  onSignIn,
  products,
  ingredients,
  orders,
  purchaseOrders,
  backups,
  onAdvanceOrderStatus,
  onAdjustProductStock,
  onAdjustIngredientStock,
  onRunAutoReplenish,
  onUpdatePoStatus,
  onCreateBackup,
  onRestoreBackup,
  onSeedCatalog,
}) => {
  const t = TRANSLATIONS[language].kitchen;
  const [tab, setTab] = useState<AdminTab>('queue');
  const [backupLabel, setBackupLabel] = useState('End-of-Day Bakehouse Snapshot');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'),
    [orders]
  );

  // Aggregate daily kitchen bake totals for printable summary
  const kitchenBatchTotals = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        const curr = map.get(item.productId) ?? { name: item.name, qty: 0 };
        curr.qty += item.quantity;
        map.set(item.productId, curr);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [orders]);

  const customCakeSchedule = useMemo(() => {
    const list: Array<{
      orderNumber: string;
      customerName: string;
      pickupSlot: string;
      spec: BakeryOrder['customCakes'][number];
    }> = [];
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      for (const spec of order.customCakes) {
        list.push({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          pickupSlot: order.pickupSlot,
          spec,
        });
      }
    }
    return list;
  }, [orders]);

  const analytics = useMemo(() => {
    const valid = orders.filter((o) => o.status !== 'cancelled');
    const grossRevenue = valid.reduce((sum, o) => sum + o.totalAmount, 0);
    const aov = valid.length > 0 ? grossRevenue / valid.length : 0;
    const categoryTotals = { bread: 0, pastry: 0, cake: 0 };
    for (const o of valid) {
      for (const i of o.items) {
        categoryTotals[i.category] += i.unitPrice * i.quantity;
      }
      for (const c of o.customCakes) {
        categoryTotals.cake += c.price * c.quantity;
      }
    }
    const cakeShare =
      grossRevenue > 0 ? Math.round((categoryTotals.cake / grossRevenue) * 100) : 0;

    // Build 7-day trend from orders or baseline
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const series = days.map((day, idx) => {
      const bucketOrders = valid.filter((_, i) => i % 7 === idx);
      const val = bucketOrders.reduce((s, o) => s + o.totalAmount, 0);
      return { day, revenue: val };
    });

    return { grossRevenue, orderCount: valid.length, aov, cakeShare, categoryTotals, series };
  }, [orders]);

  const nextActionForStatus = (status: OrderStatus): { label: string; next: OrderStatus } | null => {
    switch (status) {
      case 'confirmed':
        return { label: 'Start Baking', next: 'baking' };
      case 'baking':
        return { label: 'Decorate & Pack', next: 'finishing' };
      case 'finishing':
        return { label: 'Mark Ready', next: 'ready' };
      case 'ready':
        return { label: 'Complete Order', next: 'completed' };
      default:
        return null;
    }
  };

  if (!isSignedIn || !isAdmin) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-8 sm:p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-[#14532D] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-semibold text-[#18181B]">
            {t.heading}
          </h2>
          <p className="mt-2.5 text-sm text-[#52525B] max-w-md mx-auto leading-relaxed">
            {isSignedIn
              ? `Signed in as ${userEmail}. Kitchen staff & inventory controls are restricted to authorized bakery administrator accounts.`
              : 'Sign in with your authorized bakery administrator Google account to manage live oven queues, inventory replenishment, reports, and cloud backups.'}
          </p>
          {!isSignedIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 px-6 py-2.5 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </section>
    );
  }

  const maxChartRev = Math.max(100, ...analytics.series.map((s) => s.revenue));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Print / Export Controls */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E7E2D8]">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
            {t.heading}
          </h2>
          <p className="mt-1 text-xs text-[#52525B] font-mono">
            Authenticated Staff: {userEmail} · Real-Time Cloud Sync Active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-[#E7E2D8] text-[#18181B] rounded-lg hover:bg-[#F4F3EF]"
          >
            <Printer className="w-3.5 h-3.5" />
            {t.printSummary}
          </button>
          <button
            type="button"
            onClick={() => exportBakeryReportToPdf(orders, products, ingredients)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-[#E7E2D8] text-[#18181B] rounded-lg hover:bg-[#F4F3EF]"
          >
            <FileText className="w-3.5 h-3.5" />
            {t.exportPdf}
          </button>
          <button
            type="button"
            onClick={() =>
              exportOrdersAndInventoryToExcel(orders, products, ingredients, purchaseOrders)
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {t.exportExcel}
          </button>
        </div>
      </div>

      {/* Workspace Tab Bar */}
      <div className="no-print flex items-center gap-1 p-1 bg-[#F4F3EF] border border-[#E7E2D8] rounded-lg overflow-x-auto">
        {(
          [
            { id: 'queue', label: t.tabQueue },
            { id: 'inventory', label: t.tabInventory },
            { id: 'analytics', label: t.tabAnalytics },
            { id: 'backups', label: t.tabBackups },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === item.id
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {statusBanner && (
        <div className="no-print p-3.5 text-xs font-medium text-[#14532D] bg-[#14532D]/10 border border-[#14532D]/20 rounded-lg flex items-center justify-between">
          <span>{statusBanner}</span>
          <button type="button" onClick={() => setStatusBanner(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: KITCHEN QUEUE */}
      {tab === 'queue' && (
        <div className="no-print space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-[#18181B]">
                  Active Production Queue ({activeOrders.length})
                </h3>
                <button
                  type="button"
                  onClick={onSeedCatalog}
                  className="text-xs font-medium text-[#14532D] hover:underline"
                >
                  Sync Default Catalog to Cloud
                </button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="bg-white border border-[#E7E2D8] rounded-xl p-8 text-sm text-[#52525B]">
                  All current orders are completed. New customer orders appear here in real time.
                </div>
              ) : (
                activeOrders.map((order) => {
                  const action = nextActionForStatus(order.status);
                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-semibold text-[#18181B]">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-[#52525B]">
                            {order.customerName} · {order.pickupSlot}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[#14532D] uppercase">
                          {order.status}
                        </span>
                      </div>

                      <div className="text-sm text-[#18181B] space-y-1">
                        {order.items.map((i) => (
                          <div key={i.productId} className="font-mono text-xs">
                            {i.quantity}× {i.name}
                          </div>
                        ))}
                        {order.customCakes.map((c) => (
                          <div key={c.id} className="text-xs text-[#14532D]">
                            {c.quantity}× Custom Cake: {c.sizeLabel} · {c.sponge} · {c.filling}
                            {c.inscription ? ` · "${c.inscription}"` : ''}
                          </div>
                        ))}
                      </div>

                      {order.kitchenNotes && (
                        <p className="text-xs text-[#52525B] bg-[#FAF9F7] px-3 py-2 rounded border border-[#E7E2D8]">
                          Note: {order.kitchenNotes}
                        </p>
                      )}

                      {action && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onAdvanceOrderStatus(order, action.next)}
                            className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
                          >
                            {action.label} (Send Customer Alert)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-4 bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#18181B]">
                  Batch Bake Totals
                </h3>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs font-medium text-[#14532D] hover:underline"
                >
                  Print Sheet
                </button>
              </div>
              {kitchenBatchTotals.length === 0 ? (
                <p className="text-xs text-[#52525B]">No items queued today yet.</p>
              ) : (
                <ul className="divide-y divide-[#E7E2D8] text-sm">
                  {kitchenBatchTotals.map((row) => (
                    <li key={row.name} className="py-2 flex justify-between">
                      <span className="text-[#18181B]">{row.name}</span>
                      <span className="font-mono font-semibold tabular-nums">{row.qty}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & AUTOMATED REPLENISHMENT */}
      {tab === 'inventory' && (
        <div className="no-print space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-display text-lg font-semibold text-[#18181B]">
              Finished Goods &amp; Raw Ingredient Stock
            </h3>
            <button
              type="button"
              onClick={async () => {
                const count = await onRunAutoReplenish();
                setStatusBanner(
                  count > 0
                    ? `Generated ${count} automated supplier purchase order(s) for low-stock items.`
                    : 'All tracked inventory items are above reorder thresholds.'
                );
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t.autoReplenish}
            </button>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#E7E2D8] text-xs text-[#52525B] bg-[#FAF9F7]">
                  <th className="py-3 px-4 font-medium">Product</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium text-right">Stock</th>
                  <th className="py-3 px-4 font-medium text-right">Reorder At</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {products.map((p) => {
                  const low = p.stockCount <= p.reorderThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF9F7]">
                      <td className="py-3 px-4 font-medium text-[#18181B]">{p.name}</td>
                      <td className="py-3 px-4 text-xs text-[#52525B] uppercase">{p.category}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {p.stockCount} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#52525B]">
                        {p.reorderThreshold}
                      </td>
                      <td
                        className={`py-3 px-4 text-xs font-medium ${
                          low ? 'text-[#B45309]' : 'text-[#14532D]'
                        }`}
                      >
                        {low ? 'Reorder Triggered' : 'Optimal'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => onAdjustProductStock(p, -1)}
                          className="px-2 py-1 text-xs border border-[#E7E2D8] rounded hover:bg-[#F4F3EF]"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdjustProductStock(p, 5)}
                          className="px-2 py-1 text-xs border border-[#E7E2D8] rounded hover:bg-[#F4F3EF]"
                        >
                          +5
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#E7E2D8] text-xs text-[#52525B] bg-[#FAF9F7]">
                  <th className="py-3 px-4 font-medium">Raw Ingredient</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium text-right">On Hand</th>
                  <th className="py-3 px-4 font-medium text-right">Reorder Point</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {ingredients.map((ing) => {
                  const low = ing.currentStock <= ing.reorderPoint;
                  return (
                    <tr key={ing.id} className="hover:bg-[#FAF9F7]">
                      <td className="py-3 px-4 font-medium text-[#18181B]">{ing.name}</td>
                      <td className="py-3 px-4 text-xs text-[#52525B]">{ing.supplier}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {ing.currentStock} {ing.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#52525B]">
                        {ing.reorderPoint} {ing.unit}
                      </td>
                      <td
                        className={`py-3 px-4 text-xs font-medium ${
                          low ? 'text-[#B45309]' : 'text-[#14532D]'
                        }`}
                      >
                        {low ? 'Low Stock' : 'Healthy'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => onAdjustIngredientStock(ing, -5)}
                          className="px-2 py-1 text-xs border border-[#E7E2D8] rounded hover:bg-[#F4F3EF]"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => onAdjustIngredientStock(ing, 10)}
                          className="px-2 py-1 text-xs border border-[#E7E2D8] rounded hover:bg-[#F4F3EF]"
                        >
                          +10
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl p-6">
            <h4 className="font-display text-base font-semibold text-[#18181B] mb-4">
              Automated Replenishment Purchase Orders ({purchaseOrders.length})
            </h4>
            {purchaseOrders.length === 0 ? (
              <p className="text-sm text-[#52525B]">
                No pending purchase orders. Click “Run Auto-Replenish Check” to scan thresholds.
              </p>
            ) : (
              <div className="divide-y divide-[#E7E2D8]">
                {purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm"
                  >
                    <div>
                      <div className="font-medium text-[#18181B]">
                        {po.itemName} · {po.quantity} {po.unit}
                      </div>
                      <div className="text-xs text-[#52525B]">
                        {po.supplier} · Triggered: {po.triggeredBy} · Status: {po.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {po.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdatePoStatus(po, 'ordered')}
                          className="px-3 py-1.5 text-xs font-medium border border-[#E7E2D8] rounded-lg hover:bg-[#F4F3EF]"
                        >
                          Dispatch PO
                        </button>
                      )}
                      {po.status !== 'received' && (
                        <button
                          type="button"
                          onClick={() => onUpdatePoStatus(po, 'received')}
                          className="px-3 py-1.5 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534]"
                        >
                          Receive Shipment &amp; Restock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS & EXPORTS */}
      {tab === 'analytics' && (
        <div className="no-print space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
              <div className="text-xs text-[#52525B]">Gross Revenue</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                ${analytics.grossRevenue.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
              <div className="text-xs text-[#52525B]">Completed &amp; Active Orders</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                {analytics.orderCount}
              </div>
            </div>
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
              <div className="text-xs text-[#52525B]">Average Order Value</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#14532D] tabular-nums">
                ${analytics.aov.toFixed(2)}
              </div>
            </div>
            <div className="bg-white border border-[#E7E2D8] rounded-xl p-5">
              <div className="text-xs text-[#52525B]">Custom &amp; Cake Revenue Share</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                {analytics.cakeShare}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E7E2D8] rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#18181B] mb-4">
                Daily Revenue Distribution ($)
              </h3>
              <svg viewBox="0 0 560 220" className="w-full h-56 overflow-visible">
                <line x1="36" y1="180" x2="540" y2="180" stroke="#E7E2D8" strokeWidth="1" />
                {analytics.series.map((pt, i) => {
                  const barW = 44;
                  const x = 56 + i * 70;
                  const barH = Math.max(4, (pt.revenue / maxChartRev) * 140);
                  const y = 180 - barH;
                  return (
                    <g key={pt.day}>
                      <rect x={x} y={y} width={barW} height={barH} rx="4" fill="#14532D" />
                      <text
                        x={x + barW / 2}
                        y="198"
                        textAnchor="middle"
                        className="fill-[#52525B] text-[11px] font-mono"
                      >
                        {pt.day}
                      </text>
                      <text
                        x={x + barW / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-[#18181B] text-[10px] font-mono"
                      >
                        ${pt.revenue.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-[#18181B]">
                Category Mix
              </h3>
              {(['bread', 'pastry', 'cake'] as const).map((cat) => {
                const amt = analytics.categoryTotals[cat];
                const pct =
                  analytics.grossRevenue > 0
                    ? Math.round((amt / analytics.grossRevenue) * 100)
                    : 0;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-medium text-[#18181B]">{cat}</span>
                      <span className="font-mono tabular-nums text-[#52525B]">
                        ${amt.toFixed(2)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F4F3EF] rounded-full overflow-hidden">
                      <div className="h-full bg-[#14532D]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLOUD DATA BACKUPS */}
      {tab === 'backups' && (
        <div className="no-print space-y-6">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                Cloud Snapshot Label
              </label>
              <input
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                await onCreateBackup(backupLabel.trim() || 'Bakery Snapshot');
                setStatusBanner('Encrypted cloud backup snapshot saved to Firestore.');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] whitespace-nowrap"
            >
              <CloudUpload className="w-4 h-4" />
              {t.createBackup}
            </button>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl divide-y divide-[#E7E2D8]">
            {backups.length === 0 ? (
              <div className="p-8 text-sm text-[#52525B]">
                No cloud snapshots created yet. Create a backup to archive catalog, orders, and ingredient ledgers.
              </div>
            ) : (
              backups.map((b) => (
                <div
                  key={b.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#18181B]">{b.label}</div>
                    <div className="text-xs text-[#52525B] font-mono mt-1">
                      Checksum: {b.checksum} · {b.productCount} products · {b.orderCount} orders ·{' '}
                      {b.ingredientCount} ingredients
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        downloadJsonBackup(`hearth-crumb-backup-${b.checksum}.json`, JSON.parse(b.payload))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E7E2D8] rounded-lg hover:bg-[#F4F3EF]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onRestoreBackup(b);
                        setStatusBanner(`Restored catalog and ingredient state from ${b.checksum}.`);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-lg hover:bg-[#14532D]"
                    >
                      Restore Catalog
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PRINTABLE DAILY KITCHEN SUMMARY REPORT (Visible in @media print) */}
      <div className="hidden print-only p-6 space-y-6">
        <div className="border-b border-black pb-4">
          <h1 className="text-2xl font-bold">
            Hearth &amp; Crumb — Daily Kitchen Production Summary
          </h1>
          <p className="text-xs mt-1">
            Printed: {new Date().toLocaleString()} · Active &amp; Scheduled Orders: {orders.length}
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">1. Batch Production Quantities</h2>
          <table className="w-full text-sm border-collapse border border-black">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Total Qty</th>
              </tr>
            </thead>
            <tbody>
              {kitchenBatchTotals.map((row) => (
                <tr key={row.name} className="border-b border-gray-300">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-right font-mono">{row.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">2. Custom Cake Finishing Schedule</h2>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left">Order #</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Specifications</th>
                <th className="p-2 text-left">Inscription</th>
                <th className="p-2 text-left">Pickup</th>
              </tr>
            </thead>
            <tbody>
              {customCakeSchedule.map((c, idx) => (
                <tr key={`${c.orderNumber}-${idx}`} className="border-b border-gray-300">
                  <td className="p-2 font-mono">{c.orderNumber}</td>
                  <td className="p-2">{c.customerName}</td>
                  <td className="p-2">
                    {c.spec.sizeLabel} · {c.spec.sponge} · {c.spec.filling} ({c.spec.dietary})
                  </td>
                  <td className="p-2">{c.spec.inscription || '—'}</td>
                  <td className="p-2">{c.spec.pickupDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">3. Order Ticket Checklist</h2>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="border-b border-black">
                <th className="p-2 text-left">Order #</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-left">Slot</th>
                <th className="p-2 text-left">Items &amp; Notes</th>
                <th className="p-2 text-left">Stage</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-300">
                  <td className="p-2 font-mono">{o.orderNumber}</td>
                  <td className="p-2">{o.customerName}</td>
                  <td className="p-2">{o.pickupSlot}</td>
                  <td className="p-2">
                    {[
                      ...o.items.map((i) => `${i.quantity}x ${i.name}`),
                      ...o.customCakes.map((c) => `${c.quantity}x Custom ${c.sizeLabel}`),
                    ].join(', ')}
                    {o.kitchenNotes ? ` [Note: ${o.kitchenNotes}]` : ''}
                  </td>
                  <td className="p-2 uppercase">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
