import { Geist, Geist_Mono, Roboto_Slab } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/lib/providers"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const robotoSlab = Roboto_Slab({subsets:['latin'],variable:'--font-serif'});

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, fontMono.variable, "font-serif", robotoSlab.variable)}
    >
      <body>
        <TooltipProvider>
          <Providers>
            <ThemeProvider>{children}</ThemeProvider>
          </Providers>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
