'use client';
// src/features/dashboard/student/modals/PetWardrobeModal.tsx
// Wardrobe modal — shown when the student clicks their own seat.
// Lists all accessories grouped by category with buy / equip / unequip.
// Optimistic UI: state updates immediately; server sync in background.

import { useState, useActionState, useEffect, useTransition } from 'react';
import { buyAccessory, equipAccessory, type ShopActionResult } from '@/features/pet/actions/shopActions';
import {
  AVATAR_ACCESSORIES,
  CATEGORY_LABEL,
  getAccessoryById,
  type AccessoryItem,
  type AccessoryCategory,
} from '@/features/pet/lib/avatarShopCatalog';

interface Props {
  studentName:    string;
  coins:          number;
  inventory:      string[];   // item ids the student already owns
  equippedHatId:  string | null;
  onClose:        () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<AccessoryCategory, string> = {
  hat:           '🎩',
  hood:          '🧙',
  headset:       '🎧',
  visor:         '🥽',
  crown:         '👑',
  outfit:        '🥋',
  aura:          '✨',
  'pet-species': '🐾',
  'pet-acc':     '🎀',
  title:         '🎖️',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as AccessoryCategory[];

// ── Single item card ──────────────────────────────────────────────────────────

function ItemCard({
  item,
  owned,
  equipped,
  coins,
  onBuy,
  onEquip,
  onUnequip,
  pending,
}: {
  item:      AccessoryItem;
  owned:     boolean;
  equipped:  boolean;
  coins:     number;
  onBuy:     (id: string) => void;
  onEquip:   (id: string) => void;
  onUnequip: ()           => void;
  pending:   boolean;
}) {
  const canAfford = coins >= item.price;

  return (
    <div
      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 aspect-square ${
        equipped
          ? 'ring-2 ring-emerald-500 bg-emerald-500/10 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
          : owned
            ? 'border-blue-200/80 hover:border-blue-500/50 bg-slate-50/80 dark:border-zinc-800 dark:hover:border-purple-500/50 dark:bg-zinc-950/60'
            : 'border-slate-200 hover:border-blue-400/50 bg-white dark:border-zinc-800 dark:hover:border-purple-500/50 dark:bg-zinc-950/40'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-1.5">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl shadow-inner"
          style={{ background: `${item.accentColor}22`, border: `1.5px solid ${item.accentColor}55` }}
        >
          {CATEGORY_ICON[item.category]}
        </div>

        {equipped ? (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
            ✓ Dipakai
          </span>
        ) : item.badge ? (
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: `${item.accentColor}33`, color: item.accentColor }}
          >
            {item.badge}
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="my-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight truncate">
          {item.name}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1 leading-normal">
          {item.description}
        </p>
      </div>

      {/* CTA Footer */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200/80 dark:border-zinc-800/80">
        {!owned ? (
          <>
            <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 flex items-center gap-0.5">
              🪙 {item.price}
            </span>
            <button
              type="button"
              onClick={() => onBuy(item.id)}
              disabled={pending || !canAfford}
              className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-colors ${
                canAfford
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
              } disabled:opacity-60`}
            >
              {pending ? '…' : canAfford ? 'Beli' : 'Kurang'}
            </button>
          </>
        ) : equipped ? (
          <button
            type="button"
            onClick={onUnequip}
            disabled={pending}
            className="w-full text-[10px] font-black py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 disabled:opacity-60 transition-colors"
          >
            {pending ? '…' : 'Lepas'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onEquip(item.id)}
            disabled={pending}
            className="w-full text-[10px] font-black py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black disabled:opacity-60 transition-colors"
          >
            {pending ? '…' : 'Pakai'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function PetWardrobeModal({
  studentName,
  coins:       initialCoins,
  inventory:   initialInventory,
  equippedHatId: initialEquipped,
  onClose,
}: Props) {
  // Optimistic local state — updated immediately on action success
  const [coins,     setCoins]     = useState(initialCoins);
  const [inventory, setInventory] = useState<string[]>(initialInventory);
  const [equipped,  setEquipped]  = useState<string | null>(initialEquipped);

  const [activeCategory, setActiveCategory] = useState<AccessoryCategory>('hat');

  // Server actions
  const [buyState,   buyDispatch,   buyPending]   = useActionState<ShopActionResult | null, FormData>(buyAccessory,   null);
  const [equipState, equipDispatch, equipPending] = useActionState<ShopActionResult | null, FormData>(equipAccessory, null);
  const [, startTransition] = useTransition();

  // Sync optimistic state from server responses
  useEffect(() => {
    if (buyState?.success) {
      if (buyState.coins    !== undefined) setCoins(buyState.coins);
      if (buyState.inventory)              setInventory(buyState.inventory);
    }
  }, [buyState]);

  useEffect(() => {
    if (equipState?.success) {
      setEquipped(equipState.equippedHatId ?? null);
    }
  }, [equipState]);

  const pending = buyPending || equipPending;

  const handleBuy = (itemId: string) => {
    const fd = new FormData();
    fd.append('item_id', itemId);
    startTransition(() => buyDispatch(fd));
  };

  const handleEquip = (itemId: string) => {
    // Optimistic update
    setEquipped(itemId);
    const fd = new FormData();
    fd.append('item_id', itemId);
    startTransition(() => equipDispatch(fd));
  };

  const handleUnequip = () => {
    setEquipped(null);
    const fd = new FormData();
    fd.append('item_id', '');          // empty = unequip
    startTransition(() => equipDispatch(fd));
  };

  const categoryItems = AVATAR_ACCESSORIES.filter((a) => a.category === activeCategory);
  const equippedItem  = getAccessoryById(equipped);

  const errorMsg = (!buyState?.success && buyState?.error)
    || (!equipState?.success && equipState?.error)
    || null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain
        bg-black/60 dark:bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#0B0F19] border border-blue-400/40 dark:border-purple-500/40
          rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col min-h-0 max-h-[calc(100dvh-1.5rem)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 pb-4
          border-b border-blue-100 dark:border-purple-500/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-purple-500/[0.15] border border-blue-500/25 dark:border-purple-500/30 flex items-center justify-center text-xl text-blue-600 dark:text-purple-300">
              🎭
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                Lemari Kostum
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{studentName}</p>
            </div>
          </div>

          {/* Coin balance */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              bg-amber-500/10 border border-amber-500/30
              text-sm font-extrabold text-amber-600 dark:text-amber-400">
              🪙 {coins.toLocaleString('id-ID')}
            </span>
            <button
              type="button" onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center
                text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors font-bold text-sm"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Currently equipped strip ── */}
        {equippedItem && (
          <div className="mt-3 px-4 py-2 rounded-xl flex items-center gap-2 border
            border-blue-400/30 bg-blue-50/60 dark:border-purple-500/30 dark:bg-purple-500/10 flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wide text-blue-600 dark:text-purple-400">
              Dipakai:
            </span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {equippedItem.name}
            </span>
          </div>
        )}

        {/* ── Category tabs ── */}
        <div className="flex items-center gap-1.5 pt-4 pb-2 overflow-x-auto flex-shrink-0 scrollbar-none">
          {ALL_CATEGORIES.map((cat) => {
            const ownedCount = AVATAR_ACCESSORIES
              .filter((a) => a.category === cat && inventory.includes(a.id)).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl
                  text-xs font-bold whitespace-nowrap transition-all border
                  ${activeCategory === cat
                    ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/25 dark:bg-purple-600 dark:border-purple-500 dark:text-white dark:shadow-purple-600/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:bg-zinc-950/60 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
                  }`}
              >
                {CATEGORY_ICON[cat]}
                <span>{CATEGORY_LABEL[cat]}</span>
                {ownedCount > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none
                    ${activeCategory === cat
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}>
                    {ownedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Error banner ── */}
        {errorMsg && (
          <div className="mt-2 rounded-xl px-3 py-2 text-xs font-bold
            bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex-shrink-0">
            ✗ {errorMsg}
          </div>
        )}

        {/* ── Item grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 pb-1 pr-1 scrollbar-thin">
          {categoryItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owned={inventory.includes(item.id)}
              equipped={equipped === item.id}
              coins={coins}
              onBuy={handleBuy}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              pending={pending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
