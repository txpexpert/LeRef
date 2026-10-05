"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MenuLateral({ liens }: { liens: [string, string][] }) {
  const chemin = usePathname();
  return (
    <nav className="menu-lateral" aria-label="Espace client">
      {liens.map(([href, libelle]) => (
        <Link key={href} href={href} aria-current={chemin === href ? "page" : undefined}>{libelle}</Link>
      ))}
    </nav>
  );
}
