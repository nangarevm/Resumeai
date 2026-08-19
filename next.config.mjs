/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `next dev` cache off `.next` so a production `next build` cannot
  // delete webpack chunks the still-running dev server expects (e.g. 276.js).
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  // Moved out of `experimental` — stable as of Next.js 15.
  serverExternalPackages: ["pdf-parse", "mammoth", "docx", "jszip", "@react-pdf/renderer"]
};

export default nextConfig;
