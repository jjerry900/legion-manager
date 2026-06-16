"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string };
type Boss = { id: string; name: string; week: number };
type Attendance = { id: string; boss_id: string; user_name: string; checked: boolean };

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [tab, setTab] = useState<1 | 2>(1);

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

  // ✅ 성능 개선: 미리 계산 캐싱
  const weekBossIds = useMemo(() => {
    return bosses.filter((b) => b.week === tab).map((b) => b.id);
  }, [bosses, tab]);

  const stats = useMemo(() => {
    const total = weekBossIds.length || 1;

    return members.map((m) => {
      const attended = new Set(
        att
          .filter(
            (a) =>
              a.user_name === m.name &&
              a.checked &&
              weekBossIds.includes(a.boss_id)
          )
          .map((a) => a.boss_id)
      );

      const rate = Math.round((attended.size / total) * 100);

      return {
        ...m,
        rate,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [members, att, weekBossIds]);

  const avgRate = useMemo(() => {
    if (!stats.length) return 0;
    return Math.round(
      stats.reduce((sum, s) => sum + s.rate, 0) / stats.length
    );
  }, [stats]);

  return (
    <div className="wrap">

      {/* 헤더 */}
      <h2 className="title">📊 주차별 참여율</h2>

      {/* 요약 카드 */}
      <div className="summaryCard">
        <div>
          <div className="label">전체 평균 참여율</div>
          <div className="value">{avgRate}%</div>
        </div>
        <div>
          <div className="label">길드원 수</div>
          <div className="value">{members.length}명</div>
        </div>
      </div>

      {/* 탭 */}
      <div className="tabWrap">
        {[1, 2].map((w) => (
          <button
            key={w}
            onClick={() => setTab(w as 1 | 2)}
            className={`tab ${tab === w ? "active" : ""}`}
          >
            {w}주차
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="card">
        {stats.map((m, index) => {
          const rate = m.rate;

          const color =
            rate >= 80 ? "#22c55e" :
            rate >= 50 ? "#f59e0b" :
            "#ff6fae";

          return (
            <div key={m.id} className="row">
              <div className="left">
                <span className="rank">{index + 1}</span>
                <span className="name">{m.name}</span>
              </div>

              <div className="right">
                <b style={{ color }}>{rate}%</b>
              </div>

              <div className="bar">
                <div
                  className="fill"
                  style={{ width: `${rate}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 스타일 */}
      <style jsx>{`
        .wrap {
          padding: 16px;
          max-width: 900px;
          margin: 0 auto;
          background: #f7f7ff;
          min-height: 100vh;
        }

        .title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        /* 요약 */
        .summaryCard {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;

          background: white;
          padding: 14px;
          border-radius: 14px;
          margin-bottom: 14px;
        }

        .label {
          font-size: 12px;
          color: #888;
        }

        .value {
          font-size: 20px;
          font-weight: 800;
        }

        /* 탭 */
        .tabWrap {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
        }

        .tab {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: white;
          font-weight: 700;
        }

        .active {
          background: #ff6fae;
          color: white;
        }

        /* 리스트 */
        .card {
          background: white;
          border-radius: 14px;
          padding: 10px;
        }

        .row {
          padding: 12px 6px;
          border-bottom: 1px solid #eee;
        }

        .left {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .rank {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: #f1f1f1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .name {
          font-size: 15px;
          font-weight: 600;
        }

        .right {
          margin-top: 4px;
        }

        .bar {
          height: 8px;
          background: #eee;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 8px;
        }

        .fill {
          height: 100%;
          transition: 0.3s;
        }

        /* 모바일 */
        @media (max-width: 480px) {
          .title {
            font-size: 18px;
          }

          .summaryCard {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}