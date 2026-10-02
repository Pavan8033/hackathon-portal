import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl max-w-md w-full p-6 sm:p-7 relative overflow-hidden">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isDangerous
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-[#EEF5F0] text-[#164A36] border border-[#D5E6DB]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-lg font-bold text-[#111827] tracking-tight">
              {title}
            </h3>
            <p className="mt-2 text-sm text-[#667085] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#F3F4F6] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={isDangerous ? 'primary' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            className={isDangerous ? '!bg-rose-600 hover:!bg-rose-700 !border-rose-600' : ''}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
