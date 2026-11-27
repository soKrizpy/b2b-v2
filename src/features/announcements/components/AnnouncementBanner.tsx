'use client';
// src/features/announcements/components/AnnouncementBanner.tsx
// Top Banner Component for Student and Teacher Dashboards with Dismissal Persistence.

import { useState, useEffect, useCallback } from 'react';
import { Info, AlertTriangle, AlertCircle, X, Sparkles } from 'lucide-react';
import type { Announcement } from '../types';
import {
  getStoredAnnouncements,
  fetchServerAnnouncements,
  getDismissedIds,
  dismissAnnouncementId,
} from '../announcementStore';

interface AnnouncementBannerProps {
  role: 'students' | 'teachers';
}

export function AnnouncementBanner({ role }: AnnouncementBannerProps) {
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);

  const filterValid = useCallback((list: Announcement[]) => {
    const dismissed = getDismissedIds();
    const todayStr = new Date().toISOString().split('T')[0];

    return list.filter((ann) => {
      if (!ann.is_active) return false;
      if (dismissed.includes(String(ann.id))) return false;
      if (ann.target !== 'all' && ann.target !== role) return false;
      if (ann.expires_at && ann.expires_at < todayStr) return false;
      return true;
    });
  }, [role]);

  const loadAnnouncements = useCallback(() => {
    const list = getStoredAnnouncements();
    setActiveAnnouncements(filterValid(list));
  }, [filterValid]);

  useEffect(() => {
    loadAnnouncements();
    void fetchServerAnnouncements().then((serverList) => {
      setActiveAnnouncements(filterValid(serverList));
    });
    window.addEventListener('announcements_updated', loadAnnouncements);
    return () => window.removeEventListener('announcements_updated', loadAnnouncements);
  }, [loadAnnouncements, filterValid]);

  const handleDismiss = (id: string | number) => {
    dismissAnnouncementId(id);
    setActiveAnnouncements((prev) => prev.filter((a) => String(a.id) !== String(id)));
  };

  if (activeAnnouncements.length === 0) return null;

  const urgencyConfig = {
    info: {
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
      border: 'border-blue-400/50 dark:border-blue-500/40',
      icon: Info,
      label: 'Info',
    },
    warning: {
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      border: 'border-amber-400/50 dark:border-amber-500/40',
      icon: AlertTriangle,
      label: 'Peringatan',
    },
    urgent: {
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      border: 'border-rose-400/50 dark:border-rose-500/40',
      icon: AlertCircle,
      label: 'Penting',
    },
  };

  return (
    <div className="flex flex-col gap-3.5 mb-6 animate-fade-in">
      {activeAnnouncements.map((ann) => {
        const ucfg = urgencyConfig[ann.urgency] ?? urgencyConfig.info;
        const UrgencyIcon = ucfg.icon;

        return (
          <div
            key={ann.id}
            className={`bg-white dark:bg-[#0B0F19] rounded-3xl p-4 sm:p-5 border ${ucfg.border}
              shadow-sm hover:shadow-neon-blue dark:hover:shadow-neon-purple
              transition-all duration-300 relative flex flex-col sm:flex-row items-start gap-4`}
          >
            {/* Optional Banner Image */}
            {ann.image_url && (
              <div className="w-full sm:w-36 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ann.image_url}
                  alt={ann.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 pr-8 sm:pr-10">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${ucfg.badge}`}>
                  <UrgencyIcon className="w-3 h-3" />
                  <span>{ucfg.label}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  Pengumuman Resmi
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-purple-50 tracking-tight leading-snug">
                {ann.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                {ann.content}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => handleDismiss(ann.id)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-slate-100 dark:bg-white/10
                text-slate-500 hover:text-slate-900 dark:hover:text-white
                hover:bg-slate-200 dark:hover:bg-white/20 transition-all font-bold"
              aria-label="Tutup Pengumuman"
              title="Tutup & Sembunyikan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
