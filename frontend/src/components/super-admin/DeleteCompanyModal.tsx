import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteCompanyModalProps {
  isOpen: boolean;
  companyName: string;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteCompanyModal = ({
  isOpen,
  companyName,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteCompanyModalProps) => {
  const [confirmation, setConfirmation] = useState('');

  // Reset confirmation when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmation('');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    onClose();
  }, [isDeleting, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isConfirmed = confirmation === companyName;

  const handleConfirm = () => {
    if (!isConfirmed || isDeleting) return;
    onConfirm();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-slate-900">
                Delete company permanently?
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Danger list */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-3">
              The following data will be permanently deleted:
            </p>
            <ul className="space-y-1.5" aria-label="Data that will be deleted">
              {[
                'Company account and users',
                'Leads and clients',
                'Quotations and deals',
                'Invoices and payments',
                'Activities and tasks',
                'Documents and notifications',
                'Settings and CRM configuration',
                'Complete tenant PostgreSQL database',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation input */}
          <div>
            <label
              htmlFor="delete-confirmation"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Type{' '}
              <span className="font-bold text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                {companyName}
              </span>{' '}
              to confirm
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={isDeleting}
              placeholder={companyName}
              autoComplete="off"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {confirmation.length > 0 && !isConfirmed && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">
                Name does not match exactly. Please check for spaces or capitalization.
              </p>
            )}
          </div>

          {/* API error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
            aria-label={`Delete ${companyName} permanently`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCompanyModal;