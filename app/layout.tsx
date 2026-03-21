import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystemFlow — System Design & Simulation Platform",
  description: "Design and simulate distributed architectures in real-time. Model latency, capacity, failure rates, and observe emergent behavior.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', overflow: 'hidden', background: '#050811' }}>
        {children}
      </body>
    </html>
  );
}
