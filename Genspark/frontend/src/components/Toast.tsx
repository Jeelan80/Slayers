'use client';

import { CheckCircle2, X, AlertCircle, Info } from 'lucide-react';
import type { Toast } from '@/types';

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const kindMap = {
  success: {
    icon: CheckCircle2,
    ring: 'border-[#009E7E]',
    iconColor: 'text-[#009E7E]',
  },
  error: {
    icon: AlertCircle,
    ring: 'border-rose-500',
    iconColor: 'text-rose-500',
  },
  info: {
    icon: Info,
    ring: 'border-[#009E7E]',
    iconColor: 'text-[#009E7E]',
  },
};

export default function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const cfg = kindMap[t.kind];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={`toast-anim flex items-start gap-3 bg-white ${cfg.ring} border-l-4 border-y border-r border-y-gray-100 border-r-gray-100 rounded-xl shadow-lg px-4 py-3`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
            <p className="text-sm text-[#1a1f2e] flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
