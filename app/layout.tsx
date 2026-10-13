import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const siteUrl = "https://veeraj.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Veeraj — Software Engineer | AI/ML | Systems",
  description:
    "Veeraj builds AI-assisted systems, full-stack applications, and small tools that remove real friction. Software engineer focused on AI/ML, system design, and automation.",
  keywords: [
    "Veeraj",
    "Software Engineer",
    "AI/ML Engineer",
    "Full-Stack Developer",
    "System Design",
    "ReconAI",
  ],
  authors: [{ name: "Veeraj", url: "https://github.com/Veeraj12" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Veeraj — Software Engineer | AI/ML | Systems",
    description:
      "Building systems that turn messy problems into usable software. AI/ML, full-stack engineering, and system design.",
    url: siteUrl,
    siteName: "Veeraj",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veeraj — Software Engineer | AI/ML | Systems",
    description:
      "Building systems that turn messy problems into usable software.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
