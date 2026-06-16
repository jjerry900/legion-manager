"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; };
type Boss = { id: string; name: string; week: number; };
type Attendance = { id: string; boss_id: string; user_name: string; checked: boolean; };
type DistributionRecord = { user_name: string; extra_reward: number; paid: boolean; };

export default function DistributionPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [week, setWeek] = useState<1 | 2>(1);

  // 화면 UI 표시용 상태 관리
  const [totalDiamond, setTotalDiamond] = useState<number>(0);
  const [distributionPercent, setDistributionPercent] = useState<number>(70);

  const [extras, setExtras] = useState<Record<string, number>>({});
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 1. 데이터 호출
  async function loadData() {
    setIsLoading(true);
    try {
      const [m, b, a, settingsRes, recordsRes] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("bosses").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("distribute_settings").select("*").eq("week", week).maybeSingle(),
        supabase.from("distribution_records").select("*").eq("week", week),
      ]);

      setMembers(m.data ?? []);
      setBosses(b.data ?? []);
      setAttendance(a.data ?? []);

      if (settingsRes.data) {
        setTotalDiamond(settingsRes.data.total_diamond ?? 0);
        setDistributionPercent(settingsRes.data.distribute_percent ?? 70);
      } else {
        setTotalDiamond(0);
        setDistributionPercent(70);
      }

      const extraObj: Record<string, number> = {};
      const paidObj: Record<string, boolean> = {};

      if (recordsRes.data) {
        recordsRes.data.forEach((row: DistributionRecord) => {
          extraObj[row.user_name] = row.extra_reward || 0;
          paidObj[row.user_name] = row.paid || false;
        });
      }

      setExtras(extraObj);
      setPaidMap(paidObj);
    } catch (error) {
      console.error("데이터 로드 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [week]);

  // 2. 상단 마스터 설정 저장
  async function saveSettings(currentDiamond: number, currentPercent: number) {
    try {
      await supabase.from("distribute_settings").upsert(
        {
          week,
          total_diamond: currentDiamond,
          distribute_percent: currentPercent,
        },
        { onConflict: "week" }
      );
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  }

  // 3. 개별 멤버 상태 자동 저장
  async function saveMember(userName: string, currentExtra: number, currentPaid: boolean) {
    const row = result.find((r) => r.name === userName);
    if (!row) return;

    try {
      await supabase.from("distribution_records").upsert(
        {
          week,
          user_name: userName,
          reward: row.reward,
          extra_reward: currentExtra,
          paid: currentPaid,
        },
        { onConflict: "week,user_name" }
      );
    } catch (error) {
      console.error("멤버 기록 저장 실패:", error);
    }
  }

  // 4. 초기화 함수
  async function handleReset() {
    if (!confirm(`${week}주차의 모든 분배금 설정 및 지급 내역을 완전히 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await supabase.from("distribute_settings").upsert({
        week,
        total_diamond: 0,
        distribute_percent: 70,
      });

      await supabase.from("distribution_records").delete().eq("week", week);

      setTotalDiamond(0);
      setDistributionPercent(70);
      setExtras({});
      setPaidMap({});
      
      alert(`${week}주차 데이터가 초기화되었습니다.`);
    } catch (error) {
      console.error("초기화 중 오류 발생:", error);
      alert("초기화에 실패했습니다.");
    }
  }

  const weekBossIds = useMemo(() => {
  if (week === 1) {
    return bosses
      .filter((b) => b.week === 1)
      .map((b) => b.id);
  }

  return bosses
    .filter((b) => b.week === 1 || b.week === 2)
    .map((b) => b.id);
}, [bosses, week]);

  const stats = useMemo(() => {
    const totalBosses = weekBossIds.length || 1;
    return members.map((member) => {
      const attended = new Set(
        attendance
          .filter((a) => a.user_name === member.name && a.checked && weekBossIds.includes(a.boss_id))
          .map((a) => a.boss_id)
      );
      return { ...member, rate: attended.size / totalBosses };
    });
  }, [members, attendance, weekBossIds]);

  const totalRate = useMemo(() => stats.reduce((sum, m) => sum + m.rate, 0), [stats]);

  const result = useMemo(() => {
    const allocatableDiamond = totalDiamond * (distributionPercent / 100);
    return stats
      .map((m) => {
        const baseReward = totalRate === 0 ? 0 : Math.floor((allocatableDiamond * m.rate) / totalRate);
        const extra = extras[m.name] || 0;
        return {
          ...m,
          reward: baseReward,
          extra,
          finalReward: baseReward + extra,
        };
      })
      .sort((a, b) => b.finalReward - a.finalReward);
  }, [stats, totalDiamond, distributionPercent, totalRate, extras]);

  const totalPaid = useMemo(() => result.reduce((sum, m) => sum + m.finalReward, 0), [result]);
  const distributableAmount = totalDiamond * (distributionPercent / 100);
  const remain = totalDiamond - totalPaid;

  if (isLoading) {
    return <div className="loading">✨ 요정들이 분배금을 계산 중입니다... ✨</div>;
  }

  return (
    <div className="wrap">
      <div className="header-area">
        <h2>💖 분배금 정산 내역</h2>
        <button className="reset-btn" onClick={handleReset}>
          🔄 데이터 초기화
        </button>
      </div>

      <div className="tabs">
        <button className={week === 1 ? "active" : ""} onClick={() => setWeek(1)}>1주차 탭</button>
        <button className={week === 2 ? "active" : ""} onClick={() => setWeek(2)}>2주차 탭</button>
      </div>

      <div className="summary">
        <div className="card-item highlight">
          <div className="label">총 분배금</div>
          <input
            type="number"
            value={totalDiamond || ""}
            placeholder="0"
            onChange={(e) => {
              const val = Number(e.target.value);
              setTotalDiamond(val);
              saveSettings(val, distributionPercent);
            }}
          />
        </div>
        
        <div className="card-item">
          <div className="label">분배 대상 금액</div>
          <b className="pink-text">{Math.floor(distributableAmount).toLocaleString()} 💎</b>
        </div>

        <div className="card-item">
          <div className="label">분배 비율 (%)</div>
          <input
            type="number"
            value={distributionPercent || ""}
            min="0"
            max="100"
            placeholder="70"
            onChange={(e) => {
              const val = Number(e.target.value);
              setDistributionPercent(val);
              saveSettings(totalDiamond, val);
            }}
          />
        </div>

        <div className="card-item">
          <div className="label">총 지급액</div>
          <b>{totalPaid.toLocaleString()} 💎</b>
        </div>

        <div className="card-item">
          <div className="label" style={{ color: remain < 0 ? "#f43f5e" : "inherit" }}>남은 금액</div>
          <b style={{ color: remain < 0 ? "#f43f5e" : "#ff6fae" }}>{remain.toLocaleString()} 💎</b>
        </div>
      </div>

      <div className="list-container">
        {result.map((m) => (
          <div key={m.id} className={`row ${paidMap[m.name] ? "paid" : ""}`}>
            <div className="left-info">
              <span className="member-name">{m.name}</span>
              <span className="participation-rate">참여율 {(m.rate * 100).toFixed(0)}%</span>
            </div>

            <div className="right-controls">
              <div className="input-group">
                <span className="input-prefix">+@</span>
                <input
                  type="number"
                  className="extra-input"
                  value={extras[m.name] ?? ""}
                  placeholder="0"
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setExtras((prev) => ({ ...prev, [m.name]: value }));
                  }}
                  onBlur={() => saveMember(m.name, extras[m.name] || 0, !!paidMap[m.name])}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveMember(m.name, extras[m.name] || 0, !!paidMap[m.name]);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>

              <div className="reward-display">{m.finalReward.toLocaleString()} 💎</div>

              <button
                className={`status-btn ${paidMap[m.name] ? "completed" : "pending"}`}
                onClick={async () => {
                  const nextPaid = !paidMap[m.name];
                  setPaidMap((prev) => ({ ...prev, [m.name]: nextPaid }));
                  await saveMember(m.name, extras[m.name] || 0, nextPaid);
                }}
              >
                {paidMap[m.name] ? "🌸 지급완료" : "⬜ 미지급"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .wrap { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; background-color: #fcf8fa; min-height: 100vh; }
        .loading { padding: 80px; text-align: center; font-size: 18px; color: #ff6fae; font-weight: 600; }
        
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .header-area h2 { color: #4a353d; font-size: 24px; font-weight: 800; margin: 0; }
        
        .reset-btn { background: #ffe4ee; color: #ff5294; font-size: 13px; padding: 10px 16px; border-radius: 20px; border: 1px solid #ffd0e3; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .reset-btn:hover { background: #ffdae7; transform: translateY(-1px); }

        .tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .tabs button { padding: 12px 24px; border: 1px solid #ffe1ed; border-radius: 20px; background: white; color: #8a757d; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; }
        .tabs button.active { background: #ff6fae; color: white; border-color: #ff6fae; box-shadow: 0 4px 12px rgba(255, 111, 174, 0.3); }
        
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
        .card-item { background: white; padding: 16px; border-radius: 16px; box-shadow: 0 4px 10px rgba(74, 53, 61, 0.03); border: 1px solid #fff5f8; display: flex; flex-direction: column; justify-content: center; }
        .card-item.highlight { background: #fff0f5; border: 1px solid #ffe1ed; }
        .card-item .label { font-size: 13px; color: #9c858e; font-weight: 600; margin-bottom: 6px; }
        .card-item b { font-size: 18px; color: #4a353d; font-weight: 700; }
        .card-item .pink-text { color: #ff6fae; }
        .card-item input { width: 100%; border: 1px solid #ffd3e4; padding: 8px 12px; border-radius: 10px; font-size: 16px; font-weight: 700; color: #4a353d; background: white; outline: none; transition: border 0.2s; }
        .card-item input:focus { border-color: #ff6fae; box-shadow: 0 0 0 2px rgba(255, 111, 174, 0.1); }

        .list-container { background: white; border-radius: 20px; padding: 8px; box-shadow: 0 6px 18px rgba(74, 53, 61, 0.04); border: 1px solid #fff3f7; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #fff0f5; transition: background 0.2s; border-radius: 14px; }
        .row:last-child { border-bottom: none; }
        .row:hover { background-color: #fff9fb; }
        .row.paid { background-color: #fff0f5; border-color: #ffe1ed; }
        
        .left-info { display: flex; align-items: center; gap: 16px; }
        .member-name { font-size: 16px; font-weight: 700; color: #332228; min-width: 80px; }
        .participation-rate { font-size: 13px; color: #b09aa4; font-weight: 600; background: #f5edf0; padding: 4px 10px; border-radius: 12px; }
        .row.paid .participation-rate { background: #ffe1ed; color: #ff6fae; }

        .right-controls { display: flex; align-items: center; gap: 20px; }
        
        .input-group { display: flex; align-items: center; background: #faf6f8; border: 1px solid #ebdbe1; border-radius: 10px; padding-left: 8px; transition: border 0.2s; }
        .input-group:focus-within { border-color: #ff6fae; background: white; }
        .input-prefix { font-size: 12px; color: #b59fa8; font-weight: bold; margin-right: 2px; }
        .extra-input { border: none; background: transparent; padding: 8px 8px 8px 0; width: 70px; font-weight: 600; font-size: 14px; color: #4a353d; outline: none; text-align: right; }
        
        .reward-display { min-width: 130px; text-align: right; font-weight: 800; color: #ff6fae; font-size: 17px; }
        
        .status-btn { padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
        .status-btn.pending { background: #f5f3f4; color: #7a6970; border-color: #e3e0e2; }
        .status-btn.pending:hover { background: #eae7e9; }
        .status-btn.completed { background: #ff6fae; color: white; box-shadow: 0 3px 8px rgba(255, 111, 174, 0.25); }
        .status-btn.completed:hover { background: #f05697; }

        @media (max-width: 1024px) {
          .summary { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .summary { grid-template-columns: 1fr; }
          .row { flex-direction: column; align-items: flex-start; gap: 14px; padding: 16px; }
          .right-controls { width: 100%; justify-content: space-between; }
          .reward-display { text-align: left; min-width: auto; flex: 1; margin-left: 10px; }
        }
      `}</style>
    </div>
  );
}