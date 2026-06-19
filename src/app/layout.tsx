import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

// Fonts are loaded via CSS @font-face in globals.css
// This avoids the next/font/local server-side module which can crash in Capacitor WebView

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#090909",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SAAVNIFY - Premium Music Streaming",
  description: "Experience music like never before with SAAVNIFY.",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Global error handler to prevent WebView crash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, url, line, col, error) {
                console.error('SAAVNIFY Global Error:', msg, url, line, col, error);
                return true;
              };
              window.addEventListener('unhandledrejection', function(event) {
                console.error('SAAVNIFY Unhandled Promise:', event.reason);
                event.preventDefault();
              });
            `,
          }}
        />
      </head>
      <body
        className="antialiased bg-[#090909] text-white overflow-hidden"
        style={{ fontFamily: "'Inter', system-ui, Roboto, sans-serif" }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#222222",
                color: "#FFFFFF",
                border: "1px solid #282828",
                borderRadius: "12px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
