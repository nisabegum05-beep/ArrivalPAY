import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { WalletProvider } from "@/features/wallet/provider";
import { AnchorProvider } from "@/features/anchor/provider";
import { IntentsProvider } from "@/features/intents/provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://127.0.0.1:3000"),
  applicationName: "ArrivalPay",
  openGraph: { type: "website", siteName: "ArrivalPay", title: "ArrivalPay — One payment. A reusable wallet.", description: "Conditional enrollment deposits and arrival payments on Stellar Testnet." },
  title: {
    default: "ArrivalPay — A payment for your next chapter",
    template: "%s | ArrivalPay",
  },
  description:
    "A Stellar Testnet prototype for conditional enrollment deposits. Understand the terms, fund in USDC, and follow the outcome.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <AnchorProvider>
            <IntentsProvider>
              <AppShell>{children}</AppShell>
            </IntentsProvider>
          </AnchorProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
