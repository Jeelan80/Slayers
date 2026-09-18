'use client';

import React, { useState, useEffect } from 'react';
import { HackinglyNavbar } from '@/components/HackinglyNavbar';
import { HackinglyAuthModal, UserProfile } from '@/components/HackinglyAuthModal';
import { StudentVerificationWizard } from '@/components/StudentVerificationWizard';
import { HeroHoneycomb } from '@/components/HeroHoneycomb';
import { VerificationForm } from '@/components/VerificationForm';
import { AuditQueue } from '@/components/AuditQueue';
import { DemoScenarios } from '@/components/DemoScenarios';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle2, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState<'verify' | 'audit' | 'scenarios'>('verify');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isStudentWizardOpen, setIsStudentWizardOpen] = useState(false);
  const [isStudentVerified, setIsStudentVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>({
    name: 'MOHAMMED MUSHARRAF',
    email: 'pes2ug23cs915@pes.edu',
    institution: 'PESU-EC-B.Tech 2023',
    avatarText: 'MM',
  });

  // Check Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const u = data.session.user;
          const meta = u.user_metadata || {};
          const fullName = meta.full_name || meta.name || u.email?.split('@')[0] || 'User';
          setCurrentUser({
            name: fullName.toUpperCase(),
            email: u.email || '',
            institution: meta.institution || 'PESU-EC-B.Tech 2023',
            avatarText: fullName.slice(0, 2).toUpperCase(),
          });
        }
      } catch (err) {
        console.warn('Supabase auth session check:', err);
      }
    };
    checkSession();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setIsStudentVerified(false);
  };

  const handleStudentVerified = (result: any) => {
    setIsStudentVerified(true);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: result.name || currentUser.name,
        institution: result.institution || currentUser.institution,
      });
    }
  };

  const scrollToVerification = () => {
    setActiveView('verify');
    const el = document.getElementById('verification-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#14161A] flex flex-col selection:bg-[#12805F]/15 selection:text-[#12805F] hackingly-bg-grid">
      {/* Floating Navbar (Matching screenshot) */}
      <HackinglyNavbar
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        isStudentVerified={isStudentVerified}
        onOpenStudentWizard={() => setIsStudentWizardOpen(true)}
      />

      {/* Auth Modal */}
      <HackinglyAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setCurrentUser(u);
        }}
      />

      {/* Dedicated Multi-Step Student Verification Wizard */}
      <StudentVerificationWizard
        isOpen={isStudentWizardOpen}
        onClose={() => setIsStudentWizardOpen(false)}
        onVerificationComplete={handleStudentVerified}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-12">
        {activeView === 'verify' && (
          <>
            {/* Authentic Hero Section from hackingly.in */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center pt-2 pb-6">
              {/* Left Column: Two-Tone Typography & CTA */}
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFF3E1] text-[#12805F] text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#12805F] animate-pulse" />
                  <span>AI Verification Layer · Hackingly PS-003</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.12] text-[#14161A]">
                  One Platform,
                  <br />
                  <span className="text-[#12805F]">Endless Unique Opportunities!</span>
                </h1>

                <p className="text-base sm:text-lg text-[#5B6270] leading-relaxed max-w-xl font-normal">
                  Step into a world of limitless opportunities! Learn from best, organize hackathons, showcase skills, explore courses, and connect with your dream company.
                </p>

                {/* Event Eligibility Callout Box */}
                <div className="p-4 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA] max-w-xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-[#14161A] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#12805F]" />
                      CodeX 3.0 Bengaluru Hackathon
                    </span>
                    <span className="text-[11px] font-semibold text-[#9AA1AC]">
                      Student-Only Event
                    </span>
                  </div>

                  {isStudentVerified ? (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[#12805F] font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        You are a Verified Student! Eligible for CodeX 3.0.
                      </span>
                      <span className="text-[11px] text-[#9AA1AC] font-mono">
                        Registration Active
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#5B6270]">
                        Only legitimate students can register for this hackathon.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            setIsAuthModalOpen(true);
                          } else {
                            setIsStudentWizardOpen(true);
                          }
                        }}
                        className="py-1.5 px-4 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold shadow-xs cursor-pointer flex-shrink-0"
                      >
                        Verify Student Status
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {/* Primary Teal Pill Button */}
                  <button
                    onClick={scrollToVerification}
                    className="py-3.5 px-8 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-base font-semibold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-2"
                  >
                    <span>Verify Any ID Document</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveView('scenarios')}
                    className="py-3.5 px-6 rounded-full border border-[#D5D8DF] hover:bg-slate-50 text-sm font-semibold text-[#14161A] transition-colors cursor-pointer"
                  >
                    Explore Demo Suite
                  </button>
                </div>
              </div>

              {/* Right Column: Pastel Honeycomb Illustration Motif */}
              <div className="lg:col-span-6 flex justify-center">
                <HeroHoneycomb />
              </div>
            </section>

            {/* Verification Form Section */}
            <section id="verification-section" className="pt-6 border-t border-[#ECECEC]">
              <VerificationForm
                user={currentUser}
                onNavigateToAudit={() => setActiveView('audit')}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            </section>
          </>
        )}

        {/* View 2: Organizer Audit Queue */}
        {activeView === 'audit' && (
          <section className="pt-2">
            <AuditQueue />
          </section>
        )}

        {/* View 3: Demo Scenarios */}
        {activeView === 'scenarios' && (
          <section className="pt-2">
            <DemoScenarios
              onLoadScenario={() => {
                setActiveView('verify');
                scrollToVerification();
              }}
              onInstantVerify={() => {
                setActiveView('verify');
                scrollToVerification();
              }}
            />
          </section>
        )}
      </main>

      {/* Floating Bottom-Right Black Pill: "Request Demo" (From Screenshot) */}
      <aside className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            if (!currentUser) {
              setIsAuthModalOpen(true);
            } else {
              setIsStudentWizardOpen(true);
            }
          }}
          className="py-3 px-6 rounded-full bg-[#101114] hover:bg-black text-white text-sm font-semibold tracking-tight shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
        >
          <span>Verify Student Status</span>
        </button>
      </aside>

      {/* Clean Minimalist Footer */}
      <footer className="w-full border-t border-[#ECECEC] bg-white py-6 mt-12 text-center text-xs text-[#9AA1AC]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Hackingly. All rights reserved.</span>
          <span>PS-003 AI-Powered Identity & Eligibility Verification Track · Masters' Union Ventures</span>
        </div>
      </footer>
    </div>
  );
}
