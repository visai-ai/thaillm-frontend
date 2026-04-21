import { getBasePath } from "@/lib/config";
import withPWA from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const basePath = getBasePath();

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: basePath,
  // assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    remotePatterns: [new URL("https://thaillm.or.th/**")],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true,
          },
        },
      ],
    });

    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default withPWA({
  dest: "public/pwa",
  sw: "sw.js", // Service worker for push notifications
  disable: false, // Keep PWA enabled for service worker registration
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // Bypass SW completely for cross-origin API calls (chat SSE, prescreen, etc.).
        // The default catch-all uses NetworkFirst with a 10s timeout which breaks
        // long-lived SSE streams and can fail during SW activation transitions.
        urlPattern: ({ sameOrigin }: { sameOrigin: boolean }) => !sameOrigin,
        handler: "NetworkOnly" as const,
        options: {
          cacheName: "cross-origin",
        },
      },
    ],
  },
})(nextConfig);
