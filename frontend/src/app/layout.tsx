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
    'Hackingly VeriForge: AI-powered participant ID verification, tamper detection, and organizer audit review for the AI Build Challenge.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-mesh min-h-screen text-[#0f172a]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

