'use client';
// src/features/quiz/components/RetroPixelWorldMap.tsx
// MAP Eksplorasi Petualangan Belajar:
// - Gambar MAP, node gembok, SVG path, dan karakter adventurer dipertahankan penuh
// - Node checklist diperkecil dan bintang dihilangkan sesuai permintaan
// - Tooltip HUD saat mouse hover menampilkan nama topik, score quiz, dan tanggal pertemuan
// - Tampilan fokus pada papan peta utama (daftar topik telah dipindahkan ke tab Riwayat)

import { useState } from 'react';
import Image from 'next/image';
import { Lock, Zap, Crown, Flame, Calendar, Award } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';
import type { QuestTopicNode } from '@/features/quiz/questMapQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import { getMapPinCoordinates, getScratchMapTheme } from '@/features/quiz/scratchMapConfig';
import { ScratchPixelMapScene } from './ScratchPixelMapScene';

interface Props {
  moduleTitle: string;
  moduleLevel?: string | null;
  nodes: QuestTopicNode[];
  activeNode?: QuestTopicNode;
  moduleComplete?: boolean;
  hasFinal?: boolean;
  cert?: { tier: string; score: number; certificate_number: string } | CertificateWithModule | null;
  selectedNodeId?: number | null;
  onSelectNode: (node: QuestTopicNode) => void;
  onSelectFinalBoss: () => void;
}

// ── Retro Pixel Adventurer Sprite ─────────────────────────────────────────────
function PixelAdventurerSprite() {
  return (
    <div className="relative flex flex-col items-center pointer-events-none select-none -translate-y-8 animate-bounce z-50">
      {/* "KAMU" Floating Tag */}
      <div className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] tracking-widest font-mono shadow-[0_0_10px_rgba(6,182,212,0.8)] border border-white flex items-center gap-1 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
        KAMU
      </div>
      {/* 16-Bit Style Pixel Character */}
      <div className="w-8 h-9 relative filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
        {/* Cap & Hair */}
        <div className="absolute top-0 left-2 w-4 h-2 bg-amber-800 rounded-t-sm" />
        <div className="absolute top-1 left-1.5 w-5 h-1.5 bg-amber-700" />
        {/* Face */}
        <div className="absolute top-2.5 left-2 w-4 h-2.5 bg-amber-200" />
        {/* Eyes */}
        <div className="absolute top-3 left-2.5 w-1 h-1 bg-slate-900" />
        <div className="absolute top-3 right-2.5 w-1 h-1 bg-slate-900" />
        {/* Blue Tunic / Outfit */}
        <div className="absolute top-5 left-1.5 w-5 h-3 bg-cyan-600 rounded-sm" />
        {/* Belt */}
        <div className="absolute top-6 left-1.5 w-5 h-1 bg-amber-900" />
        <div className="absolute top-6 left-3.5 w-1 h-1 bg-yellow-400" />
        {/* Backpack */}
        <div className="absolute top-4 -left-1 w-2 h-4 bg-amber-800 rounded-sm" />
        {/* Boots */}
        <div className="absolute top-8 left-2 w-1.5 h-1.5 bg-amber-950" />
        <div className="absolute top-8 right-2 w-1.5 h-1.5 bg-amber-950" />
      </div>
      {/* Pulsing Floor Shadow Rune */}
      <div className="w-7 h-2 rounded-full bg-cyan-400/40 blur-[2px] animate-pulse -mt-0.5" />
    </div>
  );
}

export function RetroPixelWorldMap({
  moduleTitle,
  moduleLevel,
  nodes,
  activeNode,
  moduleComplete,
  hasFinal,
  cert,
  selectedNodeId,
  onSelectNode,
  onSelectFinalBoss,
}: Props) {
  const [hoveredNode, setHoveredNode] = useState<QuestTopicNode | null>(null);
  const [hoveredBoss, setHoveredBoss] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mapSize, setMapSize] = useState<{ width: number; height: number }>({ width: 1200, height: 800 });
  const [baseImageFailed, setBaseImageFailed] = useState(false);

  const scratchTheme = getScratchMapTheme(moduleTitle, moduleLevel);

  const totalCount = nodes.length;
  const localTopicNumbers = nodes.map((_, index) => index + 1);
  const isDense = totalCount > 14;

  // Build sequential SVG connection points for ALL nodes
  const points = nodes.map((_, i) => getMapPinCoordinates(i, totalCount));
  const bossCoord = { x: 84, y: 22 }; // Top-right volcano summit for Final Boss

  // SVG polyline string connecting each node
  const pointsSvgStr = [
    ...points.map((p) => `${p.x},${p.y}`),
    ...(hasFinal ? [`${bossCoord.x},${bossCoord.y}`] : []),
  ].join(' ');

  // Keep the hover HUD anchored to the map board, not viewport coordinates.
  // This prevents large offsets and clipping when the board is inside an animated container.
  const tooltipWidth = 270;
  const tooltipHeight = 160;
  const mapWidth = mapSize.width;
  const mapHeight = mapSize.height;

  let tooltipX = mousePos.x + 16;
  if (tooltipX + tooltipWidth > mapWidth - 16) {
    tooltipX = Math.max(16, mousePos.x - tooltipWidth - 16);
  }

  let tooltipY = mousePos.y + 16;
  if (tooltipY + tooltipHeight > mapHeight - 16) {
    tooltipY = Math.max(16, mousePos.y - tooltipHeight - 16);
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── The Grand Archipelago World Map (MAP Board) ── */}
      <div
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMapSize({ width: rect.width, height: rect.height });
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        data-quest-map-board
        className="relative w-full rounded-3xl overflow-hidden border-4 border-amber-500/60 bg-slate-950 shadow-2xl shadow-cyan-950/40"
      >
        {/* Subtle Vignette & Frame Shadow */}
        <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_60px_rgba(2,6,23,0.8)] border border-amber-300/30 rounded-[20px]" />

        {/* 16:9 Aspect Ratio Map Board */}
        <div className="relative w-full aspect-[16/9]">
          {scratchTheme ? (
            <ScratchPixelMapScene theme={scratchTheme} />
          ) : baseImageFailed ? (
            <div role="img" aria-label="Latar peta ekspedisi" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#14532d_0%,#0f3c35_42%,#164e63_72%,#082f49_100%)]">
              <div className="absolute inset-x-[8%] bottom-[15%] h-[42%] rounded-[35%] border-8 border-amber-200/40 bg-emerald-800/80 shadow-[0_0_0_16px_rgba(217,190,120,.24)]" />
            </div>
          ) : (
            <Image
              src="/images/retro_world_map.jpg"
              alt="MAP Eksplorasi Petualangan Belajar"
              fill
              priority
              referrerPolicy="no-referrer"
              onError={() => setBaseImageFailed(true)}
              className="object-cover object-center select-none"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          )}

          {/* Atmosphere Fog / Cloud Drift Overlays */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />

          {/* ── SVG Leyline Pathway ── */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Outer Glow Path */}
            <polyline
              points={pointsSvgStr}
              fill="none"
              stroke="rgba(245, 158, 11, 0.45)"
              strokeWidth={isDense ? '1.8' : '2.5'}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            />
            {/* Inner Animated Dashed Line */}
            <polyline
              points={pointsSvgStr}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={isDense ? '0.9' : '1.2'}
              strokeDasharray="1.5 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            />
          </svg>

          {/* ── Hovered Node Dynamic Mouse-Follow HUD (Nama Topik, Score Quiz, Tanggal Pertemuan) ── */}
          {hoveredNode && (
            <div
              style={{ left: `${tooltipX}px`, top: `${tooltipY}px` }}
              className="absolute z-[9999] pointer-events-none rounded-2xl bg-slate-950/95 border-2 border-amber-400/90 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md w-[270px] max-w-[calc(100vw-32px)] space-y-2 text-left select-none animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[10px] font-mono font-black uppercase text-amber-300 tracking-wider">
                    Pertemuan #{hoveredNode.sessionNumber}
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  hoveredNode.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : hoveredNode.quizUnlocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : hoveredNode.status === 'ACTIVE_NEXT'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {hoveredNode.status === 'COMPLETED' ? 'Ditaklukkan' : hoveredNode.quizUnlocked ? 'Siap Kuis' : hoveredNode.status === 'ACTIVE_NEXT' ? 'Aktif' : 'Terkunci'}
                </span>
              </div>

              {/* Nama Topik */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Topik</p>
                <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug line-clamp-2">
                  {hoveredNode.topic.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                {/* Score Quiz */}
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>Score Quiz</span>
                  </p>
                  <p className="font-black text-amber-300 mt-0.5">
                    {hoveredNode.status === 'COMPLETED' && hoveredNode.bestScore > 0
                      ? `${hoveredNode.bestScore} / 100`
                      : hoveredNode.hasQuiz
                      ? (hoveredNode.quizUnlocked ? 'Siap Kuis' : 'Terkunci')
                      : 'Tanpa Kuis'}
                  </p>
                </div>

                {/* Tanggal Pertemuan */}
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>Tanggal</span>
                  </p>
                  <p className="font-bold text-cyan-300 mt-0.5 truncate">
                    {hoveredNode.meetingDate ? formatDate(hoveredNode.meetingDate, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terjadwal'}
                  </p>
                </div>
              </div>

              <p className="text-[9px] text-amber-200/70 font-mono pt-0.5">
                Klik node untuk membuka detail &amp; materi
              </p>
            </div>
          )}

          {/* ── Hovered Final Boss Dynamic Mouse-Follow HUD ── */}
          {hoveredBoss && !hoveredNode && (
            <div
              style={{ left: `${tooltipX}px`, top: `${tooltipY}px` }}
              className="fixed z-[9999] pointer-events-none rounded-2xl bg-slate-950/95 border-2 border-red-500/90 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md w-[270px] max-w-[calc(100vw-32px)] space-y-2 text-left select-none animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase text-red-300 tracking-wider">
                    BOSS TRIAL
                  </span>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  cert
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : moduleComplete
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {cert ? 'Lulus' : moduleComplete ? 'Siap Ditantang' : 'Terkunci'}
                </span>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">Tantangan</p>
                <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  Puncak Gunung Api · Ujian Akhir
                </h4>
              </div>

              <div className="pt-1 border-t border-slate-800/80 text-[10px] font-mono text-amber-300">
                <p className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>{cert ? `Sertifikat Nilai ${cert.score}` : 'Raih Sertifikat Kelulusan Resmi'}</span>
                </p>
              </div>

              <p className="text-[9px] text-red-200/70 font-mono pt-0.5">
                Klik untuk melihat detail &amp; memulai Ujian Akhir
              </p>
            </div>
          )}

          {/* ── Interactive Map Pins for EVERY Single Topic ── */}
          {nodes.map((node, idx) => {
            const coord = getMapPinCoordinates(idx, totalCount);
            const isCompleted = node.status === 'COMPLETED';
            const isNeedsQuiz = node.status === 'NEEDS_QUIZ';
            const isActive    = node.status === 'ACTIVE_NEXT';
            const isLocked    = node.status === 'LOCKED';
            const isSelected  = selectedNodeId === node.topic.id;
            const isCurrentHeroLocation = activeNode?.topic.id === node.topic.id;

            return (
              <div
                key={node.topic.id}
                style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
              >
                {/* Character Sprite standing on current active quest */}
                {isCurrentHeroLocation && <PixelAdventurerSprite />}

                {/* Map Pin Button */}
                <button
                  type="button"
                  aria-label={`${node.topic.title}, pertemuan ${node.sessionNumber}, ${
                    node.status === 'LOCKED'
                      ? 'terkunci'
                      : node.status === 'COMPLETED'
                        ? 'selesai, buka materi kembali'
                        : node.status === 'NEEDS_QUIZ'
                          ? 'kuis tersedia'
                          : 'materi tersedia'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`group relative flex items-center justify-center transition-all duration-300 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200
                    ${isSelected ? 'scale-125 z-40 ring-4 ring-cyan-300' : 'hover:scale-125 hover:z-40'}
                    ${
                      isDense
                        ? isCompleted
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-b from-emerald-500 to-teal-700 border border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.7)] text-white'
                          : isNeedsQuiz
                          ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 border border-yellow-200 shadow-[0_0_16px_rgba(245,158,11,1)] text-slate-950 animate-pulse'
                          : isActive
                          ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 border border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,1)] text-slate-950'
                          : 'w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-900/90 border border-slate-600/80 text-slate-400 opacity-80 hover:opacity-100 shadow-md'
                        : isCompleted
                        ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-emerald-500 to-teal-700 border border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.8)] text-white'
                        : isNeedsQuiz
                        ? 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 border-2 border-yellow-200 shadow-[0_0_20px_rgba(245,158,11,1)] text-slate-950 animate-pulse'
                        : isActive
                        ? 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-600 border-2 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,1)] text-slate-950'
                        : 'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/90 border-2 border-slate-600/80 text-slate-400 opacity-80 hover:opacity-100 shadow-md'
                    }`}
                >
                  {/* Pin Number or Status Icon */}
                  <span className={`font-black font-mono tracking-tighter ${
                    isCompleted
                      ? (isDense ? 'text-[8px]' : 'text-[10px]')
                      : (isDense ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm')
                  }`}>
                    {isCompleted ? (
                      '✓'
                    ) : isNeedsQuiz ? (
                      <Zap className={`${isDense ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-current animate-bounce`} />
                    ) : isLocked ? (
                      <Lock className={isDense ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                    ) : (
                      localTopicNumbers[idx]
                    )}
                  </span>

                  {/* Level Pill Label underneath pin */}
                  <div className="absolute top-[calc(100%+3px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <span className={`px-1.5 py-0.2 rounded-md font-black uppercase font-mono shadow-md border ${
                      isDense ? 'text-[8px]' : 'text-[9px]'
                    } ${
                      isCompleted
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                        : isNeedsQuiz
                        ? 'bg-amber-950/90 text-amber-300 border-amber-400/60'
                        : isActive
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400/60'
                        : 'bg-slate-950/80 text-slate-400 border-slate-700/60'
                    }`}>
                      #{localTopicNumbers[idx]}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}

          {/* ── Final Boss Lair Pin (The Volcano Summit) ── */}
          {hasFinal && (
            <div
              style={{ left: `${bossCoord.x}%`, top: `${bossCoord.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
            >
              <button
                type="button"
                onClick={onSelectFinalBoss}
                onMouseEnter={() => setHoveredBoss(true)}
                onMouseLeave={() => setHoveredBoss(false)}
                className={`group relative flex items-center justify-center rounded-3xl transition-all duration-300 ${
                  isDense ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12 sm:w-14 sm:h-14'
                } ${
                  cert
                    ? 'bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-[0_0_25px_rgba(245,158,11,1)] text-slate-950'
                    : moduleComplete
                    ? 'bg-gradient-to-b from-rose-600 via-red-600 to-orange-600 border-2 border-rose-300 shadow-[0_0_30px_rgba(239,68,68,1)] text-white animate-pulse'
                    : 'bg-slate-950/90 border-2 border-red-950 text-slate-500 opacity-75 hover:opacity-100'
                }`}
              >
                <Crown className={`${isDense ? 'w-5 h-5' : 'w-6 h-6'} ${moduleComplete || cert ? 'animate-bounce' : ''}`} />

                {/* Final Boss Banner */}
                <div className="absolute top-[calc(100%+3px)] left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase font-mono shadow-lg border bg-red-950/90 text-amber-300 border-amber-400/60 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-red-400" />
                    BOSS TRIAL
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
