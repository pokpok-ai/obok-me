"use client";

import Link from "next/link";

interface PageSwitchProps {
  active: "realestate" | "salons";
}

const tabs = [
  { key: "realestate" as const, label: "Nieruchomosci", href: "/", activeClass: "bg-blue-600 text-white shadow-sm" },
  { key: "salons" as const, label: "Salony", href: "/salons", activeClass: "bg-purple-600 text-white shadow-sm" },
];

export function PageSwitch({ active }: PageSwitchProps) {
  return (
    <div className="absolute top-4 left-4 z-20 flex gap-0.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            active === tab.key
              ? tab.activeClass
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
