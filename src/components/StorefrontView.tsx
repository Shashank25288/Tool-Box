import React, { useMemo, useState } from 'react';
import { Check, Globe, Plus, Search, Wheat } from 'lucide-react';
import { HERO_IMAGE } from '../data/seedCatalog';
import { TRANSLATIONS } from '../i18n/translations';
import type { LanguageCode, Product, ProductCategory } from '../types/bakery';
import { PWAInstallButton } from './PWAControls';

interface StorefrontViewProps {
  products: Product[];
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onAddToCart: (product: Product) => void;
  onNavigateCustomCakes: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  products,
  language,
  onLanguageChange,
  onAddToCart,
  onNavigateCustomCakes,
}) => {
  const t = TRANSLATIONS[language];
  const [category, setCategory] = useState<'all' | ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const totalUnitsAvailable = useMemo(
    () => products.filter((p) => p.active).reduce((sum, p) => sum + p.stockCount, 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      const localizedName = language === 'fr' ? p.nameFr : language === 'es' ? p.nameEs : p.name;
      const localizedDesc =
        language === 'fr' ? p.descriptionFr : language === 'es' ? p.descriptionEs : p.description;
      return (
        localizedName.toLowerCase().includes(q) ||
        localizedDesc.toLowerCase().includes(q) ||
        p.allergens.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [products, category, searchQuery, language]);

  const handleAdd = (product: Product) => {
    if (product.stockCount <= 0) return;
    onAddToCart(product);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 900);
  };

  const getProductName = (p: Product) =>
    language === 'fr' ? p.nameFr : language === 'es' ? p.nameEs : p.name;

  const getProductDescription = (p: Product) =>
    language === 'fr' ? p.descriptionFr : language === 'es' ? p.descriptionEs : p.description;

  const scrollToMenu = () => {
    document.getElementById('daily-bake-menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-16">
      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-[#E7E2D8] rounded-xl p-8 sm:p-10">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7E2D8]">
                <span className="text-xs font-medium text-[#52525B] tracking-wide">
                  {t.hero.kicker}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-0.5 p-0.5 bg-[#F4F3EF] border border-[#E7E2D8] rounded-lg"
                    role="group"
                    aria-label="Language Selector"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#52525B] ml-2 mr-1" />
                    {(['en', 'fr', 'es'] as LanguageCode[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => onLanguageChange(lang)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors uppercase whitespace-nowrap shrink-0 ${
                          language === lang
                            ? 'bg-white text-[#18181B] shadow-xs'
                            : 'text-[#52525B] hover:text-[#18181B]'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <PWAInstallButton />
                </div>
              </div>

              <h1
                className="mt-8 font-display font-semibold text-[#18181B] tracking-tight leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.35rem)', textWrap: 'balance' }}
              >
                {t.hero.title}
              </h1>
              <p className="mt-5 text-[15px] sm:text-base text-[#52525B] leading-relaxed max-w-xl">
                {t.hero.subtitle}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E7E2D8] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToMenu}
                className="px-6 py-3 text-sm font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
              >
                {t.hero.ctaPrimary}
              </button>
              <button
                type="button"
                onClick={onNavigateCustomCakes}
                className="px-6 py-3 text-sm font-medium bg-[#F4F3EF] text-[#18181B] border border-[#E7E2D8] rounded-lg hover:bg-[#EAE6DC] transition-colors whitespace-nowrap shrink-0"
              >
                {t.hero.ctaSecondary}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#E7E2D8] bg-[#F4F3EF] min-h-[300px]">
            {!failedImages['hero'] ? (
              <img
                src={HERO_IMAGE}
                alt="Hearth & Crumb bakery counter with fresh sourdough loaves, croissants, and celebration cakes"
                referrerPolicy="no-referrer"
                onError={() => setFailedImages((prev) => ({ ...prev, hero: true }))}
                className="w-full h-full lg:h-full object-cover aspect-video lg:aspect-auto"
              />
            ) : (
              <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-8 text-center bg-[#F4F3EF]">
                <Wheat className="w-10 h-10 text-[#14532D] mb-3" />
                <span className="font-display text-lg font-semibold text-[#18181B]">
                  Hearth &amp; Crumb Bakehouse
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4-Column Operations Strip below Hero */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E7E2D8] rounded-xl px-5 py-4">
            <div className="text-xs text-[#52525B]">{t.hero.statScheduleLabel}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#18181B] tabular-nums">
              {t.hero.statScheduleValue}
            </div>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl px-5 py-4">
            <div className="text-xs text-[#52525B]">{t.hero.statLoavesLabel}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#14532D] tabular-nums">
              {totalUnitsAvailable}
            </div>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl px-5 py-4">
            <div className="text-xs text-[#52525B]">{t.hero.statLoyaltyLabel}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#18181B] tabular-nums">
              {t.hero.statLoyaltyValue}
            </div>
          </div>
          <div className="bg-white border border-[#E7E2D8] rounded-xl px-5 py-4">
            <div className="text-xs text-[#52525B]">{t.hero.statPrepLabel}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#18181B] tabular-nums">
              {t.hero.statPrepValue}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Daily Bake Catalog */}
      <section id="daily-bake-menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E7E2D8]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
              {t.menu.heading}
            </h2>
            <p className="mt-1.5 text-sm text-[#52525B]">{t.menu.subheading}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.menu.searchPlaceholder}
                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white border border-[#E7E2D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F4F3EF] border border-[#E7E2D8] rounded-lg overflow-x-auto">
              {(
                [
                  { id: 'all', label: t.menu.all },
                  { id: 'bread', label: t.menu.bread },
                  { id: 'pastry', label: t.menu.pastry },
                  { id: 'cake', label: t.menu.cake },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    category === tab.id
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredProducts.map((product) => {
            const isOut = product.stockCount <= 0;
            const isLow = product.stockCount > 0 && product.stockCount <= product.reorderThreshold;
            const isJustAdded = justAddedId === product.id;

            return (
              <article
                key={product.id}
                className="group bg-white border border-[#E7E2D8] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <div className="aspect-[4/3] w-full bg-[#F4F3EF] overflow-hidden border-b border-[#E7E2D8]">
                    {!failedImages[product.id] ? (
                      <img
                        src={product.image}
                        alt={getProductName(product)}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#F4F3EF]">
                        <Wheat className="w-8 h-8 text-[#14532D] mb-2" />
                        <span className="text-sm font-medium text-[#18181B]">
                          {getProductName(product)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#52525B]">
                      <span className="uppercase tracking-wider font-medium">
                        {t.menu[product.category]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {product.prepTimeMins} {t.menu.prepMinutes}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-medium tabular-nums ${
                          isOut
                            ? 'text-[#DC2626]'
                            : isLow
                              ? 'text-[#B45309]'
                              : 'text-[#14532D]'
                        }`}
                      >
                        {isOut
                          ? t.menu.soldOut
                          : isLow
                            ? `${t.menu.lowStock}: ${product.stockCount}`
                            : `${t.menu.inStock}: ${product.stockCount}`}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between gap-4">
                      <h3 className="text-base font-semibold text-[#18181B] leading-snug">
                        {getProductName(product)}
                      </h3>
                      <span className="font-mono text-[15px] font-semibold text-[#18181B] tabular-nums shrink-0">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#52525B] leading-relaxed">
                      {getProductDescription(product)}
                    </p>

                    <p className="mt-3 text-xs text-[#71717A]">
                      {t.menu.allergens}: {product.allergens.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <button
                    type="button"
                    disabled={isOut}
                    onClick={() => handleAdd(product)}
                    className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                      isOut
                        ? 'bg-[#F4F3EF] text-[#A1A1AA] cursor-not-allowed'
                        : isJustAdded
                          ? 'bg-[#166534] text-white'
                          : 'bg-[#18181B] text-white hover:bg-[#14532D]'
                    }`}
                  >
                    {isJustAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        {t.menu.added}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {isOut ? t.menu.soldOut : t.menu.addToBag}
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Craftsmanship & Loyalty Program Tiers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white border border-[#E7E2D8] rounded-xl p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Hearth Loyalty Program
              </h2>
              <p className="mt-3 text-sm text-[#52525B] leading-relaxed">
                Every online loaf, pastry box, and custom celebration cake earns 10 points per dollar spent. Redeem points directly inside checkout for instant bread credits or cake studio upgrades.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-[#FAF9F7] border border-[#E7E2D8] rounded-xl">
                <div className="text-xs text-[#52525B]">Tier 01 · 0+ pts</div>
                <div className="mt-1 font-display text-lg font-semibold text-[#18181B]">
                  Crumb Member
                </div>
                <p className="mt-2 text-xs text-[#52525B] leading-relaxed">
                  10 pts / $1 spent · Automated bake alerts · Redeem 250 pts for $5 off.
                </p>
              </div>
              <div className="p-5 bg-[#FAF9F7] border border-[#E7E2D8] rounded-xl">
                <div className="text-xs text-[#52525B]">Tier 02 · 500+ pts</div>
                <div className="mt-1 font-display text-lg font-semibold text-[#14532D]">
                  Artisan Baker
                </div>
                <p className="mt-2 text-xs text-[#52525B] leading-relaxed">
                  Priority weekend morning pickup slots · Redeem 500 pts for $12 off.
                </p>
              </div>
              <div className="p-5 bg-[#FAF9F7] border border-[#E7E2D8] rounded-xl">
                <div className="text-xs text-[#52525B]">Tier 03 · 1,500+ pts</div>
                <div className="mt-1 font-display text-lg font-semibold text-[#18181B]">
                  Hearth Patron
                </div>
                <p className="mt-2 text-xs text-[#52525B] leading-relaxed">
                  Complimentary custom cake tasting · Redeem 1,000 pts for $25 off.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
