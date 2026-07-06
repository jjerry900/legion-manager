"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; };
type Boss = { id: string; name: string; week: number; boss_score: number; };
type Attendance = { id: string; boss_id: string; user_name: string; checked: boolean; };

export default function AttendanceRatePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [week, setWeek] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // [정밀 동기화] 참여율 연산 로직
  // ==========================================
  
  // 1. 현재 주차(week)에 해당하는 보스들 필터링
  const weekBosses = useMemo(() => {
    return bosses.filter((b) => Number(b.week) === Number(week));
  }, [bosses, week]);

  // 2. 이 중 유저들의 출석 체크 기록이 1개라도 존재하는 '실제 활성 보스'만 엄선 (분모 오류 원천 차단)
  const actualActiveBosses = useMemo(() => {
    return weekBosses.filter((boss) => {
      return attendance.some((a) => String(a.boss_id) === String(boss.id) && a.checked);
    });
  }, [weekBosses, attendance]);

  // 3. 진짜 활성화된 이번 주차 보스들의 만점 기준 계산 (예: 67점)
  const totalBossScore = useMemo(() => {
    return actualActiveBosses.reduce((sum, b) => sum + Number(b.boss_score ?? 0), 0);
  }, [actualActiveBosses]);

  // 4. 최종 멤버별 획득 점수 및 참여율 계산
  const memberStats = useMemo(() => {
    return members.map((member) => {
      if (totalBossScore === 0) return { ...member, earnedScore: 0, rate: 0 };

      // 해당 유저가 체크된 보스의 점수만 합산
      const myEarnedScore = actualActiveBosses.reduce((sum, boss) => {
        const isAttended = attendance.some((a) => {
          const matchName = String(a.user_name).trim().toLowerCase() === String(member.name).trim().toLowerCase();
          return matchName && String(a.boss_id) === String(boss.id) && a.checked;
        });
        return isAttended ? sum + Number(boss.boss_score ?? 0) : sum;
      }, 0);

      return {
        ...member,
        earnedScore: myEarnedScore,
        rate: myEarnedScore / totalBossScore,
      };
    }).sort((a, b) => b.rate - a.rate); // 참여율 높은 순 정렬
  }, [members, attendance, actualActiveBosses, totalBossScore]);

  // ==========================================
  // 데이터 로드
  // ==========================================
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, b, a] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("bosses").select("*"),
        supabase.from("attendance").select("*"),
      ]);

      setMembers(m.data ?? []);
      setBosses(b.data ?? []);
      setAttendance(a.data ?? []);
    } catch (error) {
      console.error("데이터 로드 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <div className="loading">📊 참여율 데이터를 집계 중입니다...</div>;
  }

  return (
    <div className="wrap">
      <div className="header-area">
        <h2>📊 멤버별 레이드 참여율 확인</h2>
        <button className="refresh-btn" onClick={loadData}>🔄 새로고침</button>
      </div>

      <div className="tabs">
        <button className={week === 1 ? "active" : ""} onClick={() => setWeek(1)}>1주차 내역</button>
        <button className={week === 2 ? "active" : ""} onClick={() => setWeek(2)}>2주차 내역</button>
      </div>

      <div className="info-card">
        📢 현재 <b>{week}주차</b> 실시간 활성화 만점 기준은 <span className="point-text">{totalBossScore}점</span> 입니다.
      </div>

      <div className="list-container">
        <div className="table-header">
          <span>이름</span>
          <span>참여 점수 / 만점</span>
          <span>최종 참여율</span>
        </div>
        
        {memberStats.map((m) => {
          const percent = Math.round(m.rate * 100);
          return (
            <div key={m.id} className={`row ${percent === 100 ? "perfect" : ""}`}>
              <span className="member-name">{m.name}</span>
              <span className="member-score">{m.earnedScore}점 / {totalBossScore}점</span>
              <span className={`participation-rate p-${percent}`}>
                {percent}%
              </span>
            </div>
          );
        })}
      </div>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .wrap { padding: 24px; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif; background-color: #f8fafc; min-height: 100vh; box-sizing: border-box; }
        .loading { padding: 80px; text-align: center; font-size: 16px; color: #64748b; font-weight: 600; }
        
        .header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header-area h2 { color: #1e293b; font-size: 22px; font-weight: 800; margin: 0; }
        
        .refresh-btn { background: #e2e8f0; color: #475569; font-size: 13px; padding: 8px 14px; border-radius: 12px; border: none; cursor: pointer; font-weight: bold; transition: all 0.2s; }
        .refresh-btn:hover { background: #cbd5e1; }

        .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .tabs button { flex: 1; padding: 12px 0; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; background: white; color: #64748b; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; }
        .tabs button.active { background: #3b82f6; color: white; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
        
        .info-card { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 14px 18px; border-radius: 14px; font-size: 14px; margin-bottom: 20px; }
        .info-card b { font-weight: 800; }
        .point-text { color: #2563eb; font-weight: 800; font-size: 16px; }

        .list-container { background: white; border-radius: 16px; padding: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9; }
        .table-header { display: flex; justify-content: space-between; padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 700; border-bottom: 2px solid #f1f5f9; }
        .table-header span:nth-child(2) { flex: 1; text-align: right; padding-right: 40px; }
        
        .row { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .row:last-child { border-bottom: none; }
        .row:hover { background-color: #f8fafc; }
        .row.perfect { background-color: #f0fdf4; }
        
        .member-name { font-size: 15px; font-weight: 700; color: #0f172a; width: 100px; }
        .member-score { font-size: 14px; color: #64748b; font-weight: 500; flex: 1; text-align: right; padding-right: 40px; }
        
        .participation-rate { font-size: 14px; font-weight: 700; padding: 4px 12px; border-radius: 10px; min-width: 45px; text-align: center; }
        .p-100 { background: #dcfce7; color: #15803d; }
        .participation-rate:not(.p-100) { background: #f1f5f9; color: #475569; }
        
        @media (max-width: 480px) {
          .wrap { padding: 16px 8px; }
          .header-area h2 { font-size: 18px; }
          .table-header span:nth-child(2), .member-score { padding-right: 15px; }
          .member-name { width: 70px; font-size: 14px; }
          .member-score { font-size: 12px; }
          .participation-rate { font-size: 12px; padding: 4px 8px; min-width: 35px; }
        }
      `}</style>
    </div>
  );
}