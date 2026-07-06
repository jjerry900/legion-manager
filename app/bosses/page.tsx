"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  attack: number;
};

type Boss = {
  id: string;
  name: string;
  day: string;
  date: string;
  week: number;
  boss_score: number;
};

type Attendance = {
  id: string;
  boss_id: string;
  user_name: string;
  checked: boolean;
  earned_score: number;
};

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // 보스 생성 상태
  const [bossName, setBossName] = useState("");
  const [bossScore, setBossScore] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [bossWeek, setBossWeek] = useState<1 | 2>(1);

  // 모달 및 관리 상태
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [open, setOpen] = useState(false);
  const [checkedNames, setCheckedNames] = useState<string[]>([]);
  const [pw, setPw] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // 필터링 상태
  const [searchDate, setSearchDate] = useState("");
  const [viewTab, setViewTab] = useState<0 | 1 | 2>(0);

  // ✅ [추가] 외부 데이터 초기화 함수
  async function resetAllData() {
    const pwCheck = prompt("관리자 비밀번호를 입력하세요.");
    if (pwCheck !== "1234") return alert("비밀번호가 올바르지 않습니다.");
    if (!confirm("정말 모든 데이터를 초기화하시겠습니까? (복구 불가)")) return;

    setLoading(true);
    try {
      // 보스 데이터 삭제 (연관된 출석도 삭제되도록 설정 필요, 일단 테이블별 삭제)
      await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("bosses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await load();
      alert("모든 데이터가 초기화되었습니다.");
    } catch (err: any) {
      alert("오류 발생: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [m, b, a] = await Promise.all([
        supabase.from("members").select("*").range(0, 999).order("name", { ascending: true }),
        supabase.from("bosses").select("*").range(0, 999).order("date", { ascending: false }),
        supabase.from("attendance").select("*").range(0, 49999)
      ]);

      const updatedMembers = m.data ?? [];
      const updatedBosses = b.data ?? [];
      const updatedAtt = a.data ?? [];

      setMembers(updatedMembers);
      setBosses(updatedBosses);
      setAtt(updatedAtt);

      return { updatedAtt };
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      return { updatedAtt: [] };
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function pickDate(value: string) {
    setSelectedDate(value);
    const d = new Date(value);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    setSelectedDay(days[d.getDay()]);
  }

  async function addBoss() {
    if (!bossName.trim()) return alert("보스 식별 이름을 입력해 주세요.");
    if (!selectedDate) return alert("날짜를 선택해 주세요.");
    if (bossScore < 0) return alert("보스 점수는 0점 이상이어야 합니다.");

    const { error } = await supabase.from("bosses").insert([
      {
        name: bossName.trim(),
        date: selectedDate,
        day: selectedDay,
        week: bossWeek,
        boss_score: bossScore,
      },
    ]);

    if (error) return alert(error.message);

    setBossName("");
    setBossScore(0);
    setSelectedDate("");
    
    await load();
  }

  async function deleteBoss(e: React.MouseEvent, bossId: string) {
    e.stopPropagation();
    const pwCheck = prompt("관리자 비밀번호를 입력하세요.");
    if (pwCheck !== "1234") return alert("비밀번호가 올바르지 않습니다.");
    if (!confirm("정말 삭제하시겠습니까?")) return;

    await supabase.from("attendance").delete().eq("boss_id", bossId);
    await supabase.from("bosses").delete().eq("id", bossId);
    await load();
  }

  async function openBoss(b: Boss) {
    if (members.length === 0) return alert("명단을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    if (!b.id) return alert("올바르지 않은 보스 데이터입니다.");
    
    setLoading(true);
    try {
      const { data: realTimeAtt, error } = await supabase
        .from("attendance")
        .select("user_name, checked")
        .eq("boss_id", b.id);

      if (error) throw error;

      const activeChecked = (realTimeAtt ?? [])
        .filter((a) => a.checked === true)
        .map((a) => String(a.user_name).trim());
      
      const matchedNames = members
        .filter((m) => activeChecked.some((name) => name.toLowerCase() === String(m.name).trim().toLowerCase()))
        .map((m) => String(m.name).trim());
      
      setSelectedBoss(b);
      setCheckedNames(matchedNames);
      setPw("");
      setOpen(true);
    } catch (err) {
      console.error(err);
      alert("기존 정산 데이터를 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleMember(memberName: string) {
    const targetName = memberName.trim();
    setCheckedNames((prev) => {
      const isExist = prev.some((n) => n.toLowerCase() === targetName.toLowerCase());
      if (isExist) {
        return prev.filter((n) => n.toLowerCase() !== targetName.toLowerCase());
      } else {
        return [...prev, targetName];
      }
    });
  }

  async function save() {
    if (!selectedBoss || !selectedBoss.id) return alert("정산할 보스가 선택되지 않았습니다.");
    if (pw !== "1234") return alert("비밀번호가 일치하지 않습니다.");
    if (saveLoading) return;

    setSaveLoading(true);
    try {
      const rows = checkedNames.map((name) => ({
        boss_id: selectedBoss.id,
        user_name: name.trim(),
        checked: true,
        earned_score: selectedBoss.boss_score,
      }));

      const { error } = await supabase.rpc("save_attendance_v2", {
        target_boss_id: selectedBoss.id,
        rows_to_insert: rows,
      });

      if (error) throw error;

      setPw("");
      setOpen(false);
      
      await load();
      alert("출석 정산 및 누적 점수 동기화가 안전하게 완료되었습니다.");
    } catch (err: any) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다: " + (err.message || err));
    } finally {
      setSaveLoading(false);
    }
  }

  const getMemberTotalEarnedScore = (memberName: string) => {
    const trimmedName = String(memberName).trim().toLowerCase();
    return att
      .filter((a) => String(a.user_name).trim().toLowerCase() === trimmedName && a.checked === true)
      .reduce((sum, current) => sum + (current.earned_score ?? 0), 0);
  };

  const filteredBosses = bosses.filter((b) => {
    const matchDate = !searchDate || b.date === searchDate;
    const matchWeek = viewTab === 0 || b.week === viewTab;
    return matchDate && matchWeek;
  });

  return (
    <div className="wrap">
      {/* 헤더 행 추가 */}
      <div className="header-row">
        <h1 className="title">⚔️ 레이드 기여도 및 점수 정산 시스템</h1>
        <button className="reset-all-btn" onClick={resetAllData}>🔄 데이터 초기화</button>
      </div>

      <div className="card">
        <div className="input-row">
          <div className="input-item">
            <span className="label">토벌 주차</span>
            <div className="week-selector">
              <button type="button" className={`week-btn ${bossWeek === 1 ? "active" : ""}`} onClick={() => setBossWeek(1)}>1주차</button>
              <button type="button" className={`week-btn ${bossWeek === 2 ? "active" : ""}`} onClick={() => setBossWeek(2)}>2주차</button>
            </div>
          </div>
          <div className="input-item">
            <span className="label">토벌 날짜</span>
            <input type="date" value={selectedDate} onChange={(e) => pickDate(e.target.value)} />
          </div>
          <div className="input-item flex-2">
            <span className="label">보스 식별 이름</span>
            <input value={bossName} onChange={(e) => setBossName(e.target.value)} placeholder="예: 4성, 고대 성채 등" />
          </div>
          <div className="input-item">
            <span className="label">보스 점수 입력</span>
            <input type="number" value={bossScore === 0 ? "" : bossScore} onChange={(e) => setBossScore(Number(e.target.value))} placeholder="0" />
          </div>
        </div>
        <button className="add-btn" onClick={addBoss}>➕ 토벌 내역 추가</button>
        <hr className="divider" />
        <div className="filter">
          <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
          <button className="gray" onClick={() => setSearchDate("")}>날짜 전체</button>
        </div>
      </div>

      <div className="tabWrap">
        {([0, 1, 2] as const).map((t) => (
          <button key={t} onClick={() => setViewTab(t)} className={`tab ${viewTab === t ? "active" : ""}`}>
            {t === 0 ? "전체 목록" : `${t}주차 보기`}
          </button>
        ))}
      </div>

      <div className="bossList">
        {loading && !open ? (
          <div className="empty-state">🔄 데이터를 불러오는 중입니다...</div>
        ) : filteredBosses.length === 0 ? (
          <div className="empty-state">조회된 토벌 내역이 없습니다.</div>
        ) : (
          filteredBosses.map((b) => (
            <div key={b.id || b.name} className="bossCard" onClick={() => openBoss(b)}>
              <div className="boss-info">
                <div className="bossName">
                  <span className="week-tag">{b.week}주차</span> {b.name}
                  <span className="boss-score-tag">💎 인당 {b.boss_score}점 지급</span>
                </div>
                <div className="sub">🗓️ {b.date} <span className="day-badge">{b.day}요일</span></div>
              </div>
              <button className="delete" onClick={(e) => deleteBoss(e, b.id)}>삭제</button>
            </div>
          ))
        )}
      </div>

      {open && selectedBoss && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>⚔️ [{selectedBoss.week}주차] {selectedBoss.name} 정산 수정</h2>
              <button type="button" className="closeBtn" onClick={() => setOpen(false)}>✕ 닫기</button>
            </div>
            <div className="grid-summary">
              <div className="summary-box">
                <span className="s-label">지급 기준 점수</span>
                <span className="s-value">{selectedBoss.boss_score} 점</span>
              </div>
              <div className="summary-box pink-bg">
                <span className="s-label">체크된 인원</span>
                <span className="s-value">{checkedNames.length} 명</span>
              </div>
              <div className="summary-box purple-bg">
                <span className="s-label">1인당 지급 점수</span>
                <span className="s-value">✨ {selectedBoss.boss_score} 점씩</span>
              </div>
            </div>
            <div className="memberList-scroll">
              <div className="memberList">
                {members.map((m) => {
                  const currentName = String(m.name).trim();
                  const isChecked = checkedNames.some((n) => n.toLowerCase() === currentName.toLowerCase());
                  return (
                    <div key={m.id} className={`memberRow ${isChecked ? "checked-row" : ""}`} onClick={() => handleToggleMember(currentName)}>
                      <div className="member-meta">
                        <span className="m-name">{m.name}</span>
                        <span className="m-total-score">
                          ⚔️ 캐릭터 공격력: {m.attack ?? 0} | 💎 보스 누적 점수: {getMemberTotalEarnedScore(currentName)}점
                        </span>
                      </div>
                      <input type="checkbox" checked={isChecked} readOnly className="modal-check" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="admin-auth">
              <input type="password" placeholder="🔒 관리자 비밀번호 (1234)" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button className="save" onClick={save} disabled={saveLoading}>
              {saveLoading ? "⏳ 서버에 안전하게 저장 중..." : "🌸 정산 수정 완료 및 닫기"}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .reset-all-btn { background: #ffe4ee; color: #ff5294; border: 1px solid #ffd3e4; padding: 8px 16px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .reset-all-btn:hover { background: #ffd3e4; }
        .wrap { width: 100%; max-width: 950px; margin: 0 auto; padding: 24px; background: #fcf8fa; min-height: 100vh; font-family: system-ui, sans-serif; }
        .title { font-size: 24px; font-weight: 800; color: #4a353d; }
        .card { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 12px rgba(74, 53, 61, 0.02); border: 1px solid #fff3f7; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        .input-row { display: flex; gap: 12px; }
        .input-item { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .flex-2 { flex: 2; }
        .label { font-size: 13px; color: #9c858e; font-weight: 600; }
        .week-selector { display: flex; gap: 6px; height: 47px; }
        .week-btn { flex: 1; padding: 0; border-radius: 12px; background: #f5edf0; color: #7a6970; font-size: 14px; border: 1px solid #ebdbe1; cursor: pointer; }
        .week-btn.active { background: #ff6fae; color: white; border-color: #ff6fae; }
        input { width: 100%; padding: 12px; border: 1px solid #ffd3e4; border-radius: 12px; font-size: 15px; outline: none; color: #4a353d; background: white; box-sizing: border-box; height: 47px; }
        input:focus { border-color: #ff6fae; }
        button { padding: 14px; border: none; border-radius: 14px; cursor: pointer; background: #ff6fae; color: white; font-weight: 700; font-size: 15px; transition: all 0.2s; }
        button:hover { background: #f05697; }
        button:disabled { background: #b09aa4; cursor: not-allowed; }
        .divider { border: 0; height: 1px; background: #fff0f5; margin: 8px 0; }
        .gray { background: #f5edf0; color: #7a6970; min-width: 90px; }
        .filter { display: flex; gap: 10px; }
        .tabWrap { display: flex; gap: 8px; margin-bottom: 16px; }
        .tab { flex: 1; padding: 12px; border-radius: 14px; background: white; color: #8a757d; border: 1px solid #ffe1ed; font-weight: 700; font-size: 14px; cursor: pointer; }
        .tab.active { background: #ff6fae; color: white; border-color: #ff6fae; }
        .bossList { display: flex; flex-direction: column; gap: 12px; }
        .empty-state { text-align: center; padding: 40px; color: #b09aa4; font-size: 14px; background: white; border-radius: 16px; border: 1px dashed #ffd3e4; }
        .bossCard { background: white; padding: 18px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #fff5f8; }
        .bossCard:hover { background: #fff9fb; }
        .bossName { font-size: 17px; font-weight: 700; color: #332228; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .week-tag { font-size: 11px; background: #ff6fae; color: white; padding: 2px 6px; border-radius: 6px; font-weight: 800; }
        .boss-score-tag { font-size: 12px; color: #7b2cbf; background: #f3e8ff; padding: 2px 6px; border-radius: 6px; font-weight: bold; }
        .sub { color: #9c858e; font-size: 13px; display: flex; align-items: center; gap: 6px; }
        .day-badge { background: #fff0f5; color: #ff6fae; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .delete { background: #ffe4ee; color: #ff5294; padding: 8px 14px; font-size: 13px; border-radius: 10px; font-weight: bold; }
        .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 99999; padding: 16px; }
        .modal { width: 100%; max-width: 480px; background: white; border-radius: 24px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; }
        .modalHeader { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fff0f5; padding-bottom: 12px; width: 100%; }
        .modalHeader h2 { margin: 0; font-size: 18px; color: #4a353d; font-weight: 800; }
        .closeBtn { background: #f5edf0; color: #4a353d; font-size: 13px; font-weight: bold; padding: 6px 14px; border-radius: 10px; cursor: pointer; border: none; }
        .closeBtn:hover { background: #ebdbe1; }
        .grid-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; }
        .summary-box { background: #faf6f8; padding: 10px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; border: 1px solid #ebdbe1; text-align: center; }
        .pink-bg { background: #fff5f8; border-color: #ffd3e4; }
        .purple-bg { background: #fbf7ff; border-color: #e8d5ff; }
        .s-label { font-size: 11px; color: #8a757d; font-weight: 600; }
        .s-value { font-size: 14px; font-weight: 800; color: #332228; }
        .pink-bg .s-value { color: #ff6fae; }
        .purple-bg .s-value { color: #7b2cbf; }
        .memberList-scroll { min-height: 240px; max-height: 320px; overflow-y: auto; border: 2px solid #fff0f5; border-radius: 14px; width: 100%; background: #fffbfe; box-sizing: border-box; }
        .memberList { display: flex; flex-direction: column; width: 100%; }
        .memberRow { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #fff0f5; cursor: pointer; width: 100%; box-sizing: border-box; }
        .memberRow:hover { background: #fdf8fa; }
        .memberRow.checked-row { background: #fff0f5; }
        .member-meta { display: flex; flex-direction: column; gap: 2px; }
        .m-name { font-size: 14px; font-weight: 700; color: #332228; }
        .m-total-score { font-size: 11px; color: #9c858e; }
        .modal-check { width: 18px; height: 18px; accent-color: #ff6fae; cursor: pointer; pointer-events: none; }
        .admin-auth { width: 100%; }
        .admin-auth input { text-align: center; background: #faf6f8; border-color: #ebdbe1; }
        .save { width: 100%; background: #ff6fae; margin-top: 4px; }
        @media (max-width: 768px) { .wrap { padding: 16px; } .input-row { flex-direction: column; } }
      `}</style>
    </div>
  );
}