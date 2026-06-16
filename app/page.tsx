"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; attack: number; defense: number; };

export default function DashboardPage() {
  const [dataReady, setDataReady] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [avgAttack, setAvgAttack] = useState(0);
  const [avgDefense, setAvgDefense] = useState(0);
  
  // 주차별 참여율 및 TOP 5
  const [week1Rate, setWeek1Rate] = useState(0);
  const [week2Rate, setWeek2Rate] = useState(0);
  const [week1Top, setWeek1Top] = useState<any[]>([]);
  const [week2Top, setWeek2Top] = useState<any[]>([]);
  
  // 주차별 분배금
  const [week1Money, setWeek1Money] = useState(0);
  const [week2Money, setWeek2Money] = useState(0);

  const loadingRef = useRef(false);

  useEffect(() => {
    loadDashboard();

    // 실시간 동기화 채널 설정
    const channel = supabase
      .channel("dashboard-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => safeReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "distribute_settings" }, () => safeReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => safeReload())
      .on("postgres_changes", { event: "*", schema: "public", table: "bosses" }, () => safeReload())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function safeReload() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setTimeout(() => {
      loadDashboard()
        .catch((e) => console.error("실시간 동기화 에러:", e))
        .finally(() => { loadingRef.current = false; });
    }, 200);
  }

  async function loadDashboard() {
    let members: any[] = [];
    let bosses: any[] = [];
    let attendance: any[] = [];
    let distributeSettings: any[] = [];

    try {
      const [mRes, bRes, aRes, dRes] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("bosses").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("distribute_settings").select("*")
      ]);
      
      members = mRes.data || [];
      bosses = bRes.data || [];
      attendance = aRes.data || [];
      distributeSettings = dRes.data || [];
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }

    if (members.length === 0) return;

    // 1. 길드원 상단 스탯 계산
    setTotalMembers(members.length);
    const attackAvg = members.reduce((s, m) => s + (m.attack || 0), 0) / members.length;
    const defenseAvg = members.reduce((s, m) => s + (m.defense || 0), 0) / members.length;
    setAvgAttack(Math.round(attackAvg));
    setAvgDefense(Math.round(defenseAvg));

    // 2. 분배금 데이터 바인딩 (total_diamond 매칭 보정)
    let w1M = 0;
    let w2M = 0;
    if (distributeSettings && distributeSettings.length > 0) {
      const d1 = distributeSettings.find((d) => Number(d.week) === 1);
      const d2 = distributeSettings.find((d) => Number(d.week) === 2);
      if (d1) w1M = Number(d1.total_diamond || 0);
      if (d2) w2M = Number(d2.total_diamond || 0);
    }
    setWeek1Money(w1M);
    setWeek2Money(w2M);

    // 3. 주차별 참여도 연산 실행
    const w1Result = calculateWeekProcess(1, members, bosses, attendance);
    const w2Result = calculateWeekProcess(2, members, bosses, attendance);

    // 4. 상태 저장
    setWeek1Rate(w1Result.avgRate);
    setWeek1Top(w1Result.top5);
    setWeek2Rate(w2Result.avgRate);
    setWeek2Top(w2Result.top5);

    setDataReady(true);
  }

  function calculateWeekProcess(week: number, members: Member[], allBosses: any[], allAttendance: any[]) {
    const weekBosses = allBosses.filter((b) => Number(b.week) === week);
    const bossIds = weekBosses.map((b) => String(b.id || "").trim().toLowerCase());

    if (weekBosses.length === 0) {
      return { avgRate: 0, top5: [] };
    }

    const memberRates = members.map((member) => {
      const attendedRows = allAttendance.filter((a) => {
        const dbName = String(a.user_name || "").replace(/\s+/g, "");
        const targetName = String(member.name || "").replace(/\s+/g, "");
        
        const isNameMatch = dbName === targetName;
        const isBossMatch = bossIds.includes(String(a.boss_id || "").trim().toLowerCase());
        
        // 🛠️ [핵심 수정]: attended 가 아니라 스크린샷의 'checked' 컬럼을 바라보도록 변경
        const isAttended = a.checked === true || 
                           String(a.checked).toUpperCase() === "TRUE" || 
                           Number(a.checked) === 1;

        return isNameMatch && isBossMatch && isAttended;
      });

      const uniqueCount = new Set(attendedRows.map((a) => String(a.boss_id).trim().toLowerCase())).size;
      const rate = Math.round((uniqueCount / weekBosses.length) * 100);

      return { name: member.name, rate };
    });

    const totalRateSum = memberRates.reduce((s, r) => s + r.rate, 0);
    const avgRate = Math.round(totalRateSum / memberRates.length);
    
    // TOP 5 정렬: 참여율 높은 순 -> 이름 순
    const sorted = [...memberRates].sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name));
    
    // 한 명이라도 참여율이 있으면 TOP 5 표기, 전원 0%면 데이터 없음으로 안전 처리
    const hasRealData = sorted.some(u => u.rate > 0);
    const top5 = hasRealData ? sorted.slice(0, 5) : [];

    return { avgRate, top5 };
  }

  return (
    <div className="page">
      <h1 className="title">🌸 길드 대시보드</h1>
      {!dataReady && <p className="loading-text">데이터 동기화 중...</p>}

      <div className="stats">
        <Card title="👥 총 길드원" value={`${totalMembers} 명`} color="#ff5fa2" />
        <Card title="⚔ 평균 공격력" value={avgAttack.toLocaleString()} color="#b37feb" />
        <Card title="🛡 평균 방어력" value={avgDefense.toLocaleString()} color="#69c0ff" />
      </div>

      <div className="section">
        <div className="box">
          <h2>📅 1주차 참여율</h2>
          <div className="big">{week1Rate}%</div>
          <div className="top-list">
            <h3>👑 1주차 TOP 5</h3>
            {week1Top.length > 0 ? (
              week1Top.map((user, idx) => (
                <div key={`${user.name}-w1-${idx}`} className="top-item">
                  <span>{idx + 1}등. {user.name}</span>
                  <span className="rate-badge">{user.rate}%</span>
                </div>
              ))
            ) : <p className="empty-text">데이터가 없습니다.</p>}
          </div>
        </div>

        <div className="box">
          <h2>📅 2주차 참여율</h2>
          <div className="big">{week2Rate}%</div>
          <div className="top-list">
            <h3>👑 2주차 TOP 5</h3>
            {week2Top.length > 0 ? (
              week2Top.map((user, idx) => (
                <div key={`${user.name}-w2-${idx}`} className="top-item">
                  <span>{idx + 1}등. {user.name}</span>
                  <span className="rate-badge">{user.rate}%</span>
                </div>
              ))
            ) : <p className="empty-text">데이터가 없습니다.</p>}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="box">
          <h2>💰 1주차 총 분배금</h2>
          <div className="big money">{week1Money ? week1Money.toLocaleString() : "0"} <span className="unit">다이아</span></div>
        </div>
        <div className="box">
          <h2>💰 2주차 총 분배금</h2>
          <div className="big money">{week2Money ? week2Money.toLocaleString() : "0"} <span className="unit">다이아</span></div>
        </div>
      </div>

      <style jsx>{`
        .page { padding: 40px 20px; background: radial-gradient(circle at top, #fff8fc, #f7f3ff); min-height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; }
        .title { font-size: 40px; font-weight: 900; color: #ff5fa2; margin-bottom: 30px; text-align: center; }
        .loading-text { color: #ff5fa2; font-weight: bold; margin-bottom: 20px; }
        .stats { width: 100%; max-width: 1100px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 10px; }
        .section { width: 100%; max-width: 1100px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 20px; }
        .box { background: white; padding: 26px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255, 95, 162, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03); display: flex; flex-direction: column; border: 1px solid rgba(255, 95, 162, 0.08); }
        .box h2 { font-size: 18px; color: #555; margin: 0 0 12px 0; }
        .big { font-size: 44px; font-weight: 900; color: #ff5fa2; line-height: 1.2; margin-bottom: 16px; }
        .big.money { color: #9254de; }
        .unit { font-size: 20px; font-weight: 700; color: #888; margin-left: 4px; }
        .top-list { margin-top: 15px; background: #faf6ff; padding: 16px; border-radius: 16px; border: 1px dashed #e8d9f5; }
        .top-list h3 { font-size: 15px; color: #722ed1; margin: 0 0 10px 0; font-weight: 700; }
        .top-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; color: #444; font-weight: 600; border-bottom: 1px solid rgba(0, 0, 0, 0.02); }
        .top-item:last-child { border-bottom: none; }
        .rate-badge { background: #ffecf2; color: #ff5fa2; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .empty-text { font-size: 13px; color: #999; margin: 0; text-align: center; }
        @media (max-width: 768px) {
          .title { font-size: 32px; }
          .stats { grid-template-columns: 1fr; gap: 12px; }
          .section { grid-template-columns: 1fr; gap: 16px; margin-top: 16px; }
          .box { padding: 20px; }
          .big { font-size: 36px; }
        }
      `}</style>
    </div>
  );
}

// 상단 요약 카드 컴포넌트
function Card({ title, value, color }: any) {
  return (
    <div className="card">
      <p className="card-title">{title}</p>
      <h2 className="card-value" style={{ color: color }}>{value}</h2>
      <style jsx>{`
        .card { background: white; padding: 22px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); border: 1px solid rgba(0, 0, 0, 0.02); transition: transform 0.2s ease; }
        .card:hover { transform: translateY(-2px); }
        .card-title { font-size: 15px; color: #666; margin: 0 0 8px 0; font-weight: 600; }
        .card-value { font-size: 32px; font-weight: 900; margin: 0; }
      `}</style>
    </div>
  );
}