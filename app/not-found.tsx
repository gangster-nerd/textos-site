import Link from "next/link";
import type { Metadata } from "next";

// Page d'erreur statique — `output: "export"` (INV-1) exige que même l'état d'erreur se rende
// sans appel runtime. Pas de message inventé, une seule destination : revenir au contenu réel.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <Link href="/">Return to the homepage</Link>, browse{" "}
        <Link href="/insights">Insights</Link>, or read the{" "}
        <Link href="/faq">FAQ</Link>.
      </p>
    </main>
  );
}
