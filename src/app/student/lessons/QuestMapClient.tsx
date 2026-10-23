'use client';
// src/app/student/lessons/QuestMapClient.tsx
// Fantasy Island Expedition Quest Map for Bits2Bytes LMS with Fog of War.
// Nodes act as interactive clickable fantasy locations (Villages, Caves, Temples, Forests, Citadels, etc.)
// shrouded in an authentic RPG Fog of War using CSS masking and semi-transparent gradients.
// Surrounding nodes are progressively revealed as students complete adjacent topics.

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuizModal } from '@/features/quiz/components/QuizModal';
import { LevelUpCelebrationModal } from '@/features/dashboard/student/LevelUpCelebrationModal';
import { TIER_CONFIG } from '@/features/certificates/queries';
import { getFantasyLocationForTopic, type FantasyLocation } from '@/features/quiz/fantasyIsland';
import { RetroPixelWorldMap } from '@/features/quiz/components/RetroPixelWorldMap';
import { SimplifiedWaypointHistory } from '@/features/quiz/components/SimplifiedWaypointHistory';
import type { QuestMapData, QuestTopicNode, NodeStatus } from '@/features/quiz/questMapQueries';
import type { QuizQuestion } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow } from '@/types/database';
import {
  Tent,
  Mountain,
  Landmark,
  Trees,
  TowerControl,
  Flame,
  Castle,
  Sparkles,
  Crown,
  Compass,
  CheckCircle2,
  Lock,
  Play,
  Footprints,
  MapPin,
  CloudFog,
  Eye,
  BookOpen,
  X,
  History,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FogState = 'cleared' | 'revealed' | 'scouted' | 'shrouded';

interface Props {
  questData:  QuestMapData;
  cert:       { tier: string; score: number; certificate_number: string } | null;
  studentId?: string;
  allModules?: Array<{ id: number; title: string | null; topicCount: number }>;
  currentModuleId?: number;
}

type PopoverAnchor = { nodeId: number; isFinal?: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NodeStatus, { label: string; badge: string }> = {
  COMPLETED:   { label: 'Lokasi Ditaklukkan',   badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  NEEDS_QUIZ:  { label: 'Ujian Rune Terbuka!',  badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40'       },
  ACTIVE_NEXT: { label: 'Siap Dijelajahi',      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'          },
  LOCKED:      { label: 'Tertutup Kabut Perang', badge: 'bg-slate-800 text-slate-400 border-slate-700/60'          },
};

function BiomeIcon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  switch (name) {
    case 'Tent':         return <Tent className={className} />;
    case 'Mountain':     return <Mountain className={className} />;
    case 'Landmark':     return <Landmark className={className} />;
    case 'Trees':        return <Trees className={className} />;
    case 'TowerControl': return <TowerControl className={className} />;
    case 'Flame':        return <Flame className={className} />;
    case 'Castle':       return <Castle className={className} />;
    case 'Crown':        return <Crown className={className} />;
    default:             return <Sparkles className={className} />;
  }
}

// ── Location Dossier Popover Card with Fog of War Handling ────────────────────

function LocationPopoverCard({
  node,
  index,
  isFinal,
  fogState,
  prevNodeTitle,
  activeNodeTitle,
  moduleId,
  isModuleComplete,
  cert,
  onQuizClick,
  onFocusActiveNode,
  onClose,
}: {
  asModal?:          boolean;
  node:              QuestTopicNode | null;
  index:             number;
  isFinal:           boolean;
  fogState:          FogState;
  prevNodeTitle?:    string;
  activeNodeTitle?:  string;
  moduleId:          number;
  isModuleComplete:  boolean;
  cert:              { tier: string; score: number; certificate_number: string } | null;
  onQuizClick:       () => void;
  onFocusActiveNode: () => void;
  onClose:           () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const loc: FantasyLocation = getFantasyLocationForTopic(
    node?.topic.title ?? 'Ujian Akhir',
    index,
    isFinal
  );

  const renderCardWrapper = (content: React.ReactNode) => {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-sm sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-slate-950/98 border-2 border-amber-400/60 shadow-2xl shadow-cyan-950/80 p-5 sm:p-6 flex flex-col gap-3 text-left text-white animate-in zoom-in-95 duration-150 my-auto"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors z-10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          {content}
        </div>
      </div>
    );
  };

  // ── Final Boss Citadel Dossier ──
  if (isFinal) {
    return renderCardWrapper(
      <>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Crown className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 font-mono">
              Puncak Tertinggi Modul
            </span>
            <h4 className="text-sm font-black text-white truncate">
              {loc.name}
            </h4>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {loc.lore}
        </p>

        {/* Certificate Tiers Breakdown */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 text-[11px]">
          <span className="font-extrabold uppercase tracking-wide text-amber-400 text-[10px]">
            Tingkatan Sertifikat Kelulusan
          </span>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-1.5 flex flex-col items-center">
              <span className="text-sm">🏆</span>
              <span className="font-bold text-amber-300 text-[10px]">Excellent</span>
              <span className="text-[9px] text-amber-400/80 font-bold">≥ 85</span>
            </div>
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-1.5 flex flex-col items-center">
              <span className="text-sm">🥇</span>
              <span className="font-bold text-indigo-300 text-[10px]">Achievement</span>
              <span className="text-[9px] text-indigo-400/80 font-bold">≥ 75</span>
            </div>
            <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-1.5 flex flex-col items-center">
              <span className="text-sm">🥉</span>
              <span className="font-bold text-teal-300 text-[10px]">Completion</span>
              <span className="text-[9px] text-teal-400/80 font-bold">&lt; 75</span>
            </div>
          </div>
        </div>

        {cert ? (
          <div className="space-y-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>{TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG]?.medal || '🏆'}</span>
                <span>Sertifikat {TIER_CONFIG[cert.tier as keyof typeof TIER_CONFIG]?.label || cert.tier} — Nilai {cert.score}</span>
              </p>
              <p className="text-[10px] text-amber-400/80 mt-1 font-mono">
                No. Sertifikat: {cert.certificate_number}
              </p>
            </div>
            <Link
              href={`/student/assessment/${moduleId}`}
              onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
                text-xs font-black text-slate-900 bg-amber-400 hover:bg-amber-300 transition-colors"
            >
              <Crown className="w-4 h-4" />
              <span>Lihat Sertifikat Kelulusan</span>
            </Link>
          </div>
        ) : isModuleComplete ? (
          <Link
            href={`/student/assessment/${moduleId}`}
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl
              text-xs font-black text-slate-950
              bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
              hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/30
              hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>⚔️ Hadapi Bos Terakhir & Mulai Ujian Akhir!</span>
          </Link>
        ) : (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Selesaikan seluruh waypoint ekspedisi di bawah untuk membuka gerbang istana akhir.
            </p>
          </div>
        )}
      </>
    );
  }

  if (!node) return null;

  // ── Shrouded in Deep Fog of War Dossier ──
  if (fogState === 'shrouded') {
    return renderCardWrapper(
      <>
        <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
            <CloudFog className="w-5 h-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <Lock className="w-2.5 h-2.5" />
              <span>KABUT PERANG (FOG OF WAR)</span>
            </span>
            <h4 className="text-xs font-extrabold text-slate-300 truncate mt-1">
              Wilayah Belum Terpetakan #{index + 1}
            </h4>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-1.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Wilayah kepulauan ini masih diselimuti kabut tebal kuno. Kompas petualangan belum dapat menjangkau koordinat ini.
          </p>
          <div className="pt-1 border-t border-slate-800/80 text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>
              Selesaikan <strong className="text-white">{prevNodeTitle || `Lokasi #${index}`}</strong> untuk menyingkap kabut!
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onFocusActiveNode();
            onClose();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400
            hover:from-cyan-300 hover:to-blue-300 shadow-md shadow-cyan-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Lompat ke Misi Aktif ({activeNodeTitle || 'Misi'})</span>
        </button>
      </>
    );
  }

  // ── Scouted / Peripheral Mist Dossier ──
  if (fogState === 'scouted') {
    return renderCardWrapper(
      <>
        <div className="flex items-center gap-3 pb-2 border-b border-indigo-900/60">
          <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
            <Eye className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 bg-indigo-950 border border-indigo-500/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
              <Eye className="w-2.5 h-2.5" />
              <span>KABUT MENIPIS · WILAYAH TERDEKAT</span>
            </span>
            <h4 className="text-xs font-black text-white truncate mt-1">
              {node.topic.title}
            </h4>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{loc.biomeName}</span>
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {loc.lore}
          </p>
        </div>

        <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-2.5 text-[11px] text-indigo-200">
          <span className="font-semibold text-white">Syarat Pembukaan: </span>
          Tuntaskan tantangan di <strong className="text-cyan-300">{prevNodeTitle || `Lokasi #${index}`}</strong> untuk membubarkan kabut sepenuhnya.
        </div>

        <button
          type="button"
          onClick={() => {
            onFocusActiveNode();
            onClose();
          }}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-slate-950
            bg-gradient-to-r from-cyan-400 to-indigo-400
            hover:from-cyan-300 hover:to-indigo-300 shadow-md shadow-cyan-500/30
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Fokuskan ke Misi Aktif ({activeNodeTitle || 'Misi'})</span>
        </button>
      </>
    );
  }

  // ── Cleared / Revealed Standard Dossier ──
  const cfg = STATUS_CONFIG[node.status];
  const description = (node.topic.description ?? '').slice(0, 110) || loc.lore;

  return renderCardWrapper(
    <>
      {/* Header with Biome Icon */}
      <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${loc.theme.landmarkIconBg}`}>
            <BiomeIcon name={loc.lucideIcon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block ${cfg.badge}`}>
              {cfg.label}
            </span>
            <p className="text-xs font-black text-white truncate mt-0.5">
              {node.topic.title}
            </p>
          </div>
        </div>

        {node.status === 'COMPLETED' && node.bestScore > 0 && (
          <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
            {node.bestScore}%
          </span>
        )}
      </div>

      {/* Lore & Topic Description */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-amber-400/90 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{loc.biomeName}</span>
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Challenges & Stars Details */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1 font-medium">
          {node.topic.challenge_count > 0 ? (
            <span>{node.topic.challenge_count} Tantangan Belajar</span>
          ) : (
            <span>Materi Interaktif</span>
          )}
        </div>

        {node.status === 'COMPLETED' && (
          <div className="flex gap-0.5 text-amber-400 text-xs">
            <span>★</span><span>★</span><span>★</span>
          </div>
        )}
      </div>

      {/* ── 1. Materi Belajar (Selalu Dapat Diakses Terlebih Dahulu) ── */}
      <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
        <Link
          href={`/student/lessons/topic/${node.topic.id}`}
          onClick={onClose}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
            text-xs font-black text-white
            bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600
            hover:from-cyan-500 hover:to-violet-500 shadow-md shadow-indigo-950/40
            hover:scale-[1.02] active:scale-95 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{node.status === 'COMPLETED' ? 'Pelajari Kembali Materi' : '📖 Buka & Pelajari Materi'}</span>
        </Link>

        {/* ── 2. Kuis Pemahaman (Unlocked jika guru sudah submit laporan) ── */}
        {node.hasQuiz && (
          <div className="space-y-1.5">
            {node.status === 'COMPLETED' ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Kuis Selesai ({node.bestScore}%)</span>
                </div>
                {node.attemptsUsed < 2 && (
                  <button
                    type="button"
                    onClick={() => { onQuizClick(); onClose(); }}
                    className="text-emerald-400 hover:text-emerald-200 underline font-semibold text-[10px]"
                  >
                    Ulangi Kuis
                  </button>
                )}
              </div>
            ) : node.quizUnlocked ? (
              <div className="space-y-1.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10.5px] text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Laporan guru terbit! Kuis pemahaman terbuka.</span>
                </div>
                <button
                  type="button"
                  onClick={() => { onQuizClick(); onClose(); }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl
                    text-xs font-black text-slate-950
                    bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
                    hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/30
                    hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{node.attemptsUsed === 1 ? 'Ulangi Kuis Topik' : 'Mulai Kuis Pemahaman Topik!'}</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10.5px] space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400/90 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kuis Terkunci (Menunggu Laporan Guru)</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Pelajari materinya terlebih dahulu. Kuis akan terbuka otomatis setelah guru menyelesaikan pertemuan #{node.sessionNumber} dan mengirimkan laporan kelas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Informasi Progres Pertemuan ── */}
        <p className="text-[10px] text-center text-slate-400/80 pt-1 font-medium">
          {node.status === 'COMPLETED'
            ? '✨ Topik berikutnya terbuka di pertemuan selanjutnya.'
            : `📍 Pertemuan #${node.sessionNumber}`}
        </p>
      </div>
    </>
  );
}

// ── QuestMapClient Root Component ─────────────────────────────────────────────

export function QuestMapClient({ questData, cert, allModules, currentModuleId }: Props) {
  const router = useRouter();

  const [quizNode, setQuizNode]       = useState<QuestTopicNode | null>(null);
  const [popover, setPopover]         = useState<PopoverAnchor | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [viewMode, setViewMode]       = useState<'map' | 'history'>('map');

  const { mod, nodes, moduleComplete, hasFinal } = questData;

  // Deduplicate nodes by topic id
  const uniqueNodes = Array.from(
    new Map(nodes.map((n) => [n.topic.id, n])).values()
  );

  // Compute completed streak & frontier
  let highestCompletedIdx = -1;
  for (let i = 0; i < uniqueNodes.length; i++) {
    if (uniqueNodes[i].status === 'COMPLETED') {
      highestCompletedIdx = i;
    }
  }

  // Active frontier node (the one the student is currently working on)
  const activeNode = uniqueNodes.find(
    (n) => n.status === 'NEEDS_QUIZ' || n.status === 'ACTIVE_NEXT'
  ) ?? uniqueNodes[0];

  const lastTopicNode = uniqueNodes[uniqueNodes.length - 1];

  // Helper to determine fog state for any node index
  const getFogState = useCallback((index: number, isFinalNode = false): FogState => {
    if (isFinalNode) {
      if (moduleComplete) return cert ? 'cleared' : 'revealed';
      if (highestCompletedIdx >= uniqueNodes.length - 2) return 'scouted';
      return 'shrouded';
    }

    const n = uniqueNodes[index];
    if (!n) return 'shrouded';

    if (n.status === 'COMPLETED') return 'cleared';
    if (n.status === 'ACTIVE_NEXT' || n.status === 'NEEDS_QUIZ') return 'revealed';

    // For locked nodes: if it's within 1 step of the completed streak or active frontier
    if (index <= highestCompletedIdx + 2) {
      return 'scouted';
    }

    return 'shrouded';
  }, [uniqueNodes, moduleComplete, cert, highestCompletedIdx]);

  const completedCount = uniqueNodes.filter((n) => n.status === 'COMPLETED').length;
  const clearedOrRevealedCount = uniqueNodes.filter((_, idx) => {
    const state = getFogState(idx);
    return state === 'cleared' || state === 'revealed';
  }).length + (hasFinal && (moduleComplete) ? 1 : 0);

  const totalLocations = uniqueNodes.length + (hasFinal ? 1 : 0);
  const totalStarsEarned = uniqueNodes.reduce((acc, curr) => acc + (curr.status === 'COMPLETED' ? (curr.stars || 3) : 0), 0);
  const explorationPct = Math.round((completedCount / (uniqueNodes.length || 1)) * 100);
  const fogClearedPct = Math.round((clearedOrRevealedCount / (totalLocations || 1)) * 100);

  const handleQuizComplete = useCallback(() => {
    setQuizNode(null);
    setPopover(null);
    setShowCelebration(true);
    router.refresh();
  }, [router]);

  const openQuiz = useCallback((node: QuestTopicNode) => {
    setQuizNode(node);
    setPopover(null);
  }, []);

  const FINAL_ID = -1;

  if (mod.topics.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 italic py-12
        bg-slate-900/40 rounded-3xl border border-slate-800 mx-4">
        Belum ada kepulauan atau topik yang dipublikasikan untuk modul ini.
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden
      bg-gradient-to-b from-slate-950 via-[#0a1426] to-[#070d18]
      border border-cyan-500/30 shadow-2xl p-5 sm:p-8 space-y-8 text-white">

      {/* ── Ambient Fog of War Cloud Canvas (CSS Masking & Semi-Transparent Gradients) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

        {/* Dynamic rolling fog layers using CSS masks and semi-transparent gradients */}
        <div
          className="absolute -top-16 -right-16 w-96 h-96 bg-gradient-to-br from-slate-700/25 via-slate-800/35 to-transparent rounded-full blur-3xl animate-fog-slow"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          }}
        />
        <div
          className="absolute bottom-0 -left-16 w-96 h-96 bg-gradient-to-tr from-cyan-950/30 via-slate-900/40 to-transparent rounded-full blur-3xl animate-fog-slow"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-64 bg-slate-800/10 rounded-full blur-3xl animate-fog-wisp"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Multi-Module Selector (jika siswa terdaftar di beberapa modul) ── */}
      {allModules && allModules.length > 1 && (
        <div className="relative z-10 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none shadow-md">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 whitespace-nowrap pl-1">
            Pilih Modul:
          </span>
          {allModules.map((m) => (
            <Link
              key={m.id}
              href={`/student/lessons?moduleId=${m.id}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                m.id === (currentModuleId ?? mod.id)
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <span>{m.title}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] font-mono">
                {m.topicCount} Topik
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Fantasy Island Explorer Header ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 font-mono">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              KEPULAUAN KODE · REALM OF BITS2BYTES
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Peta Ekspedisi {mod.title}</span>
            <span className="text-xl">🏝️</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selesaikan tiap lokasi untuk menyingkap kabut perang (Fog of War) dan membuka jalur pulau berikutnya.
          </p>
        </div>

        {/* Expedition Metrics, Mode Selector & Fog Gauge Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Switcher: MAP vs Riwayat */}
          <div className="p-1 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex items-center gap-1 shadow-lg shadow-cyan-950/40">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'map'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Tampilan Peta Eksplorasi (MAP)"
            >
              <Compass className="w-4 h-4" />
              <span>MAP</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'history'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Tampilan Riwayat Pembelajaran (Waypoints)"
            >
              <History className="w-4 h-4" />
              <span>Riwayat</span>
            </button>
          </div>

          {/* Fog Cleared Gauge */}
          <div className="rounded-2xl bg-indigo-950/60 border border-indigo-500/40 px-3.5 py-2 flex items-center gap-2.5 shadow-md shadow-indigo-950/40">
            <CloudFog className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Tabir Kabut</p>
              <p className="text-xs font-black text-cyan-300 font-mono">
                {clearedOrRevealedCount}/{totalLocations} Bebas Kabut ({fogClearedPct}%)
              </p>
            </div>
          </div>

          {/* ── Ditaklukkan & Kemajuan Terpadu ── */}
          <div className="rounded-2xl bg-gradient-to-r from-cyan-950/70 via-sky-950/50 to-indigo-950/70 border border-cyan-500/40 px-3.5 py-2 flex items-center gap-3 shadow-md shadow-cyan-950/40 min-w-[170px]">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 flex-shrink-0">
              {moduleComplete ? <Crown className="w-4 h-4 text-amber-400 animate-bounce" /> : <Footprints className="w-4 h-4 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ditaklukkan</p>
                <span className="text-xs font-black text-cyan-300 font-mono">{explorationPct}%</span>
              </div>
              <p className="text-xs font-black text-white font-mono leading-tight">
                {completedCount}/{totalLocations} Lokasi {moduleComplete && '· Tuntas 🏆'}
              </p>
              {/* Integrated mini progress track */}
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 border border-cyan-500/30">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, explorationPct))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-amber-950/40 border border-amber-500/30 px-3.5 py-2 flex items-center gap-2.5">
            <span className="text-base">⭐</span>
            <div>
              <p className="text-[10px] text-amber-400/80 font-bold uppercase">Bintang</p>
              <p className="text-xs font-black text-amber-300 font-mono">
                {totalStarsEarned} ★ Diraih
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── View 1: MAP Mode ── */}
      {viewMode === 'map' && (
        <div className="relative z-10 w-full animate-in fade-in duration-200">
          <RetroPixelWorldMap
            moduleTitle={mod.title || 'Modul'}
            moduleLevel={mod.level}
            nodes={uniqueNodes}
            activeNode={activeNode}
            moduleComplete={moduleComplete}
            hasFinal={hasFinal}
            cert={cert}
            selectedNodeId={popover?.isFinal ? FINAL_ID : popover?.nodeId ?? null}
            onSelectNode={(node) => setPopover({ nodeId: node.topic.id, isFinal: false })}
            onSelectFinalBoss={() => setPopover({ nodeId: FINAL_ID, isFinal: true })}
          />

          {/* Modal Popover Dossier when a node or boss is clicked in MAP */}
          {popover && (() => {
            if (popover.isFinal) {
              const finalFogState = getFogState(uniqueNodes.length, true);
              return (
                <LocationPopoverCard
                  asModal
                  node={null}
                  index={uniqueNodes.length}
                  isFinal
                  fogState={finalFogState}
                  prevNodeTitle={lastTopicNode?.topic.title}
                  activeNodeTitle={activeNode?.topic.title}
                  moduleId={mod.id}
                  isModuleComplete={moduleComplete}
                  cert={cert}
                  onQuizClick={() => {}}
                  onFocusActiveNode={() => activeNode && setPopover({ nodeId: activeNode.topic.id, isFinal: false })}
                  onClose={() => setPopover(null)}
                />
              );
            }
            const selectedNode = uniqueNodes.find((n) => n.topic.id === popover.nodeId);
            if (!selectedNode) return null;
            const selectedIdx = uniqueNodes.indexOf(selectedNode);
            const fogState = getFogState(selectedIdx);
            const prevNodeTitle = selectedIdx > 0 ? uniqueNodes[selectedIdx - 1]?.topic.title : undefined;

            return (
              <LocationPopoverCard
                asModal
                node={selectedNode}
                index={selectedIdx}
                isFinal={false}
                fogState={fogState}
                prevNodeTitle={prevNodeTitle}
                activeNodeTitle={activeNode?.topic.title}
                moduleId={mod.id}
                isModuleComplete={moduleComplete}
                cert={cert}
                onQuizClick={() => {
                  if (selectedNode.quizUnlocked && selectedNode.attemptsUsed < 2) {
                    setQuizNode(selectedNode);
                  }
                }}
                onFocusActiveNode={() => activeNode && setPopover({ nodeId: activeNode.topic.id, isFinal: false })}
                onClose={() => setPopover(null)}
              />
            );
          })()}
        </div>
      )}

      {/* ── View 2: Simplified Waypoint History Mode ── */}
      {viewMode === 'history' && (
        <SimplifiedWaypointHistory
          moduleTitle={mod.title || 'Modul'}
          moduleId={mod.id}
          nodes={uniqueNodes}
          activeNode={activeNode}
          moduleComplete={moduleComplete}
          hasFinal={hasFinal}
          cert={cert}
          onOpenQuiz={openQuiz}
          onSelectFinalBoss={() => setPopover({ nodeId: FINAL_ID, isFinal: true })}
        />
      )}

      {/* ── Quiz Modal Trigger ── */}
      {quizNode && (
        <QuizModal
          topicId={quizNode.topic.id}
          topicTitle={quizNode.topic.title}
          questions={
            Array.isArray(
              (quizNode.topic.lesson_content as Record<string, unknown> | null)?.quiz
            )
              ? ((quizNode.topic.lesson_content as Record<string, unknown>).quiz as QuizQuestion[])
              : ([] as QuizQuestion[])
          }
          attempts={[] as TopicQuizAttemptRow[]}
          isUnlocked
          isLocked={quizNode.attemptsUsed >= 2}
          bestScore={quizNode.bestScore}
          onClose={() => setQuizNode(null)}
          onComplete={handleQuizComplete}
        />
      )}

      {/* ── Level Up Celebration Modal ── */}
      <LevelUpCelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        level={Math.max(2, Math.floor(uniqueNodes.filter((n) => n.status === 'COMPLETED').length / 2) + 1)}
        totalXp={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 40}
        coins={uniqueNodes.filter((n) => n.status === 'COMPLETED').length * 15}
      />
    </div>
  );
}
