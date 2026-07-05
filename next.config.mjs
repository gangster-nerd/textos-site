/** @type {import('next').NextConfig} */
const nextConfig = {
  // static-first (site-runtime-architecture.spec.md INV-1) :
  // les pages SEO se rendent sans session ni appel runtime au produit.
  output: "export",
};

export default nextConfig;
