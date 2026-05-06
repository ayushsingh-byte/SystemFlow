import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from '@/components/ui/ThemeProvider';

export const metadata: Metadata = {
  title: "SystemFlow — System Design & Simulation Platform",
  description: "Design and simulate distributed architectures in real-time. Model latency, capacity, failure rates, and observe emergent behavior.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ height: '100%', overflow: 'hidden' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
