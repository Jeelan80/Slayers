'use client';

import React from 'react';
import { HackinglyLogo } from './HackinglyLogo';
import { UserProfile } from './HackinglyAuthModal';
import { LogOut, CheckCircle2, GraduationCap } from 'lucide-react';

interface HackinglyNavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  activeView: 'verify' | 'audit' | 'scenarios';
  onSelectView: (view: 'verify' | 'audit' | 'scenarios') => void;
  isStudentVerified?: boolean;
  onOpenStudentWizard?: () => void;
}

export function HackinglyNavbar({
  user,
  onOpenAuth,
  onSignOut,
  activeView,
  onSelectView,
  isStudentVerified = false,
  onOpenStudentWizard,
}: HackinglyNavbarProps) {
  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hackingly Logo */}
        <div
          onClick={() => onSelectView('verify')}
          className="cursor-pointer transition-opacity hover:opacity-90"
        >
          <HackinglyLogo size="md" />
        </div>

        {/* Center: Floating Pill Navigation (Matching screenshot) */}
        <nav className="hidden md:flex items-center px-6 py-2 rounded-full bg-white border border-[#ECECEC] shadow-xs">
          <ul className="flex items-center gap-7 text-sm font-medium text-[#14161A]">
            <li>
              <button
                onClick={() => onSelectView('verify')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'verify'
                    ? 'text-[#12805F] font-semibold'
                    : 'text-[#14161A] hover:text-[#12805F]'
                }`}
              >
                Verification Flow
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectView('audit')}
                className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'audit'
                    ? 'text-[#12805F] font-semibold'
                    : 'text-[#14161A] hover:text-[#12805F]'
                }`}
              >
                <span>Organizer Queue</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectView('scenarios')}
                className={`transition-colors cursor-pointer ${
                  activeView === 'scenarios'
                    ? 'text-[#12805F] font-semibold'
                    : 'text-[#14161A] hover:text-[#12805F]'
                }`}
              >
                Demo Scenarios
              </button>
            </li>
            <li className="h-4 w-px bg-[#ECECEC]" />
            <li>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#DFF3E1] text-[#12805F]">
                CodeX 3.0 Live
              </span>
            </li>
          </ul>
        </nav>

        {/* Right: User Identity Block, Verify Button & Sign In Pill */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Student Verification Badge / Button */}
              {isStudentVerified ? (
                <div className="hidden sm:flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#DFF3E1] border border-[#B7E4C7] text-xs font-semibold text-[#12805F]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Student Verified</span>
                </div>
              ) : onOpenStudentWizard ? (
                <button
                  onClick={onOpenStudentWizard}
                  className="py-1.5 px-3.5 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Verify Student Status</span>
                </button>
              ) : null}

              {/* Circular Initials Avatar */}
              <div className="w-10 h-10 rounded-full border border-[#14161A] flex items-center justify-center text-sm font-bold text-[#14161A] bg-white select-none">
                {user.avatarText || 'MM'}
              </div>

              {/* Two-Line Identity Block (Bold name / Muted role) */}
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-[#14161A] tracking-tight uppercase">
                  {user.name}
                </span>
                <span className="text-[11px] font-medium text-[#9AA1AC]">
                  {user.institution || 'PESU-EC-B.Tech 2023'}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="py-2 px-5 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs sm:text-sm font-semibold tracking-tight transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav bar pills */}
      <div className="flex md:hidden items-center justify-center gap-2 mt-3 pt-2 border-t border-[#ECECEC]">
        <button
          onClick={() => onSelectView('verify')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            activeView === 'verify' ? 'bg-[#12805F] text-white' : 'text-[#5B6270] bg-slate-100'
          }`}
        >
          Verify
        </button>
        <button
          onClick={() => onSelectView('audit')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            activeView === 'audit' ? 'bg-[#12805F] text-white' : 'text-[#5B6270] bg-slate-100'
          }`}
        >
          Audit Queue
        </button>
        <button
          onClick={() => onSelectView('scenarios')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            activeView === 'scenarios' ? 'bg-[#12805F] text-white' : 'text-[#5B6270] bg-slate-100'
          }`}
        >
          Scenarios
        </button>
      </div>
    </header>
  );
}
