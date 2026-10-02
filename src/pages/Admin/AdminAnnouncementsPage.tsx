import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Megaphone,
  Edit2,
  Trash2,
  Globe,
  Archive,
  AlertTriangle,
  Clock,
  EyeOff,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AnnouncementService } from '../../services/announcementService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type {
  AnnouncementRecord,
  AnnouncementInput,
  AnnouncementPriority,
  AnnouncementStatus,
} from '../../types';

export const AdminAnnouncementsPage: React.FC = () => {
  const { admin } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementRecord | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [status, setStatus] = useState<AnnouncementStatus>('PUBLISHED');
  const [publishDate, setPublishDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Confirmation dialogs
  const [itemToDelete, setItemToDelete] = useState<AnnouncementRecord | null>(null);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data = await AnnouncementService.getAllAnnouncements({ forParticipant: false });
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();

    const unsub = AnnouncementService.subscribeToAnnouncements((live) => {
      setAnnouncements(live);
    }, { forParticipant: false });

    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setMessage('');
    setPriority('NORMAL');
    setStatus('PUBLISHED');
    setPublishDate(new Date().toISOString().split('T')[0]);
    setExpiryDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: AnnouncementRecord) => {
    setEditingItem(item);
    setTitle(item.title);
    setMessage(item.message);
    setPriority(item.priority);
    setStatus(item.status);
    setPublishDate(item.publishDate ? item.publishDate.split('T')[0] : '');
    setExpiryDate(item.expiryDate ? item.expiryDate.split('T')[0] : '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    const payload: AnnouncementInput = {
      title: title.trim(),
      message: message.trim(),
      priority,
      status,
      publishDate: publishDate ? new Date(publishDate).toISOString() : new Date().toISOString(),
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      target: 'All Teams',
    };

    try {
      if (editingItem) {
        await AnnouncementService.updateAnnouncement(editingItem.id, payload);
        await AuditService.logAction({
          action: 'ANNOUNCEMENT_PUBLISHED',
          adminId: admin?.email || 'admin',
          target: editingItem.id,
          details: `Updated announcement "${payload.title}" (${status})`,
        });
        showToast('Announcement updated successfully.', 'success');
      } else {
        const created = await AnnouncementService.createAnnouncement(payload, admin?.email || 'admin');
        await AuditService.logAction({
          action: 'ANNOUNCEMENT_CREATED',
          adminId: admin?.email || 'admin',
          target: created.id,
          details: `Created announcement "${payload.title}" (${status})`,
        });
        showToast('Announcement broadcasted to participants.', 'success');
      }
      setIsModalOpen(false);
      await loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save announcement.', 'error');
    }
  };

  const handleToggleStatus = async (item: AnnouncementRecord, newStatus: AnnouncementStatus) => {
    try {
      await AnnouncementService.updateStatus(item.id, newStatus);
      await AuditService.logAction({
        action: newStatus === 'PUBLISHED' ? 'ANNOUNCEMENT_PUBLISHED' : 'ANNOUNCEMENT_ARCHIVED',
        adminId: admin?.email || 'admin',
        target: item.id,
        details: `Changed status of announcement "${item.title}" to ${newStatus}`,
      });
      showToast(`Announcement status updated to ${newStatus}.`, 'success');
      await loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await AnnouncementService.deleteAnnouncement(itemToDelete.id);
      await AuditService.logAction({
        action: 'ANNOUNCEMENT_DELETED',
        adminId: admin?.email || 'admin',
        target: itemToDelete.id,
        details: `Deleted announcement "${itemToDelete.title}"`,
      });
      showToast('Announcement deleted permanently.', 'info');
      setItemToDelete(null);
      await loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete announcement.', 'error');
    }
  };

  return (
    <AdminLayout
      title="Organizers Broadcast & Announcements"
      description="Publish real-time announcements, timeline alerts, and schedule changes to participant portals."
      actionButton={
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          New Announcement
        </Button>
      }
    >
      {/* Priority Legend Bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-bold text-[#667085] uppercase tracking-wider text-[11px]">
            Priority Levels:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF5F0] text-[#164A36] font-semibold border border-[#D5E6DB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#164A36]" />
            NORMAL
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            IMPORTANT
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-800 font-semibold border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            URGENT
          </span>
        </div>

        <span className="text-xs font-mono text-[#667085]">
          Total: {announcements.length} records
        </span>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-[#667085] bg-white rounded-2xl border border-[#E5E7EB]">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-[#EEF5F0] text-[#164A36] flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">No Announcements Yet</h3>
            <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
              Broadcast official guidelines, timeline updates, or mentor sessions to hackathon participants.
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                Create First Announcement
              </Button>
            </div>
          </div>
        ) : (
          announcements.map((ann) => {
            const priorityBadge = {
              NORMAL: <Badge variant="subtle" size="sm">NORMAL</Badge>,
              IMPORTANT: <Badge variant="amber" size="sm">IMPORTANT</Badge>,
              URGENT: <Badge variant="forest" size="sm">URGENT</Badge>,
            }[ann.priority];

            const statusBadge = {
              PUBLISHED: <span className="text-[11px] font-bold text-[#164A36] bg-[#EEF5F0] px-2 py-0.5 rounded border border-[#D5E6DB]">LIVE</span>,
              DRAFT: <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">DRAFT</span>,
              ARCHIVED: <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">ARCHIVED</span>,
            }[ann.status];

            return (
              <div
                key={ann.id}
                className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    ann.priority === 'URGENT'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : ann.priority === 'IMPORTANT'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]'
                  }`}>
                    {ann.priority === 'URGENT' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Megaphone className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {priorityBadge}
                      {statusBadge}
                      <span className="text-xs text-[#667085] flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(ann.publishDate || ann.createdAt).toLocaleDateString()}
                      </span>
                      {ann.expiryDate && (
                        <span className="text-xs text-[#667085] flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(ann.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#111827]">{ann.title}</h3>
                    <p className="mt-2 text-sm text-[#4B5563] leading-relaxed whitespace-pre-line">
                      {ann.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => openEditModal(ann)}
                    className="p-2 rounded-lg text-[#667085] hover:text-[#164A36] hover:bg-[#EEF5F0] transition-colors"
                    title="Edit Announcement"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {ann.status === 'PUBLISHED' ? (
                    <button
                      onClick={() => handleToggleStatus(ann, 'DRAFT')}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Unpublish to Draft"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(ann, 'PUBLISHED')}
                      className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Publish Announcement"
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                  )}

                  {ann.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => handleToggleStatus(ann, 'ARCHIVED')}
                      className="p-2 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-gray-100 transition-colors"
                      title="Archive Announcement"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setItemToDelete(ann)}
                    className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[#111827]">
              {editingItem ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
            <p className="text-xs text-[#667085] mt-1">
              Broadcasted immediately to logged-in participant portals when published.
            </p>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mentor Session Schedule Announced"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                  Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter clear, concise announcement details for participants..."
                  className="w-full p-3 text-sm rounded-lg border border-[#E5E7EB] bg-[#F7F5EF]/40 text-[#111827] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AnnouncementStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  >
                    <option value="PUBLISHED">Published (Live)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#164A36]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {editingItem ? 'Save Changes' : 'Broadcast Now'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="Permanently Delete Announcement?"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be reversed.`}
        confirmText="Delete Announcement"
        isDangerous
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </AdminLayout>
  );
};
