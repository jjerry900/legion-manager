"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  attack: number;
  defense: number;
};

type Boss = {
  id: string;
  week: number;
};

type Attendance = {
  member_id: string;
  boss_id: string;
  attended: boolean;
};

type Distribute = {
  week: number;
  amount: number;
};

export default function DashboardPage() {
  const [totalMembers, setTotalMembers] = useState(0);

  const [avgAttack, setAvgAttack] = useState(0);
  const [avgDefense, setAvgDefense] = useState(0);

  const [week1Rate, setWeek1Rate] = useState(0);
  const [week2Rate, setWeek2Rate] = useState(0);

  const [week1Top, setWeek1Top] = useState<any[]>([]);
  const [week2Top, setWeek2Top] = useState<any[]>([]);

  const [week1Money, setWeek1Money] = useState(0);
  const [week2Money, setWeek2Money] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data: members } = await supabase.from("members").select("*");
    const { data: bosses } = await supabase.from("bosses").select("*");
    const { data: attendance } = await supabase.from("attendance").select("*");
    const { data: distribute } = await supabase.from("distribute").select("*");

    if (!members) return;

    setTotalMembers(members.length);

    const attackAvg =
      members.reduce((sum, m) => sum + (m.attack || 0), 0) /
      (members.length || 1);

    const defenseAvg =
      members.reduce((sum, m) => sum + (m.defense || 0), 0) /
      (members.length || 1);

    setAvgAttack(Math.round(attackAvg));
    setAvgDefense(Math.round(defenseAvg));

    const week1Dist =
      distribute?.filter((d) => d.week === 1).reduce((s, d) => s + Number(d.amount), 0) || 0;

    const week2Dist =
      distribute?.filter((d) => d.week === 2).reduce((s, d) => s + Number(d.amount), 0) || 0;

    setWeek1Money(week1Dist);
    setWeek2Money(week2Dist);

    calculateWeek(1, members, bosses || [], attendance || []);
    calculateWeek(2, members, bosses || [], attendance || []);
  }

 function calculateWeek(
  week: number,
  members: any[],
  bosses: any[],
  attendance: any[]
) {
  const weekBosses = bosses.filter((b) => b.week === week);
  const bossIds = weekBosses.map((b) => b.id);

  const result = members.map((member) => {
    const attendedBossSet = new Set(
      attendance
        .filter(
          (a) =>
            a.user_name === member.name &&
            a.checked === true &&
            bossIds.includes(a.boss_id)
        )
        .map((a) => a.boss_id)
    );

    const rate =
      weekBosses.length === 0
        ? 0
        : Math.round((attendedBossSet.size / weekBosses.length) * 100);

    return {
      name: member.name,
      rate,
    };
  });

  const avgRate =
    result.reduce((sum, r) => sum + r.rate, 0) / (result.length || 1);

  const top5 = [...result].sort((a, b) => b.rate - a.rate).slice(0, 5);

  if (week === 1) {
    setWeek1Rate(Math.round(avgRate));
    setWeek1Top(top5);
  } else {
    setWeek2Rate(Math.round(avgRate));
    setWeek2Top(top5);
  }
}

  return (
    <div className="page">
      <h1 className="title">🌸 길드 대시보드</h1>

      {/* STATS */}
      <div className="stats">
        <Card title="👥 총 길드원" value={totalMembers} color="pink" />
        <Card title="⚔ 평균 공격력" value={avgAttack} color="purple" />
        <Card title="🛡 평균 방어력" value={avgDefense} color="blue" />
      </div>

      {/* 참여율 */}
      <div className="section">
        <div className="box">
          <h2>📅 1주차 참여율</h2>
          <div className="big">{week1Rate}%</div>
        </div>

        <div className="box">
          <h2>📅 2주차 참여율</h2>
          <div className="big">{week2Rate}%</div>
        </div>
      </div>

      {/* 분배금 */}
      <div className="section">
        <div className="box">
          <h2>💰 1주차 총 분배금</h2>
          <div className="big">{week1Money.toLocaleString()}</div>
        </div>

        <div className="box">
          <h2>💰 2주차 총 분배금</h2>
          <div className="big">{week2Money.toLocaleString()}</div>
        </div>
      </div>

      {/* TOP */}
      <div className="section">
        <div className="box">
          <h2>🏆 1주 참여율 TOP5</h2>
          {week1Top.map((m, i) => (
            <div key={i} className="rank">
              {i + 1}위 {m.name}
              <span>{m.rate}%</span>
            </div>
          ))}
        </div>

        <div className="box">
          <h2>🏆 2주 참여율 TOP5</h2>
          {week2Top.map((m, i) => (
            <div key={i} className="rank">
              {i + 1}위 {m.name}
              <span>{m.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* STYLE */}
      <style jsx>{`
        .page {
          padding: 40px;
          background: radial-gradient(circle at top, #fff8fc, #f7f3ff);
          min-height: 100vh;

          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .title {
          font-size: 48px;
          font-weight: 900;
          color: #ff5fa2;
          margin-bottom: 30px;
          letter-spacing: -1px;
        }

        .stats {
          width: 100%;
          max-width: 1100px;

          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .section {
          width: 100%;
          max-width: 1100px;

          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;

          margin-top: 25px;
        }

        .box {
          background: white;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
        }

        .box h2 {
          font-size: 22px;
          margin-bottom: 12px;
          color: #6a5cff;
        }

        .big {
          font-size: 42px;
          font-weight: 900;
          color: #ff5fa2;
        }

        .rank {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          margin-top: 10px;
          background: #faf8ff;
          border-radius: 14px;
          font-weight: 700;
        }

        .rank span {
          color: #ff5fa2;
        }
      `}</style>
    </div>
  );
}

/* CARD */
function Card({ title, value, color }: any) {
  const glow =
    color === "pink"
      ? "rgba(255, 105, 180, 0.35)"
      : color === "purple"
      ? "rgba(140, 120, 255, 0.35)"
      : "rgba(80, 180, 255, 0.35)";

  return (
    <div
      className="
        relative
        rounded-[18px]
        p-6
        flex flex-col
        items-start
        gap-2
        overflow-hidden
        border border-white/20
        bg-black/10
        backdrop-blur-md
        shadow-[0_0_25px_rgba(0,0,0,0.25)]
        hover:scale-[1.03]
        transition
      "
      style={{
        boxShadow: `0 0 25px ${glow}`,
      }}
    >
      {/* glow overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.15), transparent 60%)",
        }}
      />

      {/* top label */}
      <p className="text-xs tracking-[2px] uppercase text-white/70 z-10">
        {title}
      </p>

      {/* value */}
      <h2 className="text-4xl font-black text-white z-10">
        {value}
      </h2>

      {/* bottom bar */}
      <div
        className="w-full h-[3px] mt-2 rounded-full z-10"
        style={{
          background: glow,
        }}
      />
    </div>
  );
}