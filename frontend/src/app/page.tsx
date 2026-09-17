'use client';

import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Sliders,
  Zap,
  Sparkles,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { VerificationForm, FormValues } from '@/components/VerificationForm';
import { AuditQueue } from '@/components/AuditQueue';
import { DemoScenarios } from '@/components/DemoScenarios';
import { PresetScenario } from '@/types';

type ActiveTab = 'flow' | 'audit' | 'scenarios';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flow');
  const [preloadedValues, setPreloadedValues] = useState<FormValues | undefined>(undefined);
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null);
  const [dbVersion, setDbVersion] = useState(0);

  // When a scenario is preloaded from Tab 3
  const handleLoadScenario = (scenario: PresetScenario, cardFile: File) => {
    setPreloadedValues({
      name: scenario.data.name,
      dob: scenario.data.dob,
      idNumber: scenario.data.idNumber,
      institution: scenario.data.institution,
      idType: scenario.data.idType,
      minAge: scenario.data.minAge,
      eventDate: scenario.data.eventDate,
    });
    setPreloadedFile(cardFile);
    setActiveTab('flow');
  };

  // When user clicks "Verify Instantly" from Tab 3
  const handleInstantVerify = async (scenario: PresetScenario, cardFile: File) => {
    setPreloadedValues({
      name: scenario.data.name,
      dob: scenario.data.dob,
      idNumber: scenario.data.idNumber,
      institution: scenario.data.institution,
      idType: scenario.data.idType,
      minAge: scenario.data.minAge,
      eventDate: scenario.data.eventDate,
    });
    setPreloadedFile(cardFile);
    setActiveTab('flow');
  };

  const handleDbReset = () => {
    setDbVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header onDbReset={handleDbReset} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full sm:w-auto shadow-inner">
            {/* Tab 1: Verification Flow */}
            <button
              onClick={() => setActiveTab('flow')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'flow'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileCheck className="h-4 w-4" />
              <span>Participant Verification Flow</span>
            </button>

            {/* Tab 2: Organizer Audit Queue */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Organizer Audit Queue</span>
            </button>

            {/* Tab 3: Demo Scenarios */}
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'scenarios'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Test Scenarios & Demo Suite</span>
            </button>
          </div>

          {/* Quick Context Hint */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Multi-Gate AI Verification Engine Active</span>
          </div>
        </div>

        {/* Tab 1 Content: Participant Verification Flow */}
        {activeTab === 'flow' && (
          <div className="animate-in fade-in duration-300">
            <VerificationForm
              key={`form-${preloadedValues?.name || 'default'}-${preloadedFile?.name || 'none'}`}
              initialValues={preloadedValues}
              initialFile={preloadedFile}
              onNavigateToAudit={() => setActiveTab('audit')}
            />
          </div>
        )}

        {/* Tab 2 Content: Organizer Audit Queue */}
        {activeTab === 'audit' && (
          <div className="animate-in fade-in duration-300">
            <AuditQueue key={`audit-${dbVersion}`} />
          </div>
        )}

        {/* Tab 3 Content: Demo Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="animate-in fade-in duration-300">
            <DemoScenarios
              onLoadScenario={handleLoadScenario}
              onInstantVerify={handleInstantVerify}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b13] py-5 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-300">VeriForge</span> by{' '}
            <span className="text-cyan-400 font-medium">Team Slayers</span> · Hackingly AI Build Challenge (PS-003)
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Core</span>
            <span>•</span>
            <span>AWS Textract Queries</span>
            <span>•</span>
            <span>Error Level Analysis (ELA)</span>
            <span>•</span>
            <span>DQVC QR Cross-Check</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
