"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const menus = [
    { href: "/", icon: "🏠", label: "대시보드" },
    { href: "/members", icon: "👥", label: "길드원 목록" },
    { href: "/bosses", icon: "⚔️", label: "보스 참여 기록" },
    { href: "/distribute", icon: "💎", label: "분배금 내역" },
    { href: "/attendance", icon: "📅", label: "참여율 기록" },
  ];

  return (
    <aside className="sidebar">

      <div className="logo">
        <h1>레이븐2</h1>
        <p>일본섭 수삼사단 관리</p>
      </div>

      <div className="castle">
        🏰
      </div>

      <nav>
        {menus.map((menu) => (
          <Link
            key={menu.href}
            href={menu.href}
            className={
              pathname === menu.href
                ? "menu active"
                : "menu"
            }
          >
            <span>{menu.icon}</span>
            {menu.label}
          </Link>
        ))}
      </nav>

    </aside>
  );
}