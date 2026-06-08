"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Boss = {
  id: string;
  week: number;
  day: string;
  boss_name: string;
};

const DAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
];

export default function BossPage() {
  const [week, setWeek] = useState(1);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [bossName, setBossName] = useState("");
  const [day, setDay] = useState("월요일");

  useEffect(() => {
    loadBosses();
  }, []);

  async function loadBosses() {
    const { data } = await supabase
      .from("bosses")
      .select("*")
      .order("week");

    setBosses(data || []);
  }

  async function addBoss() {
    if (!bossName.trim()) {
      alert("보스명을 입력하세요.");
      return;
    }

    const { error } = await supabase
      .from("bosses")
      .insert({
        week,
        day,
        boss_name: bossName,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setBossName("");
    loadBosses();
  }

  async function deleteBoss(id: string) {
    if (!confirm("삭제할까요?")) return;

    await supabase
      .from("bosses")
      .delete()
      .eq("id", id);

    loadBosses();
  }

  return (
    <div className="page">

      <h1>🐲 보스 일정 관리</h1>

      <div className="addBox">

        <select
          value={week}
          onChange={(e) =>
            setWeek(Number(e.target.value))
          }
        >
          <option value={1}>1주차</option>
          <option value={2}>2주차</option>
        </select>

        <select
          value={day}
          onChange={(e) =>
            setDay(e.target.value)
          }
        >
          {DAYS.map((d) => (
            <option key={d}>
              {d}
            </option>
          ))}
        </select>

        <input
          value={bossName}
          onChange={(e) =>
            setBossName(e.target.value)
          }
          placeholder="보스명 입력"
        />

        <button onClick={addBoss}>
          추가
        </button>

      </div>

      {[1, 2].map((weekNo) => (
        <div
          className="weekCard"
          key={weekNo}
        >
          <h2>
            📅 {weekNo}주차
          </h2>

          {DAYS.map((dayName) => {

            const dayBosses =
              bosses.filter(
                (b) =>
                  b.week === weekNo &&
                  b.day === dayName
              );

            return (
              <div
                key={dayName}
                className="dayBox"
              >

                <h3>
                  {dayName}
                </h3>

                {dayBosses.length === 0 && (
                  <p>
                    등록된 보스 없음
                  </p>
                )}

                {dayBosses.map((boss) => (

                  <div
                    className="bossRow"
                    key={boss.id}
                  >

                    <span>
                      🐉 {boss.boss_name}
                    </span>

                    <button
                      onClick={() =>
                        deleteBoss(
                          boss.id
                        )
                      }
                    >
                      삭제
                    </button>

                  </div>

                ))}

              </div>
            );
          })}
        </div>
      ))}

      <style jsx>{`
        .page{
          padding:40px;
        }

        h1{
          font-size:42px;
          color:#ff67b1;
          margin-bottom:20px;
        }

        .addBox{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:30px;
        }

        select,
        input{
          padding:14px;
          border-radius:15px;
          border:1px solid #ddd;
          font-size:18px;
        }

        button{
          border:none;
          background:#ff8cc8;
          color:white;
          font-weight:700;
          padding:14px 20px;
          border-radius:15px;
          cursor:pointer;
        }

        .weekCard{
          background:white;
          padding:25px;
          border-radius:25px;
          margin-bottom:25px;
          box-shadow:
            0 5px 15px rgba(0,0,0,.08);
        }

        .dayBox{
          margin-top:20px;
          padding:15px;
          border-radius:20px;
          background:#faf8ff;
        }

        .dayBox h3{
          color:#8672ff;
          margin-bottom:10px;
        }

        .bossRow{
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:12px;
          background:white;
          border-radius:12px;
          margin-top:10px;
        }
      `}</style>

    </div>
  );
}