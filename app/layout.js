import { Rubik, Geist_Mono } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TP5 SaaS Starter",
  description: "Next.js server-side boilerplate with Firebase Auth",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${rubik.variable} ${geistMono.variable} dark`}
    >
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
