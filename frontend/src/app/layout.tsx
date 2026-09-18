import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hackingly — Identity & Eligibility Verification",
  description: "AI-Powered Identity & Eligibility Verification Platform for Hackathon Registrations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${poppins.variable} antialiased`}
    >
      <body className="min-h-screen bg-white text-[#14161A] flex flex-col font-sans selection:bg-[#12805F]/15 selection:text-[#12805F]">
        {children}
      </body>
    </html>
  );
}
