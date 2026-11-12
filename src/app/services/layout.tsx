import type { Metadata } from "next";
import { PROFILE_CONFIG } from "@/data/profile.config";

const title = `Web Applications & AI Services | ${PROFILE_CONFIG.legalName}`;
const description =
  "Custom web applications, intelligent automation, and secure software for independent businesses. Explore services and discuss your project with Michael Sprague.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/services" },
  openGraph: {
    title,
    description,
    url: "/services",
    siteName: `${PROFILE_CONFIG.legalName} | Portfolio`,
    type: "website",
    locale: "en_US",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image.png"],
  },
};

export default function ServicesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
