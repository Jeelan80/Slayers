'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ScanEye,
  Layers,
  Type,
  FileCheck2,
} from 'lucide-react';
import { TamperingAnalysis, TamperingCheckItem } from '../types';

interface TamperingAnalysisWidgetProps {
  analysis?: TamperingAnalysis;
  compact?: boolean;
}

export function TamperingAnalysisWidget({
  analysis,
  compact = false,
}: TamperingAnalysisWidgetProps) {
  if (!analysis) return null;

  const checks = analysis.checks || {};
  const risk = analysis.risk_level || 'LOW';

  const checkList: { key: string; item?: TamperingCheckItem; icon: any }[] = [
    { key: 'copy_move', item: checks.copy_move, icon: Layers },
    { key: 'compression', item: checks.compression, icon: ScanEye },
    { key: 'text_alignment', item: checks.text_alignment, icon: Type },
    { key: 'font_consistency', item: checks.font_consistency, icon: Type },
    { key: 'ocr_confidence', item: checks.ocr_confidence, icon: FileCheck2 },
    { key: 'splicing', item: checks.splicing, icon: Layers },
    { key: 'noise_edge', item: checks.noise_edge, icon: ScanEye },
    { key: 'text_geometry', item: checks.text_geometry, icon: Type },
  ];

  const getStatusIcon = (status?: string) => {
    if (status === 'FLAGGED') {
      return <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />;
    }
    if (status === 'SUSPICIOUS') {
      return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
  };

  const getStatusBadge = (status?: string, label?: string) => {
    if (status === 'FLAGGED') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {label || 'Anomaly detected'}
        </span>
      );
    }
    if (status === 'SUSPICIOUS') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {label || 'Suspicious'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        {label || 'Consistent'}
      </span>
    );
  };

  const riskBadgeConfig = {
    LOW: {
      label: 'Document Risk: LOW',
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
    },
    MEDIUM: {
      label: 'Document Risk: MEDIUM',
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: ShieldAlert,
      iconColor: 'text-amber-600',
    },
    HIGH: {
      label: 'Document Risk: HIGH',
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: ShieldX,
      iconColor: 'text-rose-600',
    },
  }[risk];

  const RiskIcon = riskBadgeConfig.icon;

  return (
    <div className="w-full rounded-2xl bg-white border border-[#E2E8F0] shadow-xs overflow-hidden text-[#0F172A]">
      {/* Header */}
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanEye className="w-4 h-4 text-[#0EA5E9]" />
          <span className="text-xs font-bold tracking-wide uppercase text-[#334155]">
            Tampering Analysis
          </span>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${riskBadgeConfig.bg}`}
        >
          <RiskIcon className={`w-3.5 h-3.5 ${riskBadgeConfig.iconColor}`} />
          <span>{riskBadgeConfig.label}</span>
        </div>
      </div>

      {/* Checks Grid / Table */}
      <div className="divide-y divide-slate-100 text-xs">
        {checkList.map(({ key, item }) => {
          if (!item) return null;
          return (
            <div
              key={key}
              className="px-4 py-2 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className="font-medium text-[#1E293B]">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item.status, item.display_label)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      {!compact && analysis.summary && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
          <span>{analysis.summary}</span>
          <span className="font-mono text-[10px] text-slate-400">
            Risk Index: {Math.round(analysis.risk_score * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
