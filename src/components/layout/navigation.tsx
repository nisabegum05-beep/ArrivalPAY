"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/student", label: "Student" },
  { href: "/institution", label: "Institution" },
  { href: "/arrival-services", label: "Arrival services" },
  { href: "/transactions", label: "Activity" },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="main-nav">
      {items.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
