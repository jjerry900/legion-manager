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
  ];

  // ✅ 모바일 사이드바 열릴 때 스크롤 막기 (핵심 UX 수정)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  return (
    <>
      {/* ✅ 햄버거 버튼 (모바일에서만 보이게 CSS 처리 필요) */}
      <button className="hamburger" onClick={() => setIsOpen(true)}>
        ☰
      </button>

      {/* ✅ 오버레이 (이거 없으면 모바일 UX 깨짐) */}
      {isOpen && (
        <div className="overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="closeBtn" onClick={() => setIsOpen(false)}>
          ❌
        </button>

        <div className="logo">
          <h1>레이븐2</h1>
          <p>일본섭 수삼사단 관리</p>
        </div>

        <div className="castle">🏰</div>

        <nav>
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              onClick={() => setIsOpen(false)}
              className={
                pathname === menu.href ? "menu active" : "menu"
              }
            >
              <span>{menu.icon}</span>
              {menu.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}