/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app is self-contained; pin the file-tracing root to silence the
  // "inferred workspace root" warning caused by lockfiles in parent folders.
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    // Web3Auth / algosdk reference some Node core modules that are not needed
    // in the browser bundle. Provide empty fallbacks so the client build works.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      os: false,
      fs: false,
      net: false,
      tls: false,
      zlib: false,
    };
    // Optional React Native storage referenced by the MetaMask SDK (pulled in
    // transitively by Web3Auth) — not used on the web, alias it away.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

module.exports = nextConfig;
