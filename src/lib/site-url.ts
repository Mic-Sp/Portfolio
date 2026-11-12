/** Keep metadata and crawler URLs on the same public production origin. */
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    "https://portfolio-dusky-ten-97.vercel.app",
);
