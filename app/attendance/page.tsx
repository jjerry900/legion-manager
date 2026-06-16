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

  // ✅ 개선: 1주차가 초기화되어 bosses에서 사라져도 2주차 누적 기록이 유지되도록 처리
  const weekBossIds = useMemo(() => {
    // 1주차 보스 ID 목록 추출
    const week1BossIds = bosses.filter((b) => b.week === 1).map((b) => b.id);
    // 2주차 보스 ID 목록 추출
    const week2BossIds = bosses.filter((b) => b.week === 2).map((b) => b.id);

    if (tab === 1) {
      return week1BossIds;
    }

    // ⭐ 핵심: 1주차 보스 데이터가 초기화(삭제)되었더라도, 
    // 출석(att) 데이터에 남아있는 1주차 흔적이 있다면 그 보스 ID들까지 2주차에 강제로 포함시킵니다.
    const historicalWeek1Ids = Array.from(
      new Set(
        att
          .filter((a) => !week2BossIds.includes(a.boss_id)) // 2주차가 아닌 것은 과거 데이터로 취급
          .map((a) => a.boss_id)
      )
    );

    // 1주차 기록이 날아갔다면 historical 보스 ID들을 병합하여 2주차(15~28) 연산이 보존되도록 함
    const mergedWeek1Ids = week1BossIds.length > 0 ? week1BossIds : historicalWeek1Ids;

    return [...mergedWeek1Ids, ...week2BossIds];
  }, [bosses, att, tab]);

  const stats = useMemo(() => {
    const total = weekBossIds.length || 1;

    return members
      .map((m) => {
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
      })
      .sort((a, b) => b.rate - a.rate);
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
      <h2 className="title">📊 주차별 참여율 정산</h2>

      {/* 요약 카드 */}
      <div className="summaryCard">
        <div>
          <div className="label">전체 평균 참여율</div>
          <div className="value pink-text">{avgRate}%</div>
        </div>
        <div>
          <div className="label">정산 길드원 수</div>
          <div className="value">{members.length}명</div>
        </div>
      </div>

      {/* 탭 디자인 개선 */}
      <div className="tabWrap">
        {[1, 2].map((w) => (
          <button
            key={w}
            onClick={() => setTab(w as 1 | 2)}
            className={`tab ${tab === w ? "active" : ""}`}
          >
            {w}주차 {w === 1 }
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
              <div className="row-header">
                <div className="left">
                  <span className="rank">{index + 1}</span>
                  <span className="name">{m.name}</span>
                </div>
                <div className="right">
                  <b style={{ color }}>{rate}%</b>
                </div>
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

      {/* 스타일 핑크 에디션 매칭 */}
      <style jsx>{`
        .wrap {
          padding: 24px;
          max-width: 900px;
          margin: 0 auto;
          background: #fcf8fa;
          min-height: 100vh;
          font-family: system-ui, sans-serif;
        }

        .title {
          font-size: 24px;
          font-weight: 800;
          color: #4a353d;
          margin-bottom: 20px;
        }

        /* 요약 */
        .summaryCard {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: white;
          padding: 18px;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(74, 53, 61, 0.02);
          border: 1px solid #fff5f8;
        }

        .label {
          font-size: 13px;
          color: #9c858e;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .value {
          font-size: 22px;
          font-weight: 800;
          color: #4a353d;
        }
        
        .pink-text {
          color: #ff6fae;
        }

        /* 탭 */
        .tabWrap {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab {
          flex: 1;
          padding: 14px;
          border-radius: 20px;
          border: 1px solid #ffe1ed;
          background: white;
          color: #8a757d;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          background: #fff9fb;
        }

        .tab.active {
          background: #ff6fae;
          color: white;
          border-color: #ff6fae;
          box-shadow: 0 4px 12px rgba(255, 111, 174, 0.3);
        }

        /* 리스트 */
        .card {
          background: white;
          border-radius: 20px;
          padding: 12px 20px;
          box-shadow: 0 6px 18px rgba(74, 53, 61, 0.04);
          border: 1px solid #fff3f7;
        }

        .row {
          padding: 16px 0;
          border-bottom: 1px solid #fff0f5;
        }

        .row:last-child {
          border-bottom: none;
        }
        
        .row-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .left {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .rank {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: #fff0f5;
          color: #ff6fae;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .name {
          font-size: 16px;
          font-weight: 700;
          color: #332228;
        }

        .right b {
          font-size: 16px;
          font-weight: 800;
        }

        .bar {
          height: 8px;
          background: #f5edf0;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 10px;
        }

        .fill {
          height: 100%;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 모바일 대응 */
        @media (max-width: 480px) {
          .wrap { padding: 16px; }
          .title { font-size: 20px; }
          .summaryCard { grid-template-columns: 1fr; gap: 16px; }
          .tab { padding: 12px 8px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
}