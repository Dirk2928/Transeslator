/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfjs and tesseract ship large wasm/worker assets; keep them external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "tesseract.js", "mammoth"],
  },
};

export default nextConfig;
