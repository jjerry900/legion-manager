"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = { id: string; name: string; };
type Boss = { id: string; name: string; day: string; date: string; };
type Attendance = { id: string; boss_id: string; user_name: string; checked: boolean; };

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);

  const [bossName, setBossName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [page, setPage] = useState(1);

const PAGE_SIZE = 10;

  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<Record<string, boolean>>({});
  const [pw, setPw] = useState("");

  const [searchDate, setSearchDate] = useState("");

  async function load() {
    const [m, b, a] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("bosses").select("*").order("date"),
      supabase.from("attendance").select("*"),
    ]);
    setMembers(m.data ?? []);
    setBosses(b.data ?? []);
    setAtt(a.data ?? []);
  }

  useEffect(() => { load(); }, []);

  function pickDate(value: string) {
    setSelectedDate(value);
    const d = new Date(value);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    setSelectedDay(days[d.getDay()]);
  }

  async function addBoss() {
  if (!bossName.trim()) {
    alert("보스 이름 입력");
    return;
  }

  if (!selectedDate) {
    alert("날짜 선택");
    return;
  }

  const { data, error } = await supabase
    .from("bosses")
    .insert([
      {
        name: bossName,
        date: selectedDate,
        day: selectedDay,
      },
    ])
    .select();

  console.log("insert result", data);
  console.log("insert error", error);

  if (error) {
    alert(error.message);
    return;
  }

  await load();

  setBossName("");
  setSelectedDate("");
  setSelectedDay("");
}

  async function deleteBoss(bossId: string) {
  const password = prompt("관리자 비밀번호를 입력하세요.");

  if (password !== "1234") {
    alert("비밀번호가 틀렸습니다.");
    return;
  }

  if (!confirm("정말 삭제하시겠습니까?")) {
    return;
  }

  const { error: attendanceError } = await supabase
    .from("attendance")
    .delete()
    .eq("boss_id", bossId);

  if (attendanceError) {
    alert(attendanceError.message);
    return;
  }

  const { error: bossError } = await supabase
    .from("bosses")
    .delete()
    .eq("id", bossId);

  if (bossError) {
    alert(bossError.message);
    return;
  }

  if (selectedBoss?.id === bossId) {
    setSelectedBoss(null);
    setOpen(false);
  }

  load();
}

  async function resetAll() {
  const password = prompt("관리자 비밀번호를 입력하세요.");

  if (password !== "1234") {
    alert("비밀번호가 틀렸습니다.");
    return;
  }

  if (!confirm("모든 데이터를 삭제합니다. 정말 진행하시겠습니까?")) {
    return;
  }

  const { error: attendanceError } = await supabase
    .from("attendance")
    .delete()
    .not("id", "is", null);

  if (attendanceError) {
    alert(attendanceError.message);
    return;
  }

  const { error: bossError } = await supabase
    .from("bosses")
    .delete()
    .not("id", "is", null);

  if (bossError) {
    alert(bossError.message);
    return;
  }

  alert("전체 초기화 완료");
  load();
}

  function openBoss(b: Boss) {
  setSelectedBoss(b);
  setOpen(true);
  setPage(1);

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

  function toggle(name: string) { setTemp((prev) => ({ ...prev, [name]: !prev[name] })); }

  function rate(bossId: string) {
    const total = members.length || 1;
    const checked = members.filter((m) => att.some((a) => a.boss_id === bossId && a.user_name === m.name && a.checked)).length;
    return Math.round((checked / total) * 100);
  }

  const filteredBosses = bosses.filter((boss) => !searchDate || boss.date === searchDate);

  async function save() {
    if (!selectedBoss || pw !== "1234") { alert("비밀번호를 확인하세요."); return; }
    const rows = members.map((m) => ({ boss_id: selectedBoss.id, user_name: m.name, checked: !!temp[m.name] }));
    await supabase.from("attendance").delete().eq("boss_id", selectedBoss.id);
    await supabase.from("attendance").insert(rows);
    setTemp({}); setPw(""); setOpen(false); load();
  }
  const totalPages = Math.ceil(
  members.length / PAGE_SIZE
);

const currentMembers = members.slice(
  (page - 1) * PAGE_SIZE,
  page * PAGE_SIZE
);

  const box = { background: "#fff", padding: 12, borderRadius: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" };
  const input = { width: "100%", boxSizing: "border-box" as const, padding: 10, borderRadius: 10, border: "1px solid #ddd", fontSize: 14, outline: "none" };

  return (
    <div style={{ padding: 18, background: "#f7f7ff", minHeight: "100vh", maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>⚔ 보스 시스템</h2>

      <div style={{ ...box, marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input type="date" value={selectedDate} onChange={(e) => pickDate(e.target.value)} style={input} />
          <input value={bossName} onChange={(e) => setBossName(e.target.value)} style={input} placeholder="보스 이름" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addBoss} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#ff6fae", color: "#fff", cursor: "pointer" }}>➕ 등록</button>
          <button onClick={resetAll} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#ff4d4f", color: "#fff", cursor: "pointer" }}>🗑 전체 초기화</button>
        </div>
      </div>

      <div style={{ ...box, display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} style={input} />
        <button onClick={() => setSearchDate("")} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#666", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>전체</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filteredBosses.map((b) => (
          <div key={b.id} style={{ ...box, position: "relative" }}>
            <button onClick={() => deleteBoss(b.id)} style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, border: "none", borderRadius: 8, background: "#ff4d4f", color: "#fff", cursor: "pointer" }}>✕</button>
            <div onClick={() => openBoss(b)} style={{ cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>⚔ {b.name}</div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>{b.date} ({b.day})</div>
              <div style={{ marginTop: 6, fontSize: 12 }}>📊 참여율 {rate(b.id)}%</div>
            </div>
          </div>
        ))}
      </div>

      {open && selectedBoss && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", padding: 12 }}>
          <div style={{ width: 320, background: "#fff", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <h3>🐰 {selectedBoss.name}</h3>
              <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>✕</button>
            </div>
            {currentMembers.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>{m.name}</span>
                <input type="checkbox" checked={!!temp[m.name]} onChange={() => toggle(m.name)} />
              </div>
            ))}
            <div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  }}
>
  <button
    disabled={page === 1}
    onClick={() => setPage(page - 1)}
    style={{
      padding: "6px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
    }}
  >
    ◀
  </button>

  <span>
    {page} / {totalPages}
  </span>

  <button
    disabled={page === totalPages}
    onClick={() => setPage(page + 1)}
    style={{
      padding: "6px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
    }}
  >
    ▶
  </button>
</div>
            <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ ...input, marginTop: 12 }} />
            <button onClick={save} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, border: "none", background: "#ff6fae", color: "#fff" }}>💾 저장</button>
          </div>
        </div>
      )}
    </div>
  );
}