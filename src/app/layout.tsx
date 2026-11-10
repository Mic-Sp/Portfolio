import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { TelemetryFrame } from "@/components/hud/TelemetryFrame";
import { HudProvider } from "@/context/HudContext";
import { PROFILE_CONFIG } from "@/data/profile.config";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Michael A. Sprague | Systems Engineer",
  description: `${PROFILE_CONFIG.headline}. Explore projects in applied AI, hybrid quantum-classical systems, full-stack engineering, and application security.`,
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
          <TelemetryFrame>{children}</TelemetryFrame>
        </HudProvider>
      </body>
    </html>
  );
}
