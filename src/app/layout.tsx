import type { Metadata } from "next";
import "./globals.css";

import { cn } from "@/lib/utils";
import { Anuphan, Sarabun } from "next/font/google";

import MainLoadingFullScreen from "@/components/common/MainLoadingFullScreen";
import { RootAuthProvider } from "@/components/providers/RootAuthProvider";
import QueryClientProvider from "@/provider/QueryClientProvider";
import type { Viewport } from "next";

const APP_NAME = "BDI Medical System";
const APP_DEFAULT_TITLE = "BDI - Medical Appointment System";
const APP_TITLE_TEMPLATE = "%s - BDI Medical";
const APP_DESCRIPTION = "Medical appointment and reminder management system";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin"],
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning={true}
      className={`${anuphan.variable} ${sarabun.variable} antialiased`}
    >
      <body
        className={cn(
          `${anuphan.variable} ${sarabun.variable} antialiased font-anuphan overflow-hidden`,
          // "min-h-svh"
        )}
        suppressHydrationWarning={true}
      >
        <QueryClientProvider>
          <RootAuthProvider>{children}</RootAuthProvider>
        </QueryClientProvider>
        <MainLoadingFullScreen />
      </body>
    </html>
  );
}
