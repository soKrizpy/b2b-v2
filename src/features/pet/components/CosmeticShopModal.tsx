'use client';
// src/features/pet/components/CosmeticShopModal.tsx
// Comprehensive Cyber-Fantasy Avatar & Companion Pet Dressing Room & Cosmetic Shop.
// Features:
//   - 3 Tabs: Tab 1 (Aksesoris Siswa), Tab 2 (Companion Pet), Tab 3 (Gelar & Title)
//   - Live Interactive Dressing Room Mirror (Try before buy / equip)
//   - Level Requirement & Coin Economy
//   - Theme adaptive (Blue for Light mode, Purple for Dark mode)

import { useState, useTransition } from 'react';
import {
  AVATAR_ACCESSORIES,
  CHARACTER_ARCHETYPES,
  getAccessoryById,
  type CosmeticItem,
  type ShopTabKey,
} from '@/features/pet/lib/avatarShopCatalog';
import { buyCosmetic, equipCosmetic } from '@/features/pet/actions/shopActions';
import { CyberFantasyAvatar } from '@/components/avatar/CyberFantasyAvatar';
import { CyberPetRenderer } from '@/components/avatar/CyberPetRenderer';
import type { EquippedCosmetics } from '@/types/database';
import { Sparkles, ShoppingBag, Check, Lock, RotateCcw, X } from 'lucide-react';

interface Props {
  studentName:        string;
  coins:              number;
  totalXp:            number;
  inventory:          string[];
  equippedCosmetics:  EquippedCosmetics;
  onClose:            () => void;
}

export function CosmeticShopModal({
  studentName,
  coins: initialCoins,
  totalXp,
  inventory: initialInventory,
  equippedCosmetics: initialEquipped,
  onClose,
}: Props) {
  // Local state for optimistic updates
  const [coins, setCoins] = useState(initialCoins);
  const [inventory, setInventory] = useState<string[]>(initialInventory);
  const [equipped, setEquipped] = useState<EquippedCosmetics>(initialEquipped);

  // Dressing room mirror preview state
  const [previewCosmetics, setPreviewCosmetics] = useState<EquippedCosmetics>(initialEquipped);
  const [mirrorMode, setMirrorMode] = useState<'avatar' | 'pet'>('avatar');

  // Navigation tab & filter
  const [activeTab, setActiveTab] = useState<ShopTabKey>('student');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // UI feedback & pending transitions
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Current level calculation
  const currentLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);

  // Filter items by tab and sub-category
  const filteredItems = AVATAR_ACCESSORIES.filter((item) => {
    if (item.tab !== activeTab) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    return true;
  });

  // ── Handle Try-On Preview in Mirror ─────────────────────────────────────────
  const handlePreview = (item: CosmeticItem) => {
    setFeedback(null);
    if (item.tab === 'pet') {
      setMirrorMode('pet');
      if (item.category === 'pet-species') {
        setPreviewCosmetics((prev) => ({ ...prev, petId: item.id.replace('pet-', '') }));
      } else if (item.category === 'pet-acc') {
        setPreviewCosmetics((prev) => ({ ...prev, petHatId: item.id }));
      }
    } else if (item.tab === 'student') {
      setMirrorMode('avatar');
      if (item.category === 'outfit') {
        setPreviewCosmetics((prev) => ({ ...prev, outfitId: item.id }));
      } else if (item.category === 'aura') {
        setPreviewCosmetics((prev) => ({ ...prev, auraId: item.id }));
      } else {
        setPreviewCosmetics((prev) => ({ ...prev, hatId: item.id }));
      }
    } else if (item.tab === 'title') {
      setPreviewCosmetics((prev) => ({ ...prev, titleId: item.id }));
    }
  };

  // Revert preview to currently equipped
  const handleResetPreview = () => {
    setPreviewCosmetics(equipped);
    setFeedback({ message: 'Pratinjau dikembalikan ke perlengkapan aktif.', type: 'success' });
  };

  // ── Handle Buy Action ───────────────────────────────────────────────────────
  const handleBuy = (item: CosmeticItem) => {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('item_id', item.id);
      const res = await buyCosmetic(null, fd);

      if (res.success) {
        setCoins(res.coins ?? coins - item.price);
        setInventory(res.inventory ?? [...inventory, item.id]);
        setFeedback({ message: res.message, type: 'success' });
      } else {
        setFeedback({ message: res.error, type: 'error' });
      }
    });
  };

  // ── Handle Equip / Unequip Action ───────────────────────────────────────────
  const handleEquipToggle = (item: CosmeticItem, isEquipped: boolean) => {
    setFeedback(null);

    // Map category to slot
    let slot: 'hat' | 'outfit' | 'aura' | 'archetype' | 'pet' | 'petHat' | 'title' = 'hat';
    if (item.category === 'outfit') slot = 'outfit';
    else if (item.category === 'aura') slot = 'aura';
    else if (item.category === 'pet-species') slot = 'pet';
    else if (item.category === 'pet-acc') slot = 'petHat';
    else if (item.category === 'title') slot = 'title';

    const targetId = isEquipped ? '' : item.id;

    startTransition(async () => {
      const fd = new FormData();
      fd.append('slot', slot);
      fd.append('item_id', targetId);

      const res = await equipCosmetic(null, fd);
      if (res.success && res.equippedCosmetics) {
        setEquipped(res.equippedCosmetics);
        setPreviewCosmetics(res.equippedCosmetics);
        setFeedback({ message: res.message, type: 'success' });
      } else if (!res.success) {
        setFeedback({ message: res.error, type: 'error' });
      }
    });
  };

  // ── Archetype Change ────────────────────────────────────────────────────────
  const handleArchetypeSelect = (archId: string) => {
    setPreviewCosmetics((prev) => ({ ...prev, archetype: archId }));
    startTransition(async () => {
      const fd = new FormData();
      fd.append('slot', 'archetype');
      fd.append('item_id', archId);
      const res = await equipCosmetic(null, fd);
      if (res.success && res.equippedCosmetics) {
        setEquipped(res.equippedCosmetics);
        setFeedback({ message: `Archetype ${archId} diaktifkan! ✨`, type: 'success' });
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-5
        bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative my-auto w-full max-w-4xl min-h-0 max-h-[calc(100dvh-1.5rem)] flex flex-col
          bg-white dark:bg-[#0B0F19] rounded-3xl overflow-hidden shadow-2xl
          border border-blue-400/40 dark:border-purple-500/40
          transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b
          border-blue-200/50 dark:border-purple-500/20
          bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80
          dark:from-slate-950 dark:via-purple-950/40 dark:to-slate-950">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600
              dark:from-purple-600 dark:to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Toko Kosmetik &amp; Ruang Ganti
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                  bg-cyan-500/[0.15] text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-400/40">
                  Retro Pixel Adventurer
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pilih gaya bertualangmu di Quest Map, rawat pet setia, dan raih gelar terhormat!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coin Balance Chip */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl
              bg-amber-500/[0.15] border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black shadow-sm">
              <span className="text-sm">🪙</span>
              <span className="font-mono text-sm">{coins.toLocaleString('id-ID')}</span>
              <span className="text-[10px] opacity-80 uppercase">Koin</span>
            </div>

            {/* Level Chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl
              bg-blue-500/[0.15] dark:bg-purple-500/[0.15] border border-blue-400/30 dark:border-purple-500/30
              text-blue-700 dark:text-purple-300 text-xs font-black">
              <span>⭐</span>
              <span>Lvl {currentLevel}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center
                bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700
                text-slate-600 dark:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT (Scrollable) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">

          {/* Feedback Alert Bar */}
          {feedback && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/[0.15] text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/[0.15] text-rose-700 dark:text-rose-300 border border-rose-500/30'
            }`}>
              <span>{feedback.message}</span>
              <button type="button" onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">✕</button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              DRESSING ROOM MIRROR (Top Stage)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="rounded-3xl p-5 border
            bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-slate-50
            dark:from-slate-900/90 dark:via-purple-950/30 dark:to-slate-950
            border-blue-400/30 dark:border-purple-500/30 shadow-lg">

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">

              {/* Mirror Toggle & Avatar Visual */}
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-auto">
                <div className="relative group">
                  {mirrorMode === 'avatar' ? (
                    <div className="p-3 rounded-3xl bg-white/70 dark:bg-black/40 border border-blue-300/40 dark:border-purple-400/40 shadow-inner flex items-center justify-center min-w-[140px] min-h-[160px]">
                      <CyberFantasyAvatar
                        archetype={previewCosmetics.archetype}
                        skinTone={previewCosmetics.skinTone}
                        hatId={previewCosmetics.hatId}
                        outfitId={previewCosmetics.outfitId}
                        auraId={previewCosmetics.auraId}
                        size="xl"
                        animateIdle
                        showTag
                        tagLabel="KAMU"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-3xl bg-white/70 dark:bg-black/40 border border-blue-300/40 dark:border-purple-400/40 shadow-inner">
                      <CyberPetRenderer
                        petId={previewCosmetics.petId}
                        petHatId={previewCosmetics.petHatId}
                        size="xl"
                        animate
                      />
                    </div>
                  )}

                  {/* Mode switch button */}
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setMirrorMode('avatar')}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${
                        mirrorMode === 'avatar'
                          ? 'bg-blue-600 text-white shadow-sm dark:bg-purple-600'
                          : 'bg-slate-200/80 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      🧙 Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => setMirrorMode('pet')}
                      className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${
                        mirrorMode === 'pet'
                          ? 'bg-blue-600 text-white shadow-sm dark:bg-purple-600'
                          : 'bg-slate-200/80 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      🐾 Pet
                    </button>
                  </div>
                </div>

                {/* Character Specs & Archetype Switcher */}
                <div className="space-y-2 text-center sm:text-left flex-1 min-w-[200px]">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black
                    bg-blue-500/10 text-blue-600 dark:bg-purple-500/20 dark:text-purple-300 border border-blue-400/25 dark:border-purple-500/30">
                    <Sparkles className="w-3 h-3" /> Cermin Ruang Ganti
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {studentName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {previewCosmetics.titleId
                      ? getAccessoryById(previewCosmetics.titleId)?.name || 'Novice Byte'
                      : 'Novice Byte'}
                  </p>

                  {/* Archetype Quick Switcher (When in Avatar Mode) */}
                  {mirrorMode === 'avatar' && (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                        Pilih Base Karakter:
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        {CHARACTER_ARCHETYPES.map((arch) => (
                          <button
                            key={arch.id}
                            type="button"
                            onClick={() => handleArchetypeSelect(arch.id)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1 ${
                              previewCosmetics.archetype === arch.id
                                ? 'bg-blue-600 text-white border-blue-600 dark:bg-purple-600 dark:border-purple-500 shadow-md scale-105'
                                : 'bg-white/80 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-800 hover:border-blue-400'
                            }`}
                          >
                            <span>{arch.iconEmoji}</span>
                            <span>{arch.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Preview Button & Current Gear Badges */}
              <div className="flex flex-col items-center sm:items-end gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                    bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700
                    text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan Pratinjau</span>
                </button>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 space-y-0.5 text-center sm:text-right">
                  <p>Topi: <span className="font-bold text-blue-600 dark:text-purple-400">{getAccessoryById(previewCosmetics.hatId)?.name || 'Kosong'}</span></p>
                  <p>Outfit: <span className="font-bold text-blue-600 dark:text-purple-400">{getAccessoryById(previewCosmetics.outfitId)?.name || 'Hoodie'}</span></p>
                  <p>Aura: <span className="font-bold text-blue-600 dark:text-purple-400">{getAccessoryById(previewCosmetics.auraId)?.name || 'None'}</span></p>
                  <p>Pet: <span className="font-bold text-blue-600 dark:text-purple-400">{previewCosmetics.petId}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              SHOP TABS & CATEGORY FILTER
             ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            {/* Primary Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => { setActiveTab('student'); setCategoryFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  activeTab === 'student'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-purple-600 dark:shadow-purple-500/20'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🧙 Aksesoris Siswa</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {AVATAR_ACCESSORIES.filter(i => i.tab === 'student').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('pet'); setCategoryFilter('all'); setMirrorMode('pet'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  activeTab === 'pet'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-purple-600 dark:shadow-purple-500/20'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🐾 Companion Pet</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {AVATAR_ACCESSORIES.filter(i => i.tab === 'pet').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('title'); setCategoryFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all ${
                  activeTab === 'title'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-purple-600 dark:shadow-purple-500/20'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🎖️ Gelar &amp; Title</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {AVATAR_ACCESSORIES.filter(i => i.tab === 'title').length}
                </span>
              </button>
            </div>

            {/* Sub-Filters based on Active Tab */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Semua
              </button>

              {activeTab === 'student' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('hat')}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'hat'
                        ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Topi &amp; Visor
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('outfit')}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'outfit'
                        ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Jubah &amp; Armor
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('aura')}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'aura'
                        ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Aura &amp; FX
                  </button>
                </>
              )}

              {activeTab === 'pet' && (
                <>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('pet-species')}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'pet-species'
                        ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Spesies Pet
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('pet-acc')}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                      categoryFilter === 'pet-acc'
                        ? 'bg-blue-500/20 text-blue-700 dark:bg-purple-500/20 dark:text-purple-300 font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Aksesoris Pet
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ITEM CARDS GRID
             ══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              // Ownership logic
              const isStarter = item.rarity === 'starter' || item.price === 0;
              const isOwned   = isStarter || inventory.includes(item.id);

              // Check if currently equipped
              const isEquipped =
                item.id === equipped.hatId ||
                item.id === equipped.outfitId ||
                item.id === equipped.auraId ||
                item.id === equipped.titleId ||
                item.id.replace('pet-', '') === equipped.petId ||
                item.id === equipped.petHatId;

              // Check if level requirement is met
              const isLevelLocked = currentLevel < item.minLevel;
              const canAfford     = coins >= item.price;

              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col justify-between p-4 rounded-3xl border transition-all duration-200 ${
                    isEquipped
                      ? 'bg-emerald-500/10 border-emerald-500/80 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10'
                      : isOwned
                        ? 'bg-white dark:bg-zinc-950/70 border-blue-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-purple-400'
                        : 'bg-slate-50/70 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/80 hover:border-blue-300 dark:hover:border-purple-500/50'
                  }`}
                >
                  <div>
                    {/* Card Top: Icon & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0"
                        style={{
                          background: `${item.accentColor}20`,
                          border: `1.5px solid ${item.accentColor}50`,
                        }}
                      >
                        {item.iconEmoji || '✨'}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isEquipped ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Dipakai
                          </span>
                        ) : isOwned ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:bg-purple-500/20 dark:text-purple-300 border border-blue-400/20 dark:border-purple-500/30">
                            Dimiliki
                          </span>
                        ) : isLevelLocked ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/[0.15] text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Lvl {item.minLevel}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/[0.15] text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            🪙 {item.price} Koin
                          </span>
                        )}

                        {item.badge && !isEquipped && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase"
                            style={{ background: `${item.accentColor}30`, color: item.accentColor }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Title & Lore */}
                    <h5 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Card Bottom: Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-100 dark:border-zinc-800">
                    {/* Coba / Preview Button */}
                    <button
                      type="button"
                      onClick={() => handlePreview(item)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold
                        bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700
                        text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Coba
                    </button>

                    {/* Equip / Buy / Locked Button */}
                    {isEquipped ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleEquipToggle(item, true)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-black
                          bg-rose-500/[0.15] hover:bg-rose-500/25 text-rose-600 dark:text-rose-400
                          border border-rose-500/30 transition-colors"
                      >
                        Lepas
                      </button>
                    ) : isOwned ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleEquipToggle(item, false)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-black text-white
                          bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                          dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500
                          shadow-md transition-all active:scale-95"
                      >
                        Pasang
                      </button>
                    ) : isLevelLocked ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-black
                          bg-slate-100 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-600
                          cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Kunci Lvl {item.minLevel}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending || !canAfford}
                        onClick={() => handleBuy(item)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black text-white transition-all active:scale-95 shadow-md ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20'
                            : 'bg-slate-300 dark:bg-zinc-800 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {canAfford ? `Beli (${item.price} 🪙)` : 'Koin Kurang'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t
          border-blue-200/50 dark:border-purple-500/20
          bg-slate-50/80 dark:bg-slate-950/80 text-xs text-slate-500 dark:text-slate-400">
          <span>Kumpulkan koin dari kuis dan tantangan harian untuk belanja kosmetik! 🚀</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300
              bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            Tutup Lemari
          </button>
        </div>
      </div>
    </div>
  );
}
