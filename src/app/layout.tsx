import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { TelemetryFrame } from "@/components/hud/TelemetryFrame";
import { HudProvider } from "@/context/HudContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PROFILE_CONFIG } from "@/data/profile.config";
import "./globals.css";
import "./portfolio-light.css";
import "./recruiter-hierarchy.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const title = `${PROFILE_CONFIG.legalName} | AI & Full-Stack Software Engineer`;
const description =
  "AI & Full-Stack Software Engineer open to full-time roles. Explore Michael Sprague's applied AI, TypeScript, React, and Next.js projects, resume, and experience.";
const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const siteUrl =
  process.env.SITE_URL ||
  (deploymentHost
    ? `https://${deploymentHost}`
    : "https://portfolio-dusky-ten-97.vercel.app/");
const socialImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 621,
  alt: "Michael Anthony Sprague's software engineering portfolio and selected projects",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: `${PROFILE_CONFIG.legalName} | Portfolio`,
    url: "/",
    title,
    description,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <HudProvider>
          <ThemeProvider>
            <TelemetryFrame>{children}</TelemetryFrame>
          </ThemeProvider>
        </HudProvider>
      </body>
    </html>
  );
}
