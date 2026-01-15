import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "npmtraffic",
    description: "Mobile-first npm download analytics with GitHub-style traffic view.",
    };

    export default function RootLayout({
      children,
      }: {
        children: React.ReactNode;
        }) {
          return (
              <html lang="en">
                    <body>{children}</body>
                        </html>
                          );
                          }