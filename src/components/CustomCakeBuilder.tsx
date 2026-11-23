import React, { useMemo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { CUSTOM_CAKE_IMAGE } from '../data/seedCatalog';
import { TRANSLATIONS } from '../i18n/translations';
import type { CustomCakeSpec, LanguageCode } from '../types/bakery';

interface CustomCakeBuilderProps {
  language: LanguageCode;
  onAddCustomCake: (cake: CustomCakeSpec) => void;
}

const SIZE_OPTIONS = [
  { id: '6-single', label: '6" Single Tier (Serves 8–10)', tiers: 1, price: 62 },
  { id: '8-celebration', label: '8" Celebration (Serves 14–18)', tiers: 1, price: 84 },
  { id: '2-tier', label: 'Two-Tier Event (6" + 8", Serves 28)', tiers: 2, price: 148 },
  { id: '3-tier', label: 'Three-Tier Wedding (Serves 55+)', tiers: 3, price: 245 },
];

const SPONGE_OPTIONS = [
  'Madagascar Vanilla Bean',
  'Valrhona 70% Dark Chocolate',
  'Amalfi Lemon & Olive Oil',
  'Roasted Sicilian Pistachio',
];

const FILLING_OPTIONS = [
  'Fresh Raspberry Compote & Mascarpone',
  'Salted Caramel & Espresso Meringue',
  'Meyer Lemon Curd & Elderflower',
  'Dark Chocolate Ganache & Hazelnut',
];

const DIETARY_OPTIONS = [
  { id: 'Standard Artisanal', surcharge: 0 },
  { id: 'Gluten-Friendly Almond Flour', surcharge: 12 },
  { id: 'Plant-Based Vegan', surcharge: 14 },
  { id: 'Nut-Free Dedicated Prep', surcharge: 8 },
];

export const CustomCakeBuilder: React.FC<CustomCakeBuilderProps> = ({
  language,
  onAddCustomCake,
}) => {
  const t = TRANSLATIONS[language].customCake;

  const defaultPickup = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const [sizeId, setSizeId] = useState(SIZE_OPTIONS[1].id);
  const [sponge, setSponge] = useState(SPONGE_OPTIONS[0]);
  const [filling, setFilling] = useState(FILLING_OPTIONS[0]);
  const [dietary, setDietary] = useState(DIETARY_OPTIONS[0].id);
  const [inscription, setInscription] = useState('');
  const [pickupDate, setPickupDate] = useState(defaultPickup);
  const [notes, setNotes] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const selectedSize = SIZE_OPTIONS.find((s) => s.id === sizeId) ?? SIZE_OPTIONS[1];
  const selectedDietary = DIETARY_OPTIONS.find((d) => d.id === dietary) ?? DIETARY_OPTIONS[0];
  const totalPrice = selectedSize.price + selectedDietary.surcharge;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const spec: CustomCakeSpec = {
      id: `cake-${Date.now()}`,
      sizeLabel: selectedSize.label,
      tiers: selectedSize.tiers,
      sponge,
      filling,
      dietary,
      inscription: inscription.trim(),
      pickupDate,
      notes: notes.trim(),
      price: totalPrice,
      quantity: 1,
    };
    onAddCustomCake(spec);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1400);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="pb-6 border-b border-[#E7E2D8]">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
          {t.heading}
        </h2>
        <p className="mt-1.5 text-sm text-[#52525B]">{t.subheading}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sticky Left Preview Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#E7E2D8] rounded-xl overflow-hidden">
          <div className="aspect-[4/3] bg-[#F4F3EF] border-b border-[#E7E2D8]">
            <img
              src={CUSTOM_CAKE_IMAGE}
              alt="Custom tiered celebration cake garnished with fresh figs and chamomile blossoms"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-baseline justify-between border-b border-[#E7E2D8] pb-4">
              <span className="text-sm font-medium text-[#52525B]">{t.estimatedTotal}</span>
              <span className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#52525B]">{t.sizeLabel}</dt>
                <dd className="font-medium text-[#18181B] text-right">{selectedSize.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#52525B]">{t.spongeLabel}</dt>
                <dd className="font-medium text-[#18181B] text-right">{sponge}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#52525B]">{t.fillingLabel}</dt>
                <dd className="font-medium text-[#18181B] text-right">{filling}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#52525B]">{t.dietaryLabel}</dt>
                <dd className="font-medium text-[#18181B] text-right">{dietary}</dd>
              </div>
              {inscription && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#52525B]">{t.inscriptionLabel}</dt>
                  <dd className="font-medium text-[#14532D] text-right">“{inscription}”</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right Configuration Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#E7E2D8] rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-[#18181B] mb-2.5">
              {t.sizeLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSizeId(opt.id)}
                  className={`p-3.5 text-left rounded-lg border transition-colors ${
                    sizeId === opt.id
                      ? 'border-[#14532D] bg-[#14532D]/5 text-[#18181B]'
                      : 'border-[#E7E2D8] bg-[#FAF9F7] text-[#52525B] hover:border-[#A1A1AA]'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#18181B]">{opt.label}</div>
                  <div className="mt-1 font-mono text-xs text-[#14532D] tabular-nums">
                    ${opt.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="cake-sponge" className="block text-sm font-medium text-[#18181B] mb-2">
                {t.spongeLabel}
              </label>
              <select
                id="cake-sponge"
                value={sponge}
                onChange={(e) => setSponge(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg focus:outline-none focus:border-[#14532D]"
              >
                {SPONGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cake-filling" className="block text-sm font-medium text-[#18181B] mb-2">
                {t.fillingLabel}
              </label>
              <select
                id="cake-filling"
                value={filling}
                onChange={(e) => setFilling(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg focus:outline-none focus:border-[#14532D]"
              >
                {FILLING_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#18181B] mb-2.5">
              {t.dietaryLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DIETARY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDietary(opt.id)}
                  className={`px-3.5 py-2.5 text-sm text-left rounded-lg border flex items-center justify-between transition-colors ${
                    dietary === opt.id
                      ? 'border-[#14532D] bg-[#14532D]/5 text-[#18181B] font-medium'
                      : 'border-[#E7E2D8] bg-[#FAF9F7] text-[#52525B]'
                  }`}
                >
                  <span>{opt.id}</span>
                  <span className="font-mono text-xs tabular-nums">
                    {opt.surcharge > 0 ? `+$${opt.surcharge}` : 'Included'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="cake-inscription"
                className="block text-sm font-medium text-[#18181B] mb-2"
              >
                {t.inscriptionLabel}
              </label>
              <input
                id="cake-inscription"
                type="text"
                maxLength={45}
                value={inscription}
                onChange={(e) => setInscription(e.target.value)}
                placeholder={t.inscriptionPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label htmlFor="cake-date" className="block text-sm font-medium text-[#18181B] mb-2">
                {t.pickupDateLabel}
              </label>
              <input
                id="cake-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg focus:outline-none focus:border-[#14532D] font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cake-notes" className="block text-sm font-medium text-[#18181B] mb-2">
              {t.notesLabel}
            </label>
            <textarea
              id="cake-notes"
              rows={3}
              maxLength={240}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E7E2D8] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors inline-flex items-center justify-center gap-2"
          >
            {addedFeedback ? (
              <>
                <Check className="w-4 h-4" />
                Added to Bag
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t.addCustomCake} — ${totalPrice.toFixed(2)}
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
