"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string };

type Boss = {
  id: string;
  name: string;
  day: string;
  date: string;
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

  const [bossName, setBossName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [open, setOpen] = useState(false);

  const [temp, setTemp] = useState<Record<string, boolean>>({});
  const [pw, setPw] = useState("");

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

  function pickDate(v: string) {
    setSelectedDate(v);
    const d = new Date(v);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    setSelectedDay(days[d.getDay()]);
  }

  async function addBoss() {
    if (!bossName || !selectedDate) return;

    await supabase.from("bosses").insert({
      name: bossName,
      date: selectedDate,
      day: selectedDay,
    });

    setBossName("");
    setSelectedDate("");
    setSelectedDay("");
    load();
  }

  function openBoss(b: Boss) {
    setSelectedBoss(b);
    setOpen(true);

    const initial: Record<string, boolean> = {};
    members.forEach((m) => {
      const found = att.find(
        (a) =>
          a.boss_id === b.id &&
          a.user_name === m.name &&
          a.checked
      );
      initial[m.name] = !!found;
    });

    setTemp(initial);
  }

  function toggle(name: string) {
    setTemp((p) => ({ ...p, [name]: !p[name] }));
  }

  function rate(bossId: string) {
    const total = members.length || 1;

    const checked = members.filter((m) =>
      att.some(
        (a) =>
          a.boss_id === bossId &&
          a.user_name === m.name &&
          a.checked
      )
    ).length;

    return Math.round((checked / total) * 100);
  }

  async function save() {
    if (!selectedBoss) return;

    if (pw !== "1234") {
      alert("비밀번호 틀림");
      return;
    }

    const rows = members.map((m) => ({
      boss_id: selectedBoss.id,
      user_name: m.name,
      checked: !!temp[m.name],
    }));

    await supabase.from("attendance").insert(rows);

    setTemp({});
    setOpen(false);
    setPw("");
    load();
  }

  const box = {
    background: "#fff",
    padding: 12,
    borderRadius: 12,
  };

  const input = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: 9,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ padding: 18, background: "#f7f7ff", minHeight: "100vh" }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>⚔ 보스 시스템</h2>

      {/* INPUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div style={box}>
          📅 날짜
          <input type="date" value={selectedDate} onChange={(e) => pickDate(e.target.value)} style={input} />
        </div>

        <div style={box}>
          ⚔ 보스
          <input
            value={bossName}
            onChange={(e) => setBossName(e.target.value)}
            style={input}
            placeholder="보스 이름"
          />
        </div>
      </div>

      <button
        onClick={addBoss}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 10,
          borderRadius: 12,
          border: "none",
          background: "#ff6fae",
          color: "#fff",
          fontSize: 14,
        }}
      >
        ➕ 등록
      </button>

      {/* LIST */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginTop: 12,
        }}
      >
        {bosses.map((b) => (
          <div
            key={b.id}
            onClick={() => openBoss(b)}
            style={{
              ...box,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>⚔ {b.name}</div>
            <div style={{ fontSize: 12, color: "#777" }}>
              {b.date} ({b.day})
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              📊 {rate(b.id)}%
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {open && selectedBoss && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 12,
          }}
        >
          <div
            style={{
              width: 340,
              background: "#fff",
              borderRadius: 14,
              padding: 14,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ fontSize: 16 }}>🐰 {selectedBoss.name}</h3>

              {/* SHORT CLOSE BUTTON */}
              <button
                onClick={() => {
                  setOpen(false);
                  setTemp({});
                  setPw("");
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "none",
                  background: "#eee",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>

            {/* MEMBER LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 4px",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: 13,
                  }}
                >
                  {m.name}
                  <input
                    type="checkbox"
                    checked={!!temp[m.name]}
                    onChange={() => toggle(m.name)}
                  />
                </div>
              ))}
            </div>

            {/* PASSWORD */}
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="관리자 비밀번호"
              style={{
                ...input,
                marginTop: 10,
              }}
            />

            {/* SAVE */}
            <button
              onClick={save}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                border: "none",
                background: "#ff6fae",
                color: "#fff",
                fontSize: 14,
              }}
            >
              💾 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}