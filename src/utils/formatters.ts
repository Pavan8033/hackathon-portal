/**
 * Formatting utilities for Hackathon Portal
 */

export function formatReleaseDate(isoDate?: string): string {
  if (!isoDate) return 'Recently Released';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Recently Released';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return 'Recently Released';
  }
}

export type SupportedDocumentType = 'PDF' | 'Word' | 'Excel' | 'Other' | 'None';

export function getDocumentTypeInfo(fileName?: string, fileType?: string): {
  type: SupportedDocumentType;
  label: string;
  badgeClass: string;
  extension: string;
} {
  if (!fileName) {
    return {
      type: 'None',
      label: 'No Document',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      extension: '',
    };
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || (fileType && fileType.includes('pdf'))) {
    return {
      type: 'PDF',
      label: 'PDF Document',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      extension: 'PDF',
    };
  }

  if (
    ext === 'doc' ||
    ext === 'docx' ||
    (fileType && (fileType.includes('word') || fileType.includes('officedocument.wordprocessingml')))
  ) {
    return {
      type: 'Word',
      label: 'Word Document',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      extension: ext.toUpperCase(),
    };
  }

  if (
    ext === 'xls' ||
    ext === 'xlsx' ||
    (fileType && (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('spreadsheetml')))
  ) {
    return {
      type: 'Excel',
      label: 'Excel Spreadsheet',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      extension: ext.toUpperCase(),
    };
  }

  return {
    type: 'Other',
    label: ext ? `${ext.toUpperCase()} File` : 'Attachment',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    extension: ext.toUpperCase(),
  };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Document Attached';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function normalizeDifficulty(diff?: string): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (!diff) return 'Intermediate';
  const lower = diff.toLowerCase();
  if (lower.includes('easy') || lower.includes('begin')) return 'Beginner';
  if (lower.includes('hard') || lower.includes('adv')) return 'Advanced';
  return 'Intermediate';
}

/**
 * Mask registration number per Section 13 (e.g. "REG••••1234")
 */
export function maskRegistrationNumber(regNumber?: string): string {
  if (!regNumber || regNumber.trim().length === 0) return 'REG••••0000';
  const clean = regNumber.trim();
  if (clean.length <= 4) {
    return `REG••••${clean}`;
  }
  const prefix = clean.slice(0, 3);
  const suffix = clean.slice(-4);
  return `${prefix}••••${suffix}`;
}

/**
 * Format date & time per Section 11 & Phase 34 (Asia/Kolkata timezone)
 */
export function formatSelectionDateTime(isoString?: string): {
  date: string;
  time: string;
  combined: string;
} {
  if (!isoString) {
    return { date: 'Recently', time: '', combined: 'Recently' };
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: 'Recently', time: '', combined: 'Recently' };
    }

    const date = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    return {
      date,
      time,
      combined: `${date} • ${time} IST`,
    };
  } catch {
    return { date: 'Recently', time: '', combined: 'Recently' };
  }
}

