"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
};

type Boss = {
  id: string;
  name: string;
  week: number;
};

type Attendance = {
  id: string;
  boss_id: string;
  user_name: string;
  checked: boolean;
};

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [tab, setTab] = useState<1 | 2>(1);

  // ================= LOAD =================
  async function load() {
    const [m, b, a] = await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("bosses").select("*"),
      supabase.from("attendance").select("*"),
    ]);

    setMembers(m.data ?? []);
    setBosses(b.data ?? []);
    setAtt(a.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  // ================= 핵심 수정 로직 =================
  function getWeekRate(userName: string, week: number) {
    const weekBosses = bosses.filter((b) => b.week === week);

    const bossIds = weekBosses.map((b) => b.id);

    // 🔥 핵심: 보스 기준 UNIQUE 처리 (중복 제거)
    const attendedBossSet = new Set(
      att
        .filter(
          (a) =>
            a.user_name === userName &&
            a.checked === true &&
            bossIds.includes(a.boss_id)
        )
        .map((a) => a.boss_id)
    );

    const total = weekBosses.length || 1;

    return Math.round((attendedBossSet.size / total) * 100);
  }

  // ================= UI =================
  return (
    <div
      style={{
        padding: 20,
        background: "#f7f7ff",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>
        📊 주차별 참여율 시스템
      </h2>

      {/* TAB */}
      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button
          onClick={() => setTab(1)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: tab === 1 ? "#ff6fae" : "#fff",
            color: tab === 1 ? "#fff" : "#000",
          }}
        >
          📅 1주차
        </button>

        <button
          onClick={() => setTab(2)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: tab === 2 ? "#ff6fae" : "#fff",
            color: tab === 2 ? "#fff" : "#000",
          }}
        >
          📅 2주차
        </button>
      </div>

      {/* LIST */}
      <div
        style={{
          marginTop: 20,
          background: "#fff",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <h3>
          {tab === 1 ? "1주차" : "2주차"} 참여율
        </h3>

        {members.map((m) => {
          const rate = getWeekRate(m.name, tab);

          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>{m.name}</span>

              <b
                style={{
                  color:
                    rate >= 80
                      ? "#22c55e"
                      : rate >= 50
                      ? "#f59e0b"
                      : "#ff6fae",
                }}
              >
                {rate}%
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}