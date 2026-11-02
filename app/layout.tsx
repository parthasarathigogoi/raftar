import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "RAFTAR — Find Your Way. Feel The Journey.", description: "Curated journeys and local experiences across Northeast India." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
