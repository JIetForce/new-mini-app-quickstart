import type { Metadata } from "next";
import { Inter, Source_Code_Pro, Geist } from "next/font/google";
import { SafeArea } from "./components/SafeArea";
import { farcasterConfig } from "../farcaster.config";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = new URL(farcasterConfig.miniapp.homeUrl);

  return {
    metadataBase,
    applicationName: farcasterConfig.miniapp.name,
    title: farcasterConfig.miniapp.name,
    description: farcasterConfig.miniapp.description,
    alternates: {
      canonical: "/",
    },
    category: "finance",
    openGraph: {
      type: "website",
      url: farcasterConfig.miniapp.homeUrl,
      title: farcasterConfig.miniapp.ogTitle,
      description: farcasterConfig.miniapp.ogDescription,
      siteName: farcasterConfig.miniapp.name,
      images: [
        {
          url: farcasterConfig.miniapp.ogImageUrl,
          alt: `${farcasterConfig.miniapp.name} social preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: farcasterConfig.miniapp.ogTitle,
      description: farcasterConfig.miniapp.ogDescription,
      images: [farcasterConfig.miniapp.ogImageUrl],
    },
    icons: {
      icon: farcasterConfig.miniapp.iconUrl,
      apple: farcasterConfig.miniapp.iconUrl,
    },
    other: {
      "base:app_id": "69aea94a2976dc607e3a66cb",
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" className={cn("dark font-sans", geist.variable)}>
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </Providers>
  );
}
