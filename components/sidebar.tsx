"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menus = [
    { href: "/", icon: "🏠", label: "대시보드" },
    { href: "/members", icon: "👥", label: "길드원 목록" },
    { href: "/bosses", icon: "⚔️", label: "보스 참여 기록" },
    { href: "/distribute", icon: "💎", label: "분배금 내역" },
    { href: "/attendance", icon: "📅", label: "참여율 기록" },
    { href: "/ladder", icon: "🎲", label: "사다리 게임" },
  ];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* 햄버거 */}
      <button className="hamburger" onClick={() => setIsOpen(true)}>
        ☰
      </button>

      {/* overlay */}
      {isOpen && (
        <div className="overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="closeBtn" onClick={() => setIsOpen(false)}>
          ❌
        </button>

        <div className="logo">
          <h1>레이븐2</h1>
          <p>길드 관리 시스템</p>
        </div>

        <div className="castle">🏰</div>

        <nav>
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              onClick={() => setIsOpen(false)}
              className={`menu ${isActive(menu.href) ? "active" : ""}`}
            >
              <span>{menu.icon}</span>
              {menu.label}
            </Link>
          ))}
        </nav>
      </aside>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 2000;
        }

        .sidebar {
          transition: transform 0.25s ease;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}