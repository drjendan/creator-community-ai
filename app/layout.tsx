import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
import { RouteAnnouncer } from "@/components/accessibility/RouteAnnouncer";

export const metadata: Metadata = {
  title: {
    default: "UpNexx | Intelligent Content, Learning & Community",
    template: "%s | UpNexx"
  },
  description:
    "Transform your expertise into engagement, learning, and revenue with an intelligent content, learning, and community platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#application-content">Skip to application content</a>
        <RouteAnnouncer />
        <div id="application-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
