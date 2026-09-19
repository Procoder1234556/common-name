import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const fontSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Common Name",
    template: "%s · Common Name",
  },
  description:
    "Check proposed Indian company names against an official Company Master snapshot. Not a substitute for MCA filing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-900"
        >
          Skip to content
        </a>
        <header className="border-b border-neutral-200/80 bg-neutral-50/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="font-display hover:text-primary-700 text-lg font-semibold tracking-tight text-neutral-900 transition-colors"
            >
              Common Name
            </Link>
            <nav aria-label="Primary">
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                About
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-neutral-200/80 py-6 text-center text-sm text-neutral-600">
          <p>
            Snapshot signal only. Always verify on{" "}
            <a
              href={
                process.env.NEXT_PUBLIC_MCA_VERIFY_URL ??
                "https://www.mca.gov.in/"
              }
              className="text-primary-700 font-medium underline-offset-2 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              MCA
            </a>
            .{" "}
            <Link
              href="/about"
              className="text-primary-700 font-medium underline-offset-2 hover:underline"
            >
              How it works
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
