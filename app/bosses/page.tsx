"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
};

type Boss = {
  id: string;
  name: string;
  day: string;
  date: string;
  week: number; // ⭐ 주차 개념 추가
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
  const [bossWeek, setBossWeek] = useState<1 | 2>(1); // ⭐ 신규 보스 주차 선택 상태 (기본 1주차)

  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [open, setOpen] = useState(false);

  const [temp, setTemp] = useState<Record<string, boolean>>({});
  const [pw, setPw] = useState("");

  const [searchDate, setSearchDate] = useState("");
  const [viewTab, setViewTab] = useState<0 | 1 | 2>(0); // ⭐ 목록 필터링용 탭 (0: 전체, 1: 1주차, 2: 2주차)

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  async function load() {
    const [m, b, a] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("bosses").select("*").order("date", { ascending: false }),
      supabase.from("attendance").select("*"),
    ]);

    setMembers(m.data ?? []);
    setBosses(b.data ?? []);
    setAtt(a.data ?? []);
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
    if (!bossName.trim()) {
      alert("보스 이름을 입력해 주세요.");
      return;
    }

    if (!selectedDate) {
      alert("날짜를 선택해 주세요.");
      return;
    }

    // ⭐ insert 시 선택된 주차(bossWeek) 정보도 함께 저장
    const { error } = await supabase.from("bosses").insert([
      {
        name: bossName,
        date: selectedDate,
        day: selectedDay,
        week: bossWeek, 
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setBossName("");
    setSelectedDate("");

    load();
  }

  async function deleteBoss(e: React.MouseEvent, bossId: string) {
    e.stopPropagation();

    const pwCheck = prompt("관리자 비밀번호를 입력하세요.");

    if (pwCheck !== "1234") {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    if (!confirm("정말 이 보스를 삭제하시겠습니까?\n해당 보스의 출석 기록도 함께 삭제됩니다.")) return;

    await supabase.from("attendance").delete().eq("boss_id", bossId);
    await supabase.from("bosses").delete().eq("id", bossId);

    load();
  }

  function openBoss(b: Boss) {
    setSelectedBoss(b);
    setCurrentPage(1);

    const initial: Record<string, boolean> = {};

    members.forEach((m) => {
      const found = att.find(
        (a) =>
          a.boss_id === b.id && a.user_name === m.name && a.checked
      );

      initial[m.name] = !!found;
    });

    setTemp(initial);
    setOpen(true);
  }

  async function save() {
    if (!selectedBoss) return;

    if (pw !== "1234") {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const rows = members.map((m) => ({
      boss_id: selectedBoss.id,
      user_name: m.name,
      checked: !!temp[m.name],
    }));

    await supabase.from("attendance").delete().eq("boss_id", selectedBoss.id);
    await supabase.from("attendance").insert(rows);

    setPw("");
    setOpen(false);

    load();
  }

  // ⭐ 주차 필터링(viewTab)과 날짜 검색(searchDate)을 동시에 반영
  const filteredBosses = bosses.filter((b) => {
    const matchDate = !searchDate || b.date === searchDate;
    const matchWeek = viewTab === 0 || b.week === viewTab;
    return matchDate && matchWeek;
  });

  const totalPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentMembers = members.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="wrap">
      <h1 className="title">⚔ 보스 출석 관리</h1>

      {/* 대시보드 카드 영역 */}
      <div className="card">
        <div className="input-row">
          <div className="input-item">
            <span className="label">토벌 주차 설정</span>
            <div className="week-selector">
              <button 
                type="button" 
                className={`week-btn ${bossWeek === 1 ? "active" : ""}`}
                onClick={() => setBossWeek(1)}
              >1주차</button>
              <button 
                type="button" 
                className={`week-btn ${bossWeek === 2 ? "active" : ""}`}
                onClick={() => setBossWeek(2)}
              >2주차</button>
            </div>
          </div>

          <div className="input-item">
            <span className="label">토벌 날짜</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => pickDate(e.target.value)}
            />
          </div>

          <div className="input-item flex-2">
            <span className="label">보스 식별 이름</span>
            <input
              value={bossName}
              onChange={(e) => setBossName(e.target.value)}
              placeholder="예: 바덴, 케니스 등"
            />
          </div>
        </div>

        <button className="add-btn" onClick={addBoss}>➕ {bossWeek}주차 보스 추가</button>

        <hr className="divider" />

        {/* 필터링 영역 */}
        <div className="filter">
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />

          <button className="gray" onClick={() => setSearchDate("")}>
            날짜 전체
          </button>
        </div>
      </div>

      {/* ⭐ 보스 목록 주차별 조회 탭 추가 */}
      <div className="tabWrap">
        {([0, 1, 2] as const).map((t) => (
          <button
            key={t}
            onClick={() => setViewTab(t)}
            className={`tab ${viewTab === t ? "active" : ""}`}
          >
            {t === 0 ? "전체 목록" : `${t}주차 보기`}
          </button>
        ))}
      </div>

      {/* 보스 리스트 */}
      <div className="bossList">
        {filteredBosses.length === 0 ? (
          <div className="empty-state">조회된 보스 내역이 없습니다.</div>
        ) : (
          filteredBosses.map((b) => (
            <div key={b.id} className="bossCard" onClick={() => openBoss(b)}>
              <div className="boss-info">
                <div className="bossName">
                  <span className="week-tag">{b.week}주차</span> {b.name}
                </div>
                <div className="sub">
                  🗓️ {b.date} <span className="day-badge">{b.day}요일</span>
                </div>
              </div>

              <button className="delete" onClick={(e) => deleteBoss(e, b.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>

      {/* 출석 체크 모달 */}
      {open && selectedBoss && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>⚔ [{selectedBoss.week}주차] {selectedBoss.name}</h2>
              <button className="closeBtn" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="pageIndicator">
              명단 체크 (<span className="pink-count">{Math.min(indexOfLastItem, members.length)}</span> / {members.length})
            </div>

            <div className="memberList">
              {currentMembers.map((m) => (
                <div 
                  key={m.id} 
                  className={`memberRow ${temp[m.name] ? "checked-row" : ""}`}
                  onClick={() => 
                    setTemp((p) => ({
                      ...p,
                      [m.name]: !p[m.name],
                    }))
                  }
                >
                  <span className="m-name">{m.name}</span>

                  <input
                    type="checkbox"
                    checked={!!temp[m.name]}
                    onChange={() => {}} 
                  />
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            <div className="paginationControls">
              <button
                className="pageBtn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                이전
              </button>
              <span className="pageNumber">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                className="pageBtn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                다음
              </button>
            </div>

            <div className="admin-auth">
              <input
                type="password"
                placeholder="🔒 관리자 비밀번호 (1234)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>

            <button className="save" onClick={save}>
              🌸 출석부 저장하기
            </button>
          </div>
        </div>
      )}

      {/* 스타일 */}
      <style jsx>{`
        .wrap {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
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

        .card {
          background: white;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(74, 53, 61, 0.02);
          border: 1px solid #fff3f7;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .input-row {
          display: flex;
          gap: 12px;
        }

        .input-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .flex-2 {
          flex: 1.5;
        }

        .label {
          font-size: 13px;
          color: #9c858e;
          font-weight: 600;
        }

        /* 주차 토글 버튼 스타일 */
        .week-selector {
          display: flex;
          gap: 6px;
          height: 47px;
        }

        .week-btn {
          flex: 1;
          padding: 0;
          border-radius: 12px;
          background: #f5edf0;
          color: #7a6970;
          font-size: 14px;
          border: 1px solid #ebdbe1;
        }

        .week-btn.active {
          background: #ff6fae;
          color: white;
          border-color: #ff6fae;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ffd3e4;
          border-radius: 12px;
          font-size: 15px;
          outline: none;
          color: #4a353d;
          background: white;
          box-sizing: border-box;
          height: 47px;
        }

        input:focus {
          border-color: #ff6fae;
        }

        button {
          padding: 14px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          background: #ff6fae;
          color: white;
          font-weight: 700;
          font-size: 15px;
          transition: all 0.2s;
        }

        button:hover {
          background: #f05697;
        }

        .divider {
          border: 0;
          height: 1px;
          background: #fff0f5;
          margin: 8px 0;
        }

        .gray {
          background: #f5edf0;
          color: #7a6970;
          min-width: 90px;
        }

        .filter {
          display: flex;
          gap: 10px;
        }

        /* 주차별 필터 탭 */
        .tabWrap {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .tab {
          flex: 1;
          padding: 12px;
          border-radius: 14px;
          background: white;
          color: #8a757d;
          border: 1px solid #ffe1ed;
          font-weight: 700;
          font-size: 14px;
        }

        .tab.active {
          background: #ff6fae;
          color: white;
          border-color: #ff6fae;
        }

        .bossList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #b09aa4;
          font-size: 14px;
          background: white;
          border-radius: 16px;
          border: 1px dashed #ffd3e4;
        }

        .bossCard {
          background: white;
          padding: 18px 20px;
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(74, 53, 61, 0.02);
          border: 1px solid #fff5f8;
        }

        .bossCard:hover {
          background: #fff9fb;
        }

        .bossName {
          font-size: 17px;
          font-weight: 700;
          color: #332228;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .week-tag {
          font-size: 11px;
          background: #ff6fae;
          color: white;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 800;
        }

        .sub {
          color: #9c858e;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .day-badge {
          background: #fff0f5;
          color: #ff6fae;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .delete {
          background: #ffe4ee;
          color: #ff5294;
          padding: 8px 14px;
          font-size: 13px;
          border-radius: 10px;
          font-weight: bold;
        }

        /* 모달 스타일 */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(74, 53, 61, 0.4);
          backdrop-filter: blur(2px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .modal {
          width: 100%;
          max-width: 500px;
          background: white;
          border-radius: 24px;
          padding: 24px;
          max-height: 85vh;
          overflow-y: auto;
          position: relative;
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #fff0f5;
          padding-bottom: 14px;
        }

        .modalHeader h2 {
          margin: 0;
          font-size: 20px;
          color: #4a353d;
          font-weight: 800;
        }

        .closeBtn {
          background: transparent;
          color: #b59fa8;
          font-size: 20px;
        }

        .pageIndicator {
          font-size: 13px;
          color: #9c858e;
          margin-top: 14px;
          font-weight: 600;
          text-align: right;
        }

        .pink-count {
          color: #ff6fae;
        }

        .memberList {
          margin-top: 8px;
          border: 1px solid #fff0f5;
          border-radius: 16px;
          overflow: hidden;
        }

        .memberRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #fff0f5;
          cursor: pointer;
        }

        .memberRow.checked-row {
          background: #fff5f8;
        }

        .m-name {
          font-size: 15px;
          font-weight: 700;
          color: #332228;
        }

        .memberRow input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: #ff6fae;
        }

        .paginationControls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }

        .pageBtn {
          background: #faf6f8;
          border: 1px solid #ebdbe1;
          color: #7a6970;
          padding: 8px 16px;
          font-size: 13px;
          border-radius: 10px;
        }

        .pageBtn:disabled {
          background: #f5f3f4;
          color: #c2b8bc;
          cursor: not-allowed;
        }

        .pageNumber {
          font-weight: 700;
          font-size: 14px;
        }

        .admin-auth {
          margin-top: 24px;
        }

        .admin-auth input {
          text-align: center;
          background: #faf6f8;
          border-color: #ebdbe1;
        }

        .save {
          width: 100%;
          margin-top: 12px;
          background: #ff6fae;
        }

        @media (max-width: 768px) {
          .wrap { padding: 16px; }
          .input-row { flex-direction: column; gap: 12px; }
          .modal { width: 92%; padding: 18px; }
          .tabWrap { flex-direction: row; }
        }
      `}</style>
    </div>
  );
}