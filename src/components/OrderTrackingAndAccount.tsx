import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Mail, Search, UserCheck } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import type {
  BakeryOrder,
  LanguageCode,
  NotificationLog,
  OrderStatus,
  UserProfile,
} from '../types/bakery';

interface OrderTrackingAndAccountProps {
  mode: 'tracking' | 'account';
  language: LanguageCode;
  orders: BakeryOrder[];
  notifications: NotificationLog[];
  userProfile: UserProfile | null;
  isSignedIn: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSaveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onMarkNotificationRead: (notifId: string) => Promise<void>;
  onLanguageChange: (lang: LanguageCode) => void;
}

const PROGRESS_STEPS: OrderStatus[] = ['confirmed', 'baking', 'finishing', 'ready', 'completed'];

export const OrderTrackingAndAccount: React.FC<OrderTrackingAndAccountProps> = ({
  mode,
  language,
  orders,
  notifications,
  userProfile,
  isSignedIn,
  onSignIn,
  onSignOut,
  onSaveProfile,
  onCancelOrder,
  onMarkNotificationRead,
  onLanguageChange,
}) => {
  const t = TRANSLATIONS[language];
  const [lookup, setLookup] = useState('');
  const [pushState, setPushState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [emailNotifications, setEmailNotifications] = useState(
    userProfile?.emailNotifications ?? true
  );
  const [pushNotifications, setPushNotifications] = useState(
    userProfile?.pushNotifications ?? true
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setPhone(userProfile.phone);
      setAddress(userProfile.address);
      setEmailNotifications(userProfile.emailNotifications);
      setPushNotifications(userProfile.pushNotifications);
    }
  }, [userProfile]);

  const handleEnablePush = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setPushState(perm);
    if (perm === 'granted') {
      new Notification('Hearth & Crumb Alerts Active', {
        body: 'You will receive real-time push alerts when your loaves enter the oven and are ready.',
        icon: '/pwa-192x192.png',
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveProfile({
      displayName: displayName.trim() || userProfile?.displayName || 'Customer',
      phone: phone.trim(),
      address: address.trim(),
      language,
      emailNotifications,
      pushNotifications,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 1800);
  };

  const filteredOrders = orders.filter((o) => {
    const q = lookup.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
  });

  if (!isSignedIn) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-8 sm:p-10 text-center">
          <UserCheck className="w-10 h-10 text-[#14532D] mx-auto mb-4" />
          <h2 className="font-display text-2xl font-semibold text-[#18181B]">
            {mode === 'tracking' ? t.tracking.heading : t.account.heading}
          </h2>
          <p className="mt-2.5 text-sm text-[#52525B] max-w-md mx-auto leading-relaxed">
            {t.account.signInPrompt}
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 px-6 py-2.5 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors"
          >
            {t.account.signInGoogle}
          </button>
        </div>
      </section>
    );
  }

  if (mode === 'tracking') {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E7E2D8]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
              {t.tracking.heading}
            </h2>
            <p className="mt-1.5 text-sm text-[#52525B]">{t.tracking.subheading}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder={t.tracking.lookupPlaceholder}
                className="pl-9 pr-3 py-2 text-sm bg-white border border-[#E7E2D8] rounded-lg w-60"
              />
            </div>

            <button
              type="button"
              onClick={handleEnablePush}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                pushState === 'granted'
                  ? 'bg-[#14532D]/10 border-[#14532D]/30 text-[#14532D]'
                  : 'bg-white border-[#E7E2D8] text-[#18181B] hover:bg-[#F4F3EF]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              {pushState === 'granted' ? t.tracking.pushEnabled : t.tracking.enablePush}
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-10 text-center text-sm text-[#52525B]">
            {t.tracking.noOrders}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const currentIdx = PROGRESS_STEPS.indexOf(order.status);
              return (
                <div
                  key={order.id}
                  className="bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7E2D8] pb-4">
                    <div>
                      <div className="flex items-center gap-3 text-xs text-[#52525B]">
                        <span className="font-mono font-semibold text-[#18181B] text-sm">
                          {order.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{order.pickupSlot}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{order.fulfillmentType}</span>
                      </div>
                      <div className="mt-1.5 text-sm text-[#18181B]">
                        {[
                          ...order.items.map((i) => `${i.quantity}× ${i.name}`),
                          ...order.customCakes.map(
                            (c) => `${c.quantity}× Custom ${c.sizeLabel} (${c.sponge})`
                          ),
                        ].join(' · ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-semibold text-[#18181B] tabular-nums">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-[#14532D] font-medium mt-0.5">
                        {t.tracking.statuses[order.status]}
                      </div>
                    </div>
                  </div>

                  {order.status !== 'cancelled' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const reached = idx <= currentIdx;
                        return (
                          <div
                            key={step}
                            className={`p-3 rounded-lg border text-xs ${
                              reached
                                ? 'border-[#14532D] bg-[#14532D]/5 text-[#18181B] font-medium'
                                : 'border-[#E7E2D8] bg-[#FAF9F7] text-[#71717A]'
                            }`}
                          >
                            <div className="font-mono text-[11px] mb-1">0{idx + 1}</div>
                            <div>{t.tracking.statuses[step]}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-[#DC2626] font-medium">
                      This order has been cancelled.
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onCancelOrder(order.id)}
                        className="text-xs font-medium text-[#DC2626] hover:underline"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Automated Email & Push Dispatch Log */}
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-6">
          <h3 className="font-display text-lg font-semibold text-[#18181B] mb-4">
            {t.tracking.notificationsHeading}
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-[#52525B]">
              Order confirmations and baking status updates will appear here automatically.
            </p>
          ) : (
            <div className="divide-y divide-[#E7E2D8]">
              {notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#14532D] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-[#18181B]">{n.subject}</div>
                      <div className="text-xs text-[#52525B] mt-0.5">{n.body}</div>
                      <div className="text-[11px] text-[#71717A] mt-1 font-mono">
                        {n.channel.toUpperCase()} · {n.recipientEmail} · {n.deliveryStatus}
                      </div>
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => onMarkNotificationRead(n.id)}
                      className="text-xs font-medium text-[#14532D] hover:underline self-start sm:self-center whitespace-nowrap"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Account Mode
  const points = userProfile?.loyaltyPoints ?? 0;
  const nextTierThreshold = points < 500 ? 500 : points < 1500 ? 1500 : 1500;
  const progressPct = Math.min(100, Math.round((points / nextTierThreshold) * 100));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7E2D8]">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
            {t.account.heading}
          </h2>
          <p className="mt-1 text-sm text-[#52525B]">
            {userProfile?.email} · Loyalty Member
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="px-4 py-2 text-xs font-medium border border-[#E7E2D8] bg-white text-[#18181B] rounded-lg hover:bg-[#F4F3EF]"
        >
          {t.account.signOut}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Loyalty & Order History */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E7E2D8] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#52525B] font-medium">
                {t.account.loyaltyCard}
              </span>
              <span className="text-xs font-medium text-[#14532D] capitalize">
                {userProfile?.loyaltyTier || 'crumb'} Tier
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-[#18181B] tabular-nums">
                {points}
              </span>
              <span className="text-sm text-[#52525B]">{t.account.points}</span>
            </div>
            <div className="mt-4 w-full h-2 bg-[#F4F3EF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#14532D] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#52525B]">
              {points >= 1500
                ? 'Hearth Patron tier unlocked — enjoy $25 cake studio credits and tastings.'
                : `${nextTierThreshold - points} points until next tier milestone.`}
            </p>
          </div>

          <div className="bg-white border border-[#E7E2D8] rounded-xl p-6">
            <h3 className="font-display text-lg font-semibold text-[#18181B] mb-4">
              {t.account.orderHistory}
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-[#52525B]">No past orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#E7E2D8] text-xs text-[#52525B]">
                      <th className="py-2 pr-4 font-medium">Order</th>
                      <th className="py-2 pr-4 font-medium">Window</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E2D8]">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 pr-4 font-mono text-xs font-medium text-[#18181B]">
                          {o.orderNumber}
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#52525B]">{o.pickupSlot}</td>
                        <td className="py-3 pr-4 text-xs text-[#14532D] font-medium">
                          {t.tracking.statuses[o.status]}
                        </td>
                        <td className="py-3 text-right font-mono text-xs tabular-nums text-[#18181B]">
                          ${o.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Account Settings Form */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-5 bg-white border border-[#E7E2D8] rounded-xl p-6 space-y-4"
        >
          <h3 className="font-display text-lg font-semibold text-[#18181B]">
            {t.account.settingsHeading}
          </h3>

          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">
              Default Delivery Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#52525B] mb-1">
              {t.account.languagePref}
            </label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>

          <label className="flex items-center justify-between pt-2 text-sm text-[#18181B]">
            <span>{t.account.emailAlerts}</span>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-4 h-4 accent-[#14532D]"
            />
          </label>

          <label className="flex items-center justify-between text-sm text-[#18181B]">
            <span>{t.account.pushAlerts}</span>
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="w-4 h-4 accent-[#14532D]"
            />
          </label>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors inline-flex items-center justify-center gap-2"
          >
            {savedNotice ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t.account.saved}
              </>
            ) : (
              t.account.saveSettings
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
