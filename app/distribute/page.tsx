"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; };
type Boss = { id: string; name: string; week: number; boss_score: number; };
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

  // ==========================================
  // [버그 완벽 박멸] 실제 출석 기준 데이터 연산 로직
  // ==========================================
  
  // 1. 이번 주차(week)에 해당하는 보스들 1차 필터링
  const weekBossesFiltered = useMemo(() => {
    return bosses.filter((b) => Number(b.week) === Number(week));
  }, [bosses, week]);

  // 2. 1차 필터링된 보스 중, '실제 유저들의 출석 체크 기록이 존재하는 보스'만 최종 엄선
  // (이를 통해 DB에 주차가 잘못 꼬여 들어간 유령 보스 점수 38점을 원천 배제합니다)
  const actualActiveBosses = useMemo(() => {
    return weekBossesFiltered.filter((boss) => {
      return attendance.some((a) => String(a.boss_id) === String(boss.id) && a.checked);
    });
  }, [weekBossesFiltered, attendance]);

  // 3. 진짜 활성화된 보스들의 점수만 합산 (여기서 정확히 사장님이 원하시는 67점이 나오게 됩니다)
  const totalBossScore = useMemo(() => {
    const score = actualActiveBosses.reduce((sum, b) => sum + Number(b.boss_score ?? 0), 0);
    console.log(`[필터링 완료] 현재 ${week}주차 실제 만점 기준 점수:`, score); 
    return score;
  }, [actualActiveBosses, week]);

  // 4. 점수 기준 참여율(rate) 계산
  const stats = useMemo(() => {
    return members.map((member) => {
      if (totalBossScore === 0) return { ...member, rate: 0 };

      // 엄선된 진짜 보스 중 해당 유저가 출석 체크한 보스의 점수만 합산
      const myEarnedScore = actualActiveBosses.reduce((sum, boss) => {
        const isAttended = attendance.some((a) => {
          const matchName = String(a.user_name).trim().toLowerCase() === String(member.name).trim().toLowerCase();
          return matchName && String(a.boss_id) === String(boss.id) && a.checked;
        });

        return isAttended ? sum + Number(boss.boss_score ?? 0) : sum;
      }, 0);
      
      // 만점(67점) 중 내 점수(67점)를 계산하여 정확히 100% 출력
      return { ...member, rate: myEarnedScore / totalBossScore };
    });
  }, [members, attendance, actualActiveBosses, totalBossScore]);

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

  // ==========================================
  // 데이터 핸들링 및 API 통신 함수 기능들
  // ==========================================
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, b, a, settingsRes, recordsRes] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("bosses").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("distribute_settings").select("*").eq("week", week).maybeSingle(),
        supabase.from("distribution_records").select("*").eq("week", week),
      ]);

      const activeBossIds = (b.data ?? []).map(boss => boss.id);
      const cleanAttendance = (a.data ?? []).filter(att => activeBossIds.includes(att.boss_id));

      setMembers(m.data ?? []);
      setBosses(b.data ?? []);
      setAttendance(cleanAttendance);

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
  }, [week]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveSettings(currentDiamond: number, currentPercent: number) {
    try {
      await supabase.from("distribute_settings").upsert(
        { week, total_diamond: currentDiamond, distribute_percent: currentPercent },
        { onConflict: "week" }
      );
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  }

  async function saveMember(userName: string, currentExtra: number, currentPaid: boolean) {
    const row = result.find((r) => r.name === userName);
    if (!row) return;

    try {
      await supabase.from("distribution_records").upsert(
        { week, user_name: userName, reward: row.reward, extra_reward: currentExtra, paid: currentPaid },
        { onConflict: "week,user_name" }
      );
    } catch (error) {
      console.error("멤버 기록 저장 실패:", error);
    }
  }

  async function handleReset() {
    if (!confirm(`${week}주차의 모든 분배금 설정 및 지급 내역을 완전히 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await supabase.from("distribute_settings").upsert({ week, total_diamond: 0, distribute_percent: 70 });
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

  if (isLoading) {
    return <div className="loading">✨ 요정들이 분배금을 계산 중입니다... ✨</div>;
  }

  return (
    <div className="wrap">
      <div className="header-area">
        <h2>💖 분배금 정산 내역 (보스 실점수 동기화 완료)</h2>
        <button className="reset-btn" onClick={handleReset}>🔄 데이터 초기화</button>
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
            inputMode="numeric"
            value={totalDiamond || ""}
            placeholder="0"
            onChange={(e) => setTotalDiamond(Number(e.target.value))}
            onBlur={() => saveSettings(totalDiamond, distributionPercent)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveSettings(totalDiamond, distributionPercent);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
        
        <div className="card-item">
          <div className="label">분배 대상 금액</div>
          <br />
          <b className="pink-text">{Math.floor(distributableAmount).toLocaleString()} 💎</b>
        </div>

        <div className="card-item">
          <div className="label">분배 비율 (%)</div>
          <input
            type="number"
            inputMode="numeric"
            value={distributionPercent || ""}
            min="0"
            max="100"
            placeholder="70"
            onChange={(e) => setDistributionPercent(Number(e.target.value))}
            onBlur={() => saveSettings(totalDiamond, distributionPercent)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveSettings(totalDiamond, distributionPercent);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        <div className="card-item">
          <div className="label">총 지급액</div>
          <br />
          <b>{totalPaid.toLocaleString()} 💎</b>
        </div>

        <div className="card-item">
          <div className="label" style={{ color: remain < 0 ? "#f43f5e" : "inherit" }}>남은 금액</div>
          <br />
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
                  inputMode="numeric"
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
                {paidMap[m.name] ? "🌸 완료" : "⬜ 미지급"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .wrap { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; background-color: #fcf8fa; min-height: 100vh; box-sizing: border-box; }
        .loading { padding: 80px; text-align: center; font-size: 18px; color: #ff6fae; font-weight: 600; }
        
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 10px; }
        .header-area h2 { color: #4a353d; font-size: 24px; font-weight: 800; margin: 0; white-space: nowrap; }
        
        .reset-btn { background: #ffe4ee; color: #ff5294; font-size: 13px; padding: 10px 16px; border-radius: 20px; border: 1px solid #ffd0e3; cursor: pointer; font-weight: bold; transition: all 0.2s; white-space: nowrap; }
        .reset-btn:hover { background: #ffdae7; transform: translateY(-1px); }

        .tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .tabs button { flex: 1; max-width: 160px; padding: 12px 0; text-align: center; border: 1px solid #ffe1ed; border-radius: 20px; background: white; color: #8a757d; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; }
        .tabs button.active { background: #ff6fae; color: white; border-color: #ff6fae; box-shadow: 0 4px 12px rgba(255, 111, 174, 0.3); }
        
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
        .card-item { background: white; padding: 16px; border-radius: 16px; box-shadow: 0 4px 10px rgba(74, 53, 61, 0.03); border: 1px solid #fff5f8; display: flex; flex-direction: column; justify-content: center; }
        .card-item.highlight { background: #fff0f5; border: 1px solid #ffe1ed; }
        .card-item .label { font-size: 13px; color: #9c858e; font-weight: 600; margin-bottom: 6px; }
        .card-item b { font-size: 17px; color: #4a353d; font-weight: 700; word-break: break-all; }
        .card-item .pink-text { color: #ff6fae; }
        .card-item input { width: 100%; border: 1px solid #ffd3e4; padding: 8px 12px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #4a353d; background: white; outline: none; box-sizing: border-box; }
        .card-item input:focus { border-color: #ff6fae; box-shadow: 0 0 0 2px rgba(255, 111, 174, 0.1); }

        .list-container { background: white; border-radius: 20px; padding: 8px; box-shadow: 0 6px 18px rgba(74, 53, 61, 0.04); border: 1px solid #fff3f7; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #fff0f5; transition: background 0.2s; border-radius: 14px; gap: 12px; }
        .row:last-child { border-bottom: none; }
        .row:hover { background-color: #fff9fb; }
        .row.paid { background-color: #fff0f5; border-color: #ffe1ed; }
        
        .left-info { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .member-name { font-size: 16px; font-weight: 700; color: #332228; min-width: 70px; }
        .participation-rate { font-size: 13px; color: #b09aa4; font-weight: 600; background: #f5edf0; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
        .row.paid .participation-rate { background: #ffe1ed; color: #ff6fae; }

        .right-controls { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex: 1; }
        
        .input-group { display: flex; align-items: center; background: #faf6f8; border: 1px solid #ebdbe1; border-radius: 10px; padding-left: 8px; transition: border 0.2s; flex-shrink: 0; }
        .input-group:focus-within { border-color: #ff6fae; background: white; }
        .input-prefix { font-size: 12px; color: #b59fa8; font-weight: bold; margin-right: 2px; }
        .extra-input { border: none; background: transparent; padding: 8px 8px 8px 0; width: 55px; font-weight: 600; font-size: 14px; color: #4a353d; outline: none; text-align: right; }
        
        .reward-display { text-align: right; font-weight: 800; color: #ff6fae; font-size: 16px; white-space: nowrap; flex: 1; min-width: 70px; }
        
        .status-btn { padding: 8px 14px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; text-align: center; }
        .status-btn.pending { background: #f5f3f4; color: #7a6970; border-color: #e3e0e2; }
        .status-btn.pending:hover { background: #eae7e9; }
        .status-btn.completed { background: #ff6fae; color: white; box-shadow: 0 3px 8px rgba(255, 111, 174, 0.25); }
        .status-btn.completed:hover { background: #f05697; }

        @media (max-width: 1024px) {
          .summary { grid-template-columns: repeat(3, 1fr); gap: 10px; }
        }

        @media (max-width: 768px) {
          .wrap { padding: 16px 12px; }
          .header-area h2 { font-size: 20px; }
          .reset-btn { padding: 8px 12px; font-size: 12px; }
          
          .summary { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
          .summary .card-item:nth-child(5) { grid-column: span 2; }
          .card-item { padding: 12px; }
          .card-item b { font-size: 15px; }
          .card-item input { padding: 6px 10px; font-size: 14px; }

          .row { flex-direction: column; align-items: stretch; gap: 10px; padding: 14px 12px; }
          
          .left-info { justify-content: space-between; width: 100%; border-bottom: 1px dashed #fff0f5; padding-bottom: 6px; }
          .member-name { font-size: 15px; }

          .right-controls { width: 100%; justify-content: space-between; gap: 8px; }
          .input-group { padding-left: 6px; }
          .extra-input { width: 45px; padding: 6px 6px 6px 0; font-size: 13px; }
          .reward-display { text-align: center; font-size: 15px; flex: 1; min-width: auto; margin: 0 4px; }
          .status-btn { padding: 6px 10px; font-size: 12px; min-width: 65px; }
        }
      `}</style>
    </div>
  );
}