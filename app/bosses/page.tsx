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

  const [searchDate, setSearchDate] = useState("");

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
      alert("보스 이름 입력");
      return;
    }

    if (!selectedDate) {
      alert("날짜 선택");
      return;
    }

    const { error } = await supabase.from("bosses").insert([
      {
        name: bossName,
        date: selectedDate,
        day: selectedDay,
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

    const pwCheck = prompt("관리자 비밀번호");

    if (pwCheck !== "1234") {
      alert("비밀번호 오류");
      return;
    }

    if (!confirm("삭제하시겠습니까?")) return;

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
      alert("비밀번호 오류");
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

  const filteredBosses = bosses.filter(
    (b) => !searchDate || b.date === searchDate
  );

  const totalPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentMembers = members.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="wrap">
      <h1 className="title">⚔ 보스 관리</h1>

      <div className="card">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => pickDate(e.target.value)}
        />

        <input
          value={bossName}
          onChange={(e) => setBossName(e.target.value)}
          placeholder="보스 이름"
        />

        <button onClick={addBoss}>➕ 보스 추가</button>

        <div className="filter">
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />

          <button className="gray" onClick={() => setSearchDate("")}>
            전체
          </button>
        </div>
      </div>

      <div className="bossList">
        {filteredBosses.map((b) => (
          <div key={b.id} className="bossCard" onClick={() => openBoss(b)}>
            <div>
              <div className="bossName">{b.name}</div>
              <div className="sub">
                {b.date} ({b.day})
              </div>
            </div>

            <button className="delete" onClick={(e) => deleteBoss(e, b.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>

      {open && selectedBoss && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* 💡 헤더 영역에 제목과 닫기(X) 버튼 배치 */}
            <div className="modalHeader">
              <h2>⚔ {selectedBoss.name}</h2>
              <button className="closeBtn" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="pageIndicator">
              명단 체크 ({Math.min(indexOfLastItem, members.length)} / {members.length})
            </div>

            <div className="memberList">
              {currentMembers.map((m) => (
                <div key={m.id} className="memberRow">
                  <span>{m.name}</span>

                  <input
                    type="checkbox"
                    checked={!!temp[m.name]}
                    onChange={() =>
                      setTemp((p) => ({
                        ...p,
                        [m.name]: !p[m.name],
                      }))
                    }
                  />
                </div>
              ))}
            </div>

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

            <input
              type="password"
              placeholder="관리자 비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ marginTop: "20px" }}
            />

            {/* 💡 파란색에서 핑크색으로 수정 */}
            <button className="save" onClick={save}>
              저장
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .wrap {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .title {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 10px;
        }

        button {
          padding: 12px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          background: #ff5ea8;
          color: white;
          font-weight: 700;
        }

        .gray {
          background: #e5e7eb;
          color: black;
        }

        .filter {
          display: flex;
          gap: 10px;
        }

        .bossList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bossCard {
          background: white;
          padding: 16px;
          border-radius: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .bossName {
          font-size: 17px;
          font-weight: 700;
        }

        .sub {
          color: #666;
          font-size: 13px;
        }

        .delete {
          background: #fee2e2;
          color: #ef4444;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .modal {
          width: 100%;
          max-width: 600px;
          background: white;
          border-radius: 20px;
          padding: 20px;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }

        /* 💡 상단 헤더 레이아웃 추가 */
        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modalHeader h2 {
          margin: 0;
        }

        /* 💡 닫기 버튼 스타일 */
        .closeBtn {
          background: transparent;
          color: #9ca3af;
          font-size: 20px;
          padding: 4px 8px;
        }

        .closeBtn:hover {
          color: #4b5563;
        }

        .pageIndicator {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
          text-align: right;
        }

        .memberList {
          margin-top: 8px;
          border: 1px solid #eee;
          border-radius: 12px;
          overflow: hidden;
        }

        .memberRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
        }

        .memberRow:last-child {
          border-bottom: none;
        }

        .memberRow input {
          width: 20px;
          height: 20px;
        }

        /* 💡 체크박스 포인트 컬러 변경 (선택 사항) */
        .memberRow input:checked {
          accent-color: #ff5ea8;
        }

        .paginationControls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-top: 15px;
        }

        .pageBtn {
          background: #f3f4f6;
          color: #1f2937;
          padding: 8px 16px;
          font-size: 14px;
        }

        .pageBtn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .pageNumber {
          font-weight: 600;
          font-size: 15px;
        }

        /* 💡 파란색(#2563eb)에서 메인 테마인 핑크색(#ff5ea8)으로 수정 */
        .save {
          width: 100%;
          margin-top: 15px;
          background: #ff5ea8; 
        }

        @media (max-width: 768px) {
          .wrap {
            padding: 12px;
          }

          .modal {
            width: 95%;
          }

          .filter {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}