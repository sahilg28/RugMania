import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
  weight: ['400', '500', '600', '700']
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export const metadata: Metadata = {
  title: "RugMania",
  description:
    "RugMania - A high tension onchain door game where you dodge rugs, climb through levels and decide when to lock in the win.",
  keywords: ["web3", "onchain", "game", "blockchain", "crypto", "rugmania", "rug"],
  authors: [{ name: "RugMania Team" }],
  openGraph: {
    title: "RugMania",
    description:
      "Dodge the rug, chase the win. In RugMania every door choice can push you higher or end it all.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RugMania",
    description:
      "Dodge the rug, climb levels and lock in the win before it slips away.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
