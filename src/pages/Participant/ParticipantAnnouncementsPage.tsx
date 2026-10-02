import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/Badge';
import { AnnouncementService } from '../../services/announcementService';
import type { AnnouncementRecord } from '../../types';

export const ParticipantAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const list = await AnnouncementService.getAllAnnouncements({ forParticipant: true });
        setAnnouncements(list);
      } catch (err) {
        console.error('Failed to load announcements for participant:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const unsub = AnnouncementService.subscribeToAnnouncements((live) => {
      setAnnouncements(live);
    }, { forParticipant: true });

    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EF]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs text-[#667085]">
          <Link to="/participant" className="hover:text-[#164A36]">Dashboard</Link>
          <span>/</span>
          <span className="text-[#111827] font-semibold">Announcements</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E5E7EB]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF5F0] text-[#164A36] text-xs font-bold tracking-wide uppercase border border-[#D5E6DB] mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              Official Broadcasts
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight uppercase">
              ORGANIZER ANNOUNCEMENTS
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              Real-time schedule notices, mentorship room assignments, and submission deadlines.
            </p>
          </div>

          <Link
            to="/participant"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#164A36] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-16 text-center text-sm text-[#667085] bg-white rounded-2xl border border-[#E5E7EB]">
            Loading official announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">No announcements yet.</h3>
            <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
              Updates from the organizers will appear here. Check back periodically during the hackathon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const isUrgent = ann.priority === 'URGENT';
              const isImportant = ann.priority === 'IMPORTANT';

              return (
                <div
                  key={ann.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-50/50 border-rose-200 shadow-xs'
                      : isImportant
                      ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                      : 'bg-white border-[#E5E7EB] shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isUrgent
                        ? 'bg-rose-100 text-rose-700'
                        : isImportant
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-[#EEF5F0] text-[#164A36]'
                    }`}>
                      {isUrgent ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isImportant ? (
                        <Info className="w-5 h-5" />
                      ) : (
                        <Megaphone className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {isUrgent ? (
                          <Badge variant="forest" size="sm">URGENT NOTICE</Badge>
                        ) : isImportant ? (
                          <Badge variant="amber" size="sm">IMPORTANT</Badge>
                        ) : (
                          <Badge variant="subtle" size="sm">ANNOUNCEMENT</Badge>
                        )}

                        <span className="text-xs text-[#667085] flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {new Date(ann.publishDate || ann.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#111827]">
                        {ann.title}
                      </h3>

                      <p className="mt-2 text-sm text-[#374151] leading-relaxed whitespace-pre-line">
                        {ann.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
