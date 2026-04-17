import Link from "next/link";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/cases", label: "Cases" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  return (
    <nav className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-4 py-5">
        <div className="text-sm font-semibold tracking-wide text-slate-900">Ops Hub</div>
        <div className="mt-1 text-xs text-slate-500">AI service operations inbox</div>
      </div>
      <ul className="px-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
