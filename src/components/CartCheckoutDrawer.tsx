import React, { useMemo, useState } from 'react';
import { CreditCard, Lock, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import type {
  CustomCakeSpec,
  LanguageCode,
  OrderItem,
  UserProfile,
} from '../types/bakery';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  items: OrderItem[];
  customCakes: CustomCakeSpec[];
  userProfile: UserProfile | null;
  isSignedIn: boolean;
  onSignIn: () => Promise<void>;
  onUpdateItemQty: (productId: string, delta: number) => void;
  onRemoveCake: (cakeId: string) => void;
  onSubmitOrder: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    fulfillmentType: 'pickup' | 'delivery';
    pickupSlot: string;
    deliveryAddress: string;
    kitchenNotes: string;
    paymentMethod: 'card' | 'apple_pay' | 'counter';
    paymentReference: string;
    paymentStatus: 'paid' | 'pending_counter';
    loyaltyPointsRedeemed: number;
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  }) => Promise<void>;
}

const LOYALTY_REWARDS = [
  { id: 'none', points: 0, discount: 0, label: 'No reward redeemed' },
  { id: 'crumb-5', points: 250, discount: 5, label: '250 pts — $5.00 Loaf Credit' },
  { id: 'artisan-12', points: 500, discount: 12, label: '500 pts — $12.00 Bakehouse Credit' },
  { id: 'patron-25', points: 1000, discount: 25, label: '1,000 pts — $25.00 Cake Studio Credit' },
];

const PICKUP_SLOTS = [
  'Today · 08:30 – 09:30',
  'Today · 11:30 – 12:30',
  'Today · 15:00 – 16:00',
  'Tomorrow · 07:30 – 08:30',
  'Tomorrow · 11:00 – 12:00',
];

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  language,
  items,
  customCakes,
  userProfile,
  isSignedIn,
  onSignIn,
  onUpdateItemQty,
  onRemoveCake,
  onSubmitOrder,
}) => {
  const t = TRANSLATIONS[language].cart;

  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [pickupSlot, setPickupSlot] = useState(PICKUP_SLOTS[0]);
  const [customerName, setCustomerName] = useState(userProfile?.displayName || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(userProfile?.address || '');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [rewardId, setRewardId] = useState('none');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'counter'>('card');

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveName = customerName || userProfile?.displayName || '';
  const effectiveEmail = customerEmail || userProfile?.email || '';
  const effectivePhone = customerPhone || userProfile?.phone || '';
  const effectiveAddress = deliveryAddress || userProfile?.address || '';

  const subtotal = useMemo(() => {
    const itemsSum = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const cakesSum = customCakes.reduce((sum, c) => sum + c.price * c.quantity, 0);
    return Number((itemsSum + cakesSum).toFixed(2));
  }, [items, customCakes]);

  const availablePoints = userProfile?.loyaltyPoints ?? 0;
  const chosenReward = LOYALTY_REWARDS.find((r) => r.id === rewardId) ?? LOYALTY_REWARDS[0];
  const validDiscount =
    availablePoints >= chosenReward.points ? Math.min(chosenReward.discount, subtotal) : 0;
  const taxable = Math.max(0, subtotal - validDiscount);
  const taxAmount = Number((taxable * 0.0825).toFixed(2));
  const deliveryFee = fulfillmentType === 'delivery' && subtotal > 0 ? 4.5 : 0;
  const totalAmount = Number((taxable + taxAmount + deliveryFee).toFixed(2));

  if (!isOpen) return null;

  const formatCardDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0 && customCakes.length === 0) return;
    if (!isSignedIn) {
      await onSignIn();
      return;
    }
    if (!effectiveName.trim() || !effectiveEmail.trim()) {
      setErrorMsg('Please enter your name and email address for your receipt.');
      return;
    }
    if (fulfillmentType === 'delivery' && !effectiveAddress.trim()) {
      setErrorMsg('Please enter a street address for local bakery delivery.');
      return;
    }

    setSubmitting(true);
    try {
      const tempOrderNumber = `HC-${Math.floor(1000 + Math.random() * 9000)}`;
      const payResp = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          method: paymentMethod,
          orderNumber: tempOrderNumber,
          cardholderName: cardholderName || effectiveName,
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expiry: cardExpiry,
          cvc: cardCvc,
        }),
      });

      const payData = (await payResp.json()) as {
        verified?: boolean;
        paymentReference?: string;
        paymentStatus?: 'paid' | 'pending_counter';
        error?: string;
      };

      if (!payResp.ok || !payData.verified || !payData.paymentReference) {
        setErrorMsg(payData.error || 'Payment authorization failed. Please check card details.');
        setSubmitting(false);
        return;
      }

      await onSubmitOrder({
        customerName: effectiveName.trim(),
        customerEmail: effectiveEmail.trim(),
        customerPhone: effectivePhone.trim(),
        fulfillmentType,
        pickupSlot,
        deliveryAddress: fulfillmentType === 'delivery' ? effectiveAddress.trim() : '',
        kitchenNotes: kitchenNotes.trim(),
        paymentMethod,
        paymentReference: payData.paymentReference,
        paymentStatus: payData.paymentStatus ?? 'paid',
        loyaltyPointsRedeemed: validDiscount > 0 ? chosenReward.points : 0,
        discountAmount: validDiscount,
        subtotal,
        taxAmount,
        totalAmount,
      });

      setCardNumber('');
      setCardCvc('');
      setCardExpiry('');
      setKitchenNotes('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-black/45">
      <div
        className="w-full max-w-xl bg-[#FAF9F7] h-full flex flex-col border-l border-[#E7E2D8] shadow-2xl"
        role="dialog"
        aria-label={t.title}
      >
        <div className="px-6 py-5 bg-white border-b border-[#E7E2D8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#14532D]" />
            <h2 className="font-display text-xl font-semibold text-[#18181B]">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#52525B] hover:text-[#18181B] rounded-lg"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {items.length === 0 && customCakes.length === 0 ? (
            <div className="py-16 text-center bg-white border border-[#E7E2D8] rounded-xl p-8">
              <p className="text-sm text-[#52525B]">{t.empty}</p>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
              {/* Cart Items */}
              <div className="bg-white border border-[#E7E2D8] rounded-xl divide-y divide-[#E7E2D8]">
                {items.map((item) => (
                  <div key={item.productId} className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#18181B] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#52525B] font-mono tabular-nums mt-0.5">
                        ${item.unitPrice.toFixed(2)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateItemQty(item.productId, -1)}
                        className="w-8 h-8 flex items-center justify-center border border-[#E7E2D8] rounded-md text-[#18181B] hover:bg-[#F4F3EF]"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateItemQty(item.productId, 1)}
                        className="w-8 h-8 flex items-center justify-center border border-[#E7E2D8] rounded-md text-[#18181B] hover:bg-[#F4F3EF]"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {customCakes.map((cake) => (
                  <div key={cake.id} className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[#18181B]">
                        Custom Cake · {cake.sizeLabel}
                      </div>
                      <div className="mt-1 text-xs text-[#52525B]">
                        {cake.sponge} · {cake.filling} · {cake.dietary}
                      </div>
                      {cake.inscription && (
                        <div className="mt-1 text-xs text-[#14532D]">
                          Inscription: “{cake.inscription}”
                        </div>
                      )}
                      <div className="mt-1 font-mono text-xs text-[#18181B] tabular-nums">
                        Pickup {cake.pickupDate} · ${cake.price.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCake(cake.id)}
                      className="p-1.5 text-[#71717A] hover:text-[#DC2626]"
                      aria-label="Remove custom cake"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Fulfillment & Slot */}
              <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-4">
                <div className="text-sm font-semibold text-[#18181B]">{t.fulfillment}</div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F3EF] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors ${
                      fulfillmentType === 'pickup'
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#52525B]'
                    }`}
                  >
                    {t.pickup} (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors ${
                      fulfillmentType === 'delivery'
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#52525B]'
                    }`}
                  >
                    {t.delivery} ($4.50)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1.5">
                    {t.pickupSlot}
                  </label>
                  <select
                    value={pickupSlot}
                    onChange={(e) => setPickupSlot(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                  >
                    {PICKUP_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#52525B] mb-1">
                      {t.customerName}
                    </label>
                    <input
                      type="text"
                      required
                      value={effectiveName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#52525B] mb-1">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      value={effectivePhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(555) 234-8910"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    required
                    value={effectiveEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                  />
                </div>

                {fulfillmentType === 'delivery' && (
                  <div>
                    <label className="block text-xs font-medium text-[#52525B] mb-1">
                      {t.address}
                    </label>
                    <input
                      type="text"
                      required
                      value={effectiveAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="412 Maple Avenue, Apt 3B"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#52525B] mb-1">
                    Kitchen Prep Note (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={250}
                    value={kitchenNotes}
                    onChange={(e) => setKitchenNotes(e.target.value)}
                    placeholder="Slice sourdough thick, extra napkins..."
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                  />
                </div>
              </div>

              {/* Loyalty Redemption */}
              {isSignedIn && (
                <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#18181B]">{t.loyaltyRedeem}</span>
                    <span className="font-mono text-xs text-[#14532D] tabular-nums">
                      Balance: {availablePoints} pts
                    </span>
                  </div>
                  <select
                    value={rewardId}
                    onChange={(e) => setRewardId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                  >
                    {LOYALTY_REWARDS.map((r) => (
                      <option key={r.id} value={r.id} disabled={availablePoints < r.points}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Gateway */}
              <div className="bg-white border border-[#E7E2D8] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#18181B] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#14532D]" />
                    {t.paymentMethod}
                  </span>
                  <span className="text-xs text-[#52525B] inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Encrypted Gateway
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'card', label: t.card },
                      { id: 'apple_pay', label: t.applePay },
                      { id: 'counter', label: t.counter },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${
                        paymentMethod === m.id
                          ? 'border-[#14532D] bg-[#14532D]/5 text-[#18181B]'
                          : 'border-[#E7E2D8] bg-[#FAF9F7] text-[#52525B]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs text-[#52525B] mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        value={cardholderName || effectiveName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#52525B] mb-1">
                        Card Number (Luhn Validated)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardDisplay(e.target.value))}
                        placeholder="4532 •••• •••• 4532"
                        className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#52525B] mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="08/28"
                          className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#52525B] mb-1">CVC</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3.5 text-xs text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                  {errorMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {(items.length > 0 || customCakes.length > 0) && (
          <div className="px-6 py-5 bg-white border-t border-[#E7E2D8] space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#52525B]">
                <span>{t.subtotal}</span>
                <span className="font-mono tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              {validDiscount > 0 && (
                <div className="flex justify-between text-[#14532D]">
                  <span>{t.discount}</span>
                  <span className="font-mono tabular-nums">-${validDiscount.toFixed(2)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-[#52525B]">
                  <span>Local Delivery</span>
                  <span className="font-mono tabular-nums">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#52525B]">
                <span>{t.tax}</span>
                <span className="font-mono tabular-nums">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-[#18181B] pt-2 border-t border-[#E7E2D8]">
                <span>{t.total}</span>
                <span className="font-mono text-base tabular-nums">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {isSignedIn ? (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full py-3 px-4 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] disabled:opacity-60 transition-colors"
              >
                {submitting ? t.processing : `${t.placeOrder} · $${totalAmount.toFixed(2)}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="w-full py-3 px-4 text-sm font-medium bg-[#18181B] text-white rounded-lg hover:bg-[#14532D] transition-colors"
              >
                {t.signInToOrder}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
