import React from 'react';
import { createPortal } from 'react-dom';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onLoginAgain: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onLoginAgain,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        {/* Header Icon & Visual Accent */}
        <div className="bg-[#003884] px-6 py-5 flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 id="session-expired-title" className="text-base font-bold text-white tracking-tight">
              Session Expired
            </h3>
            <p className="text-xs text-blue-100">Authentication Required</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-900 text-sm leading-relaxed flex items-start gap-2.5">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-950">
                Your session token has expired.
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Your 30-day security window or refresh cycle has ended. Please log in again to continue accessing your CRM securely.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            For your security and data protection, sessions expire automatically. Any unsaved changes may require re-submitting.
          </p>

          {/* Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onLoginAgain}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#003884] hover:bg-[#002860] active:scale-98 transition rounded-lg shadow-sm cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              <span>Login Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

