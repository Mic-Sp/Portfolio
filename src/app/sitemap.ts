import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/services"].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
