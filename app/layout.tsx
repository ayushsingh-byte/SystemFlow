import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SystemFlow — System Design & Simulation Platform",
  description: "Design and simulate distributed architectures in real-time. Model latency, capacity, failure rates, and observe emergent behavior.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }} suppressHydrationWarning>
      <body style={{ height: '100%', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
