/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Driver database & push dijalankan apa adanya di server (tidak di-bundle).
  serverExternalPackages: ["pg", "web-push"],
};

export default nextConfig;
