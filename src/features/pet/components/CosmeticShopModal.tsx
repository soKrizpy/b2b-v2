'use client';
import { useState, useTransition } from 'react';
import { AVATAR_ACCESSORIES, CHARACTER_ARCHETYPES, getAccessoryById, type CosmeticItem } from '@/features/pet/lib/avatarShopCatalog';
import { buyCosmetic, equipCosmetic } from '@/features/pet/actions/shopActions';
import { CyberFantasyAvatar } from '@/components/avatar/CyberFantasyAvatar';
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import type { EquippedCosmetics } from '@/types/database';
import { Sparkles, ShoppingBag, Check, Lock, RotateCcw, X } from 'lucide-react';

interface Props { studentName: string; coins: number; totalXp: number; inventory: string[]; equippedCosmetics: EquippedCosmetics; onClose: () => void; }
type ShopTab = 'student' | 'title';
type CategoryFilter = 'all' | 'headwear' | 'outfit' | 'aura';

export function CosmeticShopModal({ studentName, coins: initialCoins, totalXp, inventory: initialInventory, equippedCosmetics: initialEquipped, onClose }: Props) {
  const [coins, setCoins] = useState(initialCoins);
  const [inventory, setInventory] = useState<string[]>(initialInventory);
  const [equipped, setEquipped] = useState<EquippedCosmetics>(initialEquipped);
  const [preview, setPreview] = useState<EquippedCosmetics>(initialEquipped);
  const [activeTab, setActiveTab] = useState<ShopTab>('student');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentLevel = calculateLevel(totalXp).currentLevel;

  const filteredItems = AVATAR_ACCESSORIES.filter((item) => {
    if (item.tab !== activeTab) return false;
    if (categoryFilter === 'headwear') return ['hat', 'visor', 'hood', 'headset', 'crown'].includes(item.category);
    if (categoryFilter === 'outfit') return item.category === 'outfit';
    if (categoryFilter === 'aura') return item.category === 'aura';
    return true;
  });

  const handlePreview = (item: CosmeticItem) => {
    setFeedback(null);
    setPreview((current) => item.tab === 'title' ? { ...current, titleId: item.id } :
      item.category === 'outfit' ? { ...current, outfitId: item.id } :
      item.category === 'aura' ? { ...current, auraId: item.id } : { ...current, hatId: item.id });
  };

  const handleResetPreview = () => {
    setPreview(equipped);
    setFeedback({ message: 'Pratinjau dikembalikan ke perlengkapan aktif.', type: 'success' });
  };

  const handleBuy = (item: CosmeticItem) => {
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('item_id', item.id);
      const result = await buyCosmetic(null, formData);
      if (result.success) {
        setCoins(result.coins ?? coins - item.price);
        setInventory(result.inventory ?? [...inventory, item.id]);
        setFeedback({ message: result.message, type: 'success' });
      } else setFeedback({ message: result.error, type: 'error' });
    });
  };

  const handleEquip = (item: CosmeticItem, currentlyEquipped: boolean) => {
    setFeedback(null);
    const slot: 'hat' | 'outfit' | 'aura' | 'title' = item.category === 'outfit' ? 'outfit' : item.category === 'aura' ? 'aura' : item.category === 'title' ? 'title' : 'hat';
    startTransition(async () => {
      const formData = new FormData();
      formData.append('slot', slot);
      formData.append('item_id', currentlyEquipped ? '' : item.id);
      const result = await equipCosmetic(null, formData);
      if (result.success && result.equippedCosmetics) {
        setEquipped(result.equippedCosmetics);
        setPreview(result.equippedCosmetics);
        setFeedback({ message: result.message, type: 'success' });
      } else if (!result.success) setFeedback({ message: result.error, type: 'error' });
    });
  };

  const handleArchetypeSelect = (archetype: string) => {
    setFeedback(null);
    setPreview((current) => ({ ...current, archetype }));
    startTransition(async () => {
      const formData = new FormData();
      formData.append('slot', 'archetype');
      formData.append('item_id', archetype);
      const result = await equipCosmetic(null, formData);
      if (result.success && result.equippedCosmetics) {
        setEquipped(result.equippedCosmetics);
        setPreview(result.equippedCosmetics);
        setFeedback({ message: 'Gaya karakter berhasil diperbarui!', type: 'success' });
      } else if (!result.success) {
        setPreview(equipped);
        setFeedback({ message: result.error, type: 'error' });
      }
    });
  };

  const isEquipped = (item: CosmeticItem) => item.id === equipped.hatId || item.id === equipped.outfitId || item.id === equipped.auraId || item.id === equipped.titleId;
  const isPreviewed = (item: CosmeticItem) => item.id === preview.hatId || item.id === preview.outfitId || item.id === preview.auraId || item.id === preview.titleId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-5" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Lemari avatar" className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-blue-400/40 bg-white shadow-2xl dark:border-purple-500/40 dark:bg-[#0B0F19]" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-blue-200/50 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-5 py-4 dark:border-purple-500/20 dark:from-slate-950 dark:via-purple-950/40 dark:to-slate-950 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white dark:from-purple-600 dark:to-indigo-600"><ShoppingBag className="h-5 w-5" /></div><div className="min-w-0"><h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">Lemari Avatar</h2><p className="text-xs text-slate-500 dark:text-slate-400">Atur karakter, aksesoris, dan gelar petualanganmu.</p></div></div>
          <div className="flex shrink-0 items-center gap-3"><span className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">🪙 {coins.toLocaleString('id-ID')}</span><button type="button" onClick={onClose} aria-label="Tutup lemari" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"><X className="h-4 w-4" /></button></div>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {feedback && <div role="status" className={`flex items-center justify-between rounded-xl border p-3 text-xs font-bold ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Tutup pesan">✕</button></div>}
          <div className="grid gap-5 rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-50 p-4 dark:border-purple-500/30 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-950 md:grid-cols-[190px_1fr] md:items-center">
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-blue-300/40 bg-white/70 p-3 dark:border-purple-400/30 dark:bg-black/30"><CyberFantasyAvatar archetype={preview.archetype || 'astral-knight'} skinTone={preview.skinTone || 'default'} hatId={preview.hatId ?? undefined} outfitId={preview.outfitId || 'outfit-cyber-hoodie'} auraId={preview.auraId ?? undefined} size="xl" animateIdle showTag tagLabel="KAMU" /></div>
            <div className="space-y-3">
              <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-purple-300"><Sparkles className="h-3.5 w-3.5" /> Cermin Ruang Ganti</div><h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{studentName}</h3><p className="text-xs text-slate-500 dark:text-slate-400">{preview.titleId ? getAccessoryById(preview.titleId)?.name || 'Petualang' : 'Petualang'}</p></div>
              <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pilih gaya karakter</p><div className="flex flex-wrap gap-2">{CHARACTER_ARCHETYPES.map((archetype) => <button key={archetype.id} type="button" disabled={isPending} onClick={() => handleArchetypeSelect(archetype.id)} aria-pressed={preview.archetype === archetype.id} className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${preview.archetype === archetype.id ? 'border-indigo-600 bg-indigo-600 text-white dark:border-purple-500 dark:bg-purple-600' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{archetype.iconEmoji} {archetype.name}</button>)}</div></div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><span>Topi: {getAccessoryById(preview.hatId)?.name || 'Kosong'}</span><span>· Outfit: {getAccessoryById(preview.outfitId)?.name || 'Bawaan'}</span><span>· Aura: {getAccessoryById(preview.auraId)?.name || 'Tidak ada'}</span></div>
              <button type="button" onClick={handleResetPreview} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"><RotateCcw className="h-3.5 w-3.5" /> Kembalikan Pratinjau</button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-zinc-800">{([['student', '🧙 Aksesoris Avatar'], ['title', '🎖️ Gelar & Title']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => { setActiveTab(tab); setCategoryFilter('all'); }} aria-pressed={activeTab === tab} className={`rounded-xl px-4 py-2 text-xs font-black transition-colors sm:text-sm ${activeTab === tab ? 'bg-blue-600 text-white dark:bg-purple-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-slate-400 dark:hover:bg-zinc-800'}`}>{label}</button>)}</div>
            {activeTab === 'student' && <div className="flex flex-wrap gap-2 text-xs">{([['all', 'Semua'], ['headwear', 'Aksesoris Kepala'], ['outfit', 'Outfit'], ['aura', 'Aura & Efek']] as const).map(([filter, label]) => <button key={filter} type="button" onClick={() => setCategoryFilter(filter)} aria-pressed={categoryFilter === filter} className={`rounded-lg px-3 py-1.5 font-bold ${categoryFilter === filter ? 'bg-indigo-100 text-indigo-700 dark:bg-purple-500/20 dark:text-purple-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800'}`}>{label}</button>)}</div>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const starter = item.rarity === 'starter' || item.price === 0;
              const owned = starter || inventory.includes(item.id);
              const equippedNow = isEquipped(item);
              const previewed = isPreviewed(item);
              const locked = currentLevel < item.minLevel;
              const affordable = coins >= item.price;
              return <article key={item.id} className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${equippedNow ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60'}`}>
                <div><div className="mb-3 flex items-start justify-between gap-2"><span className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl" style={{ background: `${item.accentColor}20`, border: `1px solid ${item.accentColor}50` }}>{item.iconEmoji || '✨'}</span><div className="flex flex-col items-end gap-1">
                  {equippedNow ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-300"><Check className="h-3 w-3" /> Dipakai</span> : owned ? <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-purple-300">Dimiliki</span> : locked ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600"><Lock className="h-3 w-3" /> Lv {item.minLevel}</span> : <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">🪙 {item.price}</span>}
                  {item.badge && <span className="text-[9px] font-black uppercase" style={{ color: item.accentColor }}>{item.badge}</span>}
                </div></div><h4 className="text-sm font-black text-slate-900 dark:text-white">{item.name}</h4><p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p></div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800"><button type="button" onClick={() => handlePreview(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${previewed ? 'bg-indigo-100 text-indigo-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300'}`}>Coba</button>
                  {equippedNow ? <button type="button" disabled={isPending} onClick={() => handleEquip(item, true)} className="flex-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-600 disabled:opacity-50">Lepas</button> : owned ? <button type="button" disabled={isPending} onClick={() => handleEquip(item, false)} className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50 dark:bg-purple-600">Pasang</button> : locked ? <button type="button" disabled className="flex-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400 dark:bg-zinc-800">Butuh Level {item.minLevel}</button> : <button type="button" disabled={isPending || !affordable} onClick={() => handleBuy(item)} className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{affordable ? `Beli · ${item.price} koin` : 'Koin kurang'}</button>}
                </div>
              </article>;
            })}
            {filteredItems.length === 0 && <p className="col-span-full rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">Belum ada item pada kategori ini.</p>}
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 dark:border-zinc-800 dark:bg-slate-950 dark:text-slate-400"><span>Gunakan koin hasil belajar untuk membuka perlengkapan baru.</span><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 font-black text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700">Tutup</button></footer>
      </section>
    </div>
  );
}
