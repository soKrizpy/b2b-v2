'use client';
// src/components/avatar/CyberFantasyAvatar.tsx
// 16-Bit Retro Pixel Adventurer Student Avatar Engine.
// Visually harmonized with the Quest Map character sprite:
// - Full-body 16-bit pixel adventurer sprite
// - Iconic adventurer cap, hair, pixel gleam eyes, tunic, belt with golden buckle, backpack, and boots
// - Modular support for shop cosmetics (Hats, Outfits, Auras)
// - Pulsing cyan floor mana rune shadow
// - Floating "KAMU" status tag
// - Idle bounce animation matching the map character

import React from 'react';

export interface CyberFantasyAvatarProps {
  archetype?: string;          // 'cyber-mage' | 'astral-knight' | 'shadow-glitcher' | 'chrono-alchemist'
  skinTone?: string;           // 'default' | 'fair' | 'tan' | 'dark'
  hatId?: string | null;
  outfitId?: string | null;
  auraId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  isSelf?: boolean;
  animateIdle?: boolean;
  showTag?: boolean;
  tagLabel?: string;
}

const SIZE_MAP = {
  xs:    'w-8 h-10',
  sm:    'w-10 h-12',
  md:    'w-14 h-16',
  lg:    'w-20 h-24',
  xl:    'w-28 h-34',
  '2xl': 'w-40 h-48',
};

const SKIN_TONES: Record<string, { base: string; shadow: string; cheek: string }> = {
  default: { base: '#fde68a', shadow: '#f59e0b', cheek: '#fca5a5' }, // Anime warm peach
  fair:    { base: '#fef3c7', shadow: '#fde68a', cheek: '#fda4af' }, // Porcelain
  tan:     { base: '#d97706', shadow: '#b45309', cheek: '#f87171' }, // Sun-kissed bronze
  dark:    { base: '#78350f', shadow: '#451a03', cheek: '#e11d48' }, // Deep cocoa
};

export function CyberFantasyAvatar({
  archetype = 'astral-knight',
  skinTone = 'default',
  hatId,
  outfitId,
  auraId,
  size = 'md',
  className = '',
  isSelf = false,
  animateIdle = true,
  showTag = false,
  tagLabel = 'KAMU',
}: CyberFantasyAvatarProps) {
  const skin = SKIN_TONES[skinTone] || SKIN_TONES.default;
  const arch = archetype ? archetype.toLowerCase() : 'astral-knight';

  // Palette customization based on Archetype
  const palette = {
    'astral-knight': {
      tunicMain:   '#0891b2', // Cyan-600 (Iconic Map Adventurer)
      tunicLight:  '#22d3ee', // Cyan-400
      tunicDark:   '#0e7490', // Cyan-700
      hair:        '#78350f', // Amber-900 / Warm adventurer brown
      hairLight:   '#b45309',
      runeColor:   '#22d3ee',
    },
    'cyber-mage': {
      tunicMain:   '#7c3aed', // Violet-600
      tunicLight:  '#a855f7', // Violet-400
      tunicDark:   '#5b21b6', // Violet-800
      hair:        '#312e81', // Indigo-900
      hairLight:   '#6366f1',
      runeColor:   '#c084fc',
    },
    'shadow-glitcher': {
      tunicMain:   '#18181b', // Zinc-900
      tunicLight:  '#e11d48', // Rose-600
      tunicDark:   '#09090b', // Black
      hair:        '#27272a', // Zinc-800
      hairLight:   '#f43f5e',
      runeColor:   '#f43f5e',
    },
    'chrono-alchemist': {
      tunicMain:   '#059669', // Emerald-600
      tunicLight:  '#34d399', // Emerald-400
      tunicDark:   '#065f46', // Emerald-800
      hair:        '#f59e0b', // Golden Amber
      hairLight:   '#fde047',
      runeColor:   '#10b981',
    },
  }[arch] || {
    tunicMain:   '#0891b2',
    tunicLight:  '#22d3ee',
    tunicDark:   '#0e7490',
    hair:        '#78350f',
    hairLight:   '#b45309',
    runeColor:   '#22d3ee',
  };

  const shouldDisplayTag = showTag || isSelf;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center flex-shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
      style={{ overflow: 'visible' }}
    >
      {/* ── 1. Floating Tag ("KAMU" / "YOU") ── */}
      {shouldDisplayTag && (
        <div className="absolute -top-3.5 z-40 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] tracking-widest font-mono shadow-[0_0_10px_rgba(6,182,212,0.8)] border border-white flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          {tagLabel}
        </div>
      )}

      {/* ── 2. Pixel Adventurer Body & Animations ── */}
      <div
        className={`relative w-full h-full flex flex-col items-center justify-center ${
          animateIdle ? 'animate-bounce transition-transform duration-300 hover:scale-105' : ''
        }`}
        style={{ imageRendering: 'pixelated' }}
      >
        <svg
          viewBox="0 0 64 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)]"
          shapeRendering="crispEdges"
        >
          {/* ════════════════════════════════════════════════════════════════
              LAYER 1: AURA FX (Behind character)
             ════════════════════════════════════════════════════════════════ */}
          {auraId === 'aura-matrix' && (
            <g id="aura-matrix" className="animate-pulse">
              <rect x="8" y="12" width="2" height="6" fill="#22c55e" opacity="0.8" />
              <rect x="54" y="16" width="2" height="8" fill="#22c55e" opacity="0.9" />
              <rect x="12" y="38" width="2" height="10" fill="#4ade80" opacity="0.85" />
              <rect x="50" y="44" width="2" height="6" fill="#22c55e" opacity="0.75" />
              <rect x="20" y="4" width="3" height="3" fill="#86efac" />
              <rect x="42" y="8" width="3" height="3" fill="#86efac" />
            </g>
          )}

          {auraId === 'aura-quantum' && (
            <g id="aura-quantum">
              <ellipse cx="32" cy="38" rx="28" ry="14" stroke="#c084fc" strokeWidth="2" strokeDasharray="4 4" transform="rotate(-15 32 38)" opacity="0.75" />
              <ellipse cx="32" cy="38" rx="28" ry="14" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" transform="rotate(25 32 38)" opacity="0.75" />
              <rect x="8" y="24" width="4" height="4" fill="#c084fc" />
              <rect x="52" y="48" width="4" height="4" fill="#38bdf8" />
            </g>
          )}

          {auraId === 'aura-glitch' && (
            <g id="aura-glitch">
              <rect x="6" y="20" width="8" height="3" fill="#06b6d4" opacity="0.8" />
              <rect x="50" y="24" width="8" height="3" fill="#f43f5e" opacity="0.8" />
              <rect x="10" y="52" width="6" height="2.5" fill="#f43f5e" opacity="0.75" />
              <rect x="48" y="48" width="8" height="3" fill="#06b6d4" opacity="0.85" />
            </g>
          )}

          {auraId === 'aura-celestial' && (
            <g id="aura-celestial">
              <ellipse cx="32" cy="38" rx="28" ry="24" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.85" />
              <polygon points="32,4 34,9 32,11 30,9" fill="#ffd700" />
              <polygon points="58,38 53,40 51,38 53,36" fill="#ffd700" />
              <polygon points="32,66 30,61 32,59 34,61" fill="#ffd700" />
              <polygon points="6,38 11,36 13,38 11,40" fill="#ffd700" />
            </g>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LAYER 2: FLOOR SHADOW RUNE (Matching Map Adventurer)
             ════════════════════════════════════════════════════════════════ */}
          <ellipse cx="32" cy="67" rx="18" ry="4" fill="#0f172a" opacity="0.4" />
          <ellipse cx="32" cy="67" rx="15" ry="3" fill={palette.runeColor} opacity="0.45" className="animate-pulse" />

          {/* ════════════════════════════════════════════════════════════════
              LAYER 3: ADVENTURER BACKPACK (Left Side)
             ════════════════════════════════════════════════════════════════ */}
          <g id="backpack">
            {/* Main Leather Pack */}
            <rect x="14" y="32" width="7" height="15" rx="1.5" fill="#78350f" />
            <rect x="15" y="34" width="5" height="11" fill="#92400e" />
            {/* Top Flap */}
            <rect x="13" y="30" width="9" height="4" rx="1" fill="#451a03" />
            {/* Brass Buckle */}
            <rect x="16" y="37" width="3" height="3" fill="#facc15" />
            {/* Straps */}
            <rect x="20" y="32" width="2" height="12" fill="#451a03" />
          </g>

          {/* ════════════════════════════════════════════════════════════════
              LAYER 4: STURDY ADVENTURER BOOTS & LEGS
             ════════════════════════════════════════════════════════════════ */}
          <g id="legs-and-boots">
            {/* Pants / Trousers */}
            <rect x="23" y="54" width="7" height="7" fill="#1e293b" />
            <rect x="34" y="54" width="7" height="7" fill="#1e293b" />

            {/* Left Boot */}
            <rect x="21" y="60" width="9" height="6" rx="1" fill="#451a03" />
            <rect x="20" y="63" width="10" height="3" fill="#291102" />
            <rect x="22" y="60" width="3" height="2" fill="#78350f" />

            {/* Right Boot */}
            <rect x="34" y="60" width="9" height="6" rx="1" fill="#451a03" />
            <rect x="34" y="63" width="10" height="3" fill="#291102" />
            <rect x="39" y="60" width="3" height="2" fill="#78350f" />
          </g>

          {/* ════════════════════════════════════════════════════════════════
              LAYER 5: OUTFIT / TUNIC / ROBE / ARMOR
             ════════════════════════════════════════════════════════════════ */}
          {/* Default / Cyber Adventurer Hoodie: Iconic Blue Tunic with Belt */}
          {(!outfitId || outfitId === 'outfit-cyber-hoodie') && (
            <g id="outfit-adventurer-tunic">
              {/* Main Tunic Body */}
              <rect x="20" y="36" width="24" height="18" rx="2" fill={palette.tunicMain} />
              {/* Chest highlight */}
              <rect x="24" y="38" width="16" height="10" fill={palette.tunicLight} />
              {/* Collar / V-Neck */}
              <polygon points="28,36 36,36 32,42" fill={skin.base} />
              {/* Arms / Sleeves */}
              <rect x="17" y="38" width="4" height="10" rx="1" fill={palette.tunicDark} />
              <rect x="43" y="38" width="4" height="10" rx="1" fill={palette.tunicDark} />
              {/* Hands */}
              <rect x="17" y="47" width="4" height="3" fill={skin.base} />
              <rect x="43" y="47" width="4" height="3" fill={skin.base} />

              {/* Adventurer Leather Belt with Golden Buckle */}
              <rect x="20" y="48" width="24" height="4" fill="#451a03" />
              <rect x="29" y="47" width="6" height="6" rx="1" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
              <rect x="31" y="49" width="2" height="2" fill="#713f12" />
            </g>
          )}

          {/* Archmage Robe */}
          {outfitId === 'outfit-wizard-robe' && (
            <g id="outfit-wizard-robe">
              <polygon points="18,36 46,36 49,56 15,56" fill="#581c87" />
              <polygon points="24,36 40,36 42,56 22,56" fill="#7e22ce" />
              {/* Rune Center Line */}
              <line x1="32" y1="36" x2="32" y2="56" stroke="#facc15" strokeWidth="1.5" />
              <rect x="30" y="44" width="4" height="4" fill="#fbbf24" />
              {/* Sleeves */}
              <rect x="15" y="38" width="5" height="12" fill="#3b0764" />
              <rect x="44" y="38" width="5" height="12" fill="#3b0764" />
              <rect x="16" y="48" width="4" height="3" fill={skin.base} />
              <rect x="44" y="48" width="4" height="3" fill={skin.base} />
            </g>
          )}

          {/* Astral Plate Armor */}
          {outfitId === 'outfit-astral-plate' && (
            <g id="outfit-astral-plate">
              <rect x="20" y="36" width="24" height="18" rx="2" fill="#0369a1" />
              <rect x="23" y="38" width="18" height="10" fill="#0284c7" />
              {/* Glowing Mana Core */}
              <circle cx="32" cy="44" r="3.5" fill="#38bdf8" />
              <circle cx="32" cy="44" r="1.5" fill="#ffffff" />
              {/* Pauldrons */}
              <rect x="16" y="36" width="6" height="8" rx="1.5" fill="#0284c7" />
              <rect x="42" y="36" width="6" height="8" rx="1.5" fill="#0284c7" />
              {/* Hands */}
              <rect x="17" y="47" width="4" height="3" fill="#075985" />
              <rect x="43" y="47" width="4" height="3" fill="#075985" />
              {/* Belt */}
              <rect x="20" y="49" width="24" height="4" fill="#0c4a6e" />
              <rect x="30" y="49" width="4" height="4" fill="#38bdf8" />
            </g>
          )}

          {/* Shinobi Gi */}
          {outfitId === 'outfit-shinobi-suit' && (
            <g id="outfit-shinobi-suit">
              <rect x="20" y="36" width="24" height="18" rx="2" fill="#09090b" />
              <polygon points="25,36 32,46 39,36" fill="#e11d48" />
              <rect x="16" y="38" width="5" height="11" fill="#18181b" />
              <rect x="43" y="38" width="5" height="11" fill="#18181b" />
              <rect x="17" y="47" width="4" height="3" fill={skin.base} />
              <rect x="43" y="47" width="4" height="3" fill={skin.base} />
              <rect x="20" y="48" width="24" height="4" fill="#e11d48" />
              <rect x="29" y="47" width="6" height="5" fill="#be123c" />
            </g>
          )}

          {/* Chrono Coat */}
          {outfitId === 'outfit-chrono-coat' && (
            <g id="outfit-chrono-coat">
              <rect x="19" y="36" width="26" height="18" rx="2" fill="#065f46" />
              <rect x="24" y="38" width="16" height="14" fill="#047857" />
              {/* Brass Gear Amulet */}
              <circle cx="32" cy="43" r="3.5" fill="#f59e0b" />
              <circle cx="32" cy="43" r="1.5" fill="#065f46" />
              {/* Sleeves */}
              <rect x="16" y="38" width="5" height="11" fill="#064e3b" />
              <rect x="43" y="38" width="5" height="11" fill="#064e3b" />
              <rect x="17" y="47" width="4" height="3" fill={skin.base} />
              <rect x="43" y="47" width="4" height="3" fill={skin.base} />
              {/* Belt */}
              <rect x="19" y="49" width="26" height="4" fill="#78350f" />
              <rect x="29" y="48" width="6" height="6" fill="#fbbf24" />
            </g>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LAYER 6: FACE & EYES (16-Bit Pixel Expression)
             ════════════════════════════════════════════════════════════════ */}
          <g id="face-and-head">
            {/* Neck */}
            <rect x="29" y="33" width="6" height="4" fill={skin.shadow} />

            {/* Face Block */}
            <rect x="22" y="16" width="20" height="18" rx="2" fill={skin.base} />
            <rect x="22" y="28" width="20" height="6" fill={skin.shadow} opacity="0.3" />

            {/* Elf Ears (for Chrono Alchemist) */}
            {arch === 'chrono-alchemist' && (
              <g id="elf-ears">
                <polygon points="22,22 16,18 22,26" fill={skin.base} />
                <polygon points="42,22 48,18 42,26" fill={skin.base} />
              </g>
            )}

            {/* Pixel Eyes with Gleam Highlight */}
            {/* Left Eye */}
            <rect x="26" y="22" width="3.5" height="5" fill="#09090b" />
            <rect x="26" y="22" width="1.5" height="2" fill="#ffffff" />
            {/* Right Eye */}
            <rect x="34.5" y="22" width="3.5" height="5" fill="#09090b" />
            <rect x="34.5" y="22" width="1.5" height="2" fill="#ffffff" />

            {/* Cyber Glow pupils for Mage / Shinobi */}
            {arch === 'shadow-glitcher' && (
              <rect x="27" y="24" width="2" height="2" fill="#f43f5e" />
            )}
            {arch === 'cyber-mage' && (
              <rect x="35.5" y="24" width="2" height="2" fill="#a855f7" />
            )}

            {/* Cute Pixel Cheek Blush */}
            <rect x="24" y="27" width="2.5" height="1.5" fill={skin.cheek} opacity="0.75" />
            <rect x="37.5" y="27" width="2.5" height="1.5" fill={skin.cheek} opacity="0.75" />

            {/* Adventurer Smile */}
            <rect x="30" y="29" width="4" height="1.5" fill="#78350f" />
          </g>

          {/* ════════════════════════════════════════════════════════════════
              LAYER 7: HAIR BASE & BANGS
             ════════════════════════════════════════════════════════════════ */}
          <g id="hair-base">
            {/* Hair bangs framing face */}
            <rect x="21" y="15" width="22" height="5" fill={palette.hair} />
            <rect x="21" y="19" width="4" height="7" fill={palette.hair} />
            <rect x="39" y="19" width="4" height="7" fill={palette.hair} />
            <polygon points="25,18 29,18 27,22" fill={palette.hair} />
            <polygon points="34,18 38,18 36,22" fill={palette.hair} />
          </g>

          {/* ════════════════════════════════════════════════════════════════
              LAYER 8: HEADGEAR & ACCESSORIES (Pixel Art)
             ════════════════════════════════════════════════════════════════ */}
          {/* Default: Iconic Map Adventurer Cap */}
          {!hatId && (
            <g id="default-map-adventurer-cap">
              {/* Top Cap */}
              <rect x="21" y="8" width="22" height="8" rx="2" fill="#78350f" />
              {/* Middle Layer */}
              <rect x="19" y="12" width="26" height="5" rx="1" fill="#92400e" />
              {/* Cap Brim / Peak */}
              <rect x="18" y="15" width="28" height="3" fill="#451a03" />
              {/* Front Badge / Button */}
              <rect x="30" y="11" width="4" height="3" fill="#facc15" />
            </g>
          )}

          {/* Bandana Coder Pemula */}
          {hatId === 'rookie-band' && (
            <g id="hat-rookie-band">
              <rect x="19" y="15" width="26" height="5" fill="#2563eb" />
              <rect x="29" y="15" width="6" height="5" fill="#ffffff" />
              <polygon points="19,17 14,21 17,23" fill="#1d4ed8" />
            </g>
          )}

          {/* Topi Hacker Cyberpunk */}
          {hatId === 'topi-hacker' && (
            <g id="hat-topi-hacker">
              <rect x="21" y="8" width="22" height="8" rx="2" fill="#0284c7" />
              <rect x="19" y="13" width="26" height="4" fill="#0369a1" />
              {/* Neon Visor Bill */}
              <polygon points="18,17 46,17 48,21 16,21" fill="#06b6d4" opacity="0.9" />
              <line x1="20" y1="18.5" x2="44" y2="18.5" stroke="#ffffff" strokeWidth="0.8" />
            </g>
          )}

          {/* Topi Dino Kawaii */}
          {hatId === 'dino-cap' && (
            <g id="hat-dino-cap">
              <rect x="20" y="8" width="24" height="9" rx="3" fill="#10b981" />
              <rect x="19" y="14" width="26" height="4" fill="#059669" />
              {/* Cute Dino Spikes */}
              <polygon points="26,8 28,3 30,8" fill="#047857" />
              <polygon points="33,8 35,3 37,8" fill="#047857" />
              {/* Dino Eyes */}
              <rect x="24" y="10" width="3" height="3" fill="#ffffff" />
              <rect x="25" y="11" width="1.5" height="1.5" fill="#064e3b" />
              <rect x="37" y="10" width="3" height="3" fill="#ffffff" />
              <rect x="37" y="11" width="1.5" height="1.5" fill="#064e3b" />
            </g>
          )}

          {/* Ikat Kepala Shinobi */}
          {hatId === 'ninja-headband' && (
            <g id="hat-ninja-headband">
              <rect x="19" y="15" width="26" height="5" fill="#dc2626" />
              {/* Forehead Metal Plate */}
              <rect x="27" y="15" width="10" height="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.5" />
              <rect x="31" y="16.5" width="2" height="2" fill="#ef4444" />
              {/* Ribbon Tails */}
              <polygon points="19,17 13,22 17,24" fill="#b91c1c" />
            </g>
          )}

          {/* Tudung Code Archmage */}
          {hatId === 'tudung-wizard' && (
            <g id="hat-wizard-hood">
              {/* Wizard Hat Peak */}
              <polygon points="32,2 40,14 24,14" fill="#6b21a8" />
              <polygon points="32,2 35,9 29,9" fill="#7e22ce" />
              {/* Crystal Gem */}
              <rect x="30" y="11" width="4" height="4" fill="#facc15" />
              {/* Wide Brim */}
              <rect x="15" y="14" width="34" height="4" rx="1" fill="#581c87" />
            </g>
          )}

          {/* Cyber Cat RGB Headset */}
          {hatId === 'headset-cat' && (
            <g id="hat-cat-headset">
              {/* Headband */}
              <rect x="20" y="9" width="24" height="3" fill="#ec4899" />
              {/* Cat Ears */}
              <polygon points="21,9 24,2 28,9" fill="#f43f5e" />
              <polygon points="23,8 24,4 27,8" fill="#fda4af" />
              <polygon points="43,9 40,2 36,9" fill="#f43f5e" />
              <polygon points="41,8 40,4 37,8" fill="#fda4af" />
              {/* Ear Cushions */}
              <rect x="17" y="16" width="5" height="10" rx="1.5" fill="#db2777" />
              <rect x="42" y="16" width="5" height="10" rx="1.5" fill="#db2777" />
            </g>
          )}

          {/* Headset Pro Gamer */}
          {hatId === 'headset-pro' && (
            <g id="hat-gamer-headset">
              <rect x="20" y="8" width="24" height="3.5" fill="#d97706" />
              <rect x="17" y="16" width="5" height="11" rx="1.5" fill="#f59e0b" />
              <rect x="42" y="16" width="5" height="11" rx="1.5" fill="#f59e0b" />
              {/* Boom Mic */}
              <path d="M19 24 L27 30" stroke="#78350f" strokeWidth="1.5" />
              <circle cx="28" cy="30" r="1.5" fill="#ef4444" />
            </g>
          )}

          {/* Kacamata HUD Scouter */}
          {hatId === 'visor-neon' && (
            <g id="hat-hud-visor">
              <rect x="24" y="21" width="8" height="7" rx="1" fill="#00f0ff" fillOpacity="0.85" stroke="#0284c7" strokeWidth="0.8" />
              <line x1="24" y1="24" x2="18" y2="23" stroke="#0284c7" strokeWidth="1" />
              <rect x="26" y="23" width="4" height="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Kacamata VR Metaverse */}
          {hatId === 'vr-goggles' && (
            <g id="hat-vr-goggles">
              <rect x="20" y="20" width="24" height="9" rx="2" fill="#4c1d95" stroke="#7c3aed" strokeWidth="0.8" />
              <line x1="22" y1="24.5" x2="42" y2="24.5" stroke="#00f0ff" strokeWidth="1.5" />
              <rect x="17" y="22" width="4" height="4" fill="#312e81" />
              <rect x="43" y="22" width="4" height="4" fill="#312e81" />
            </g>
          )}

          {/* Lingkaran Halo Kuantum */}
          {hatId === 'golden-halo' && (
            <g id="hat-golden-halo">
              <ellipse cx="32" cy="7" rx="15" ry="3.5" stroke="#ffd700" strokeWidth="2" fill="none" />
              <rect x="19" y="6" width="2" height="2" fill="#ffffff" />
              <rect x="43" y="6" width="2" height="2" fill="#ffffff" />
            </g>
          )}

          {/* Mahkota Juara Algoritma */}
          {hatId === 'cyber-crown' && (
            <g id="hat-cyber-crown">
              <polygon points="21,15 23,7 28,12 32,5 36,12 41,7 43,15" fill="#ffd700" stroke="#b45309" strokeWidth="0.6" />
              {/* Jewels */}
              <circle cx="32" cy="10" r="1.5" fill="#38bdf8" />
              <circle cx="26" cy="12" r="1.2" fill="#ec4899" />
              <circle cx="38" cy="12" r="1.2" fill="#ec4899" />
              <rect x="21" y="14" width="22" height="2.5" fill="#f59e0b" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
