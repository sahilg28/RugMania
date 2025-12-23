import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import { ToastContainer } from "react-toastify";

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
           <ToastContainer
          position="top-right"
          autoClose={10000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastClassName={ "bg-zinc-900 border-2 border-zinc-700 rounded-md text-white shadow-brutal-sm font-medium font-sans"}
        />
        </Providers>
      </body>
    </html>
  );
}
