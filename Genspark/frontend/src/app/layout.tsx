import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VeriForge — AI Identity & Eligibility Verification',
  description:
    'Hackingly VeriForge console for AI-powered participant ID verification, tamper detection, and organizer audit review.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white text-[#1a1f2e]">{children}</body>
    </html>
  );
}
