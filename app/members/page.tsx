"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Member = {
  id: string;
  name: string;
  class: string;
  attack: number;
  defense: number;
  accuracy: number;
  memo: string;
  updated_at: string;
};

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");

  // 🔐 관리자
  const [isAddAuth, setIsAddAuth] = useState(false);
  const [pw, setPw] = useState("");
  const [showPwModal, setShowPwModal] = useState(false);

  // 🎮 슬라이드 패널
  const [showAddPanel, setShowAddPanel] = useState(false);

  // ➕ 추가 폼
  const [addForm, setAddForm] = useState({
    name: "",
    class: "",
    attack: 0,
    defense: 0,
    accuracy: 0,
  });

  // ✏️ 수정
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    class: "",
    attack: 0,
    defense: 0,
    accuracy: 0,
    memo: "",
  });

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("name");

    setMembers(data || []);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 🔐 인증 + 패널 오픈
  const checkPassword = () => {
    if (pw === "1234") {
      setIsAddAuth(true);
      setShowPwModal(false);
      setPw("");
      setShowAddPanel(true); // 🔥 슬라이드 오픈
    } else {
      alert("비밀번호 틀림");
    }
  };

  // ➕ 추가
  const addMember = async () => {
    const { data, error } = await supabase
      .from("members")
      .insert([
        {
          name: addForm.name,
          class: addForm.class,
          attack: Number(addForm.attack),
          defense: Number(addForm.defense),
          accuracy: Number(addForm.accuracy),
        },
      ])
      .select();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      setMembers((prev) => [...prev, ...data]);
    }

    setAddForm({
      name: "",
      class: "",
      attack: 0,
      defense: 0,
      accuracy: 0,
    });

    setShowAddPanel(false); // 🔥 저장 후 닫기
  };

  // ✏️ 수정
  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditForm({
      class: m.class,
      attack: m.attack,
      defense: m.defense,
      accuracy: m.accuracy,
      memo: m.memo || "",
    });
  };

  const saveEdit = async (id: string) => {
    await supabase
      .from("members")
      .update({
        class: editForm.class,
        attack: Number(editForm.attack),
        defense: Number(editForm.defense),
        accuracy: Number(editForm.accuracy),
        memo: editForm.memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await fetchMembers();
    setEditId(null);
  };

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const power = (m: Member) =>
    (m.attack + m.defense + m.accuracy).toLocaleString();

  return (
    <div className="bg">
      {/* 🏰 타이틀 영역 (헤더 정렬 보정) */}
      <div className="header-top-area">
        <h1 className="title">🏰 길드원 목록</h1>
      </div>

      {/* 상단 컨트롤 영역 (모바일 대응을 위해 레이아웃 분리 조절) */}
      <div className="actionRow">
        <input
          className="search"
          placeholder="길드원 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* ➕ 버튼 */}
        <button className="btn save mainBtn" onClick={() => setShowPwModal(true)}>
          ➕ 길드원 추가
        </button>
      </div>

      {/* 🔐 비번 모달 */}
      {showPwModal && (
        <div className="modal">
          <div className="modalCard">
            <h2>🔐 관리자 인증</h2>

            <input
              className="input"
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />

            <div className="modalBtns">
              <button className="btn save" onClick={checkPassword}>
                확인
              </button>
              <button
                className="btn cancel"
                onClick={() => setShowPwModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎮 슬라이드 패널 (모바일 전면 레이어 스크롤 최적화) */}
      <div className={`panel ${showAddPanel ? "open" : ""}`}>
        <div className="panelHeader">
          <h2>➕ 길드원 추가</h2>
          <button
            className="btn cancel closeBtn"
            onClick={() => setShowAddPanel(false)}
          >
            ❌
          </button>
        </div>

        <div className="panelBody">
          <label>이름</label>
          <input
            className="input"
            placeholder="이름"
            value={addForm.name}
            onChange={(e) =>
              setAddForm({ ...addForm, name: e.target.value })
            }
          />

          <label>직업</label>
          <input
            className="input"
            placeholder="직업"
            value={addForm.class}
            onChange={(e) =>
              setAddForm({ ...addForm, class: e.target.value })
            }
          />

          <label>공격력</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="공격력"
            value={addForm.attack || ""}
            onChange={(e) =>
              setAddForm({
                ...addForm,
                attack: Number(e.target.value),
              })
            }
          />

          <label>방어력</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="방어력"
            value={addForm.defense || ""}
            onChange={(e) =>
              setAddForm({
                ...addForm,
                defense: Number(e.target.value),
              })
            }
          />

          <label>명중</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="명중"
            value={addForm.accuracy || ""}
            onChange={(e) =>
              setAddForm({
                ...addForm,
                accuracy: Number(e.target.value),
              })
            }
          />

          <button className="btn save full submitBtn" onClick={addMember}>
            저장하기
          </button>
        </div>
      </div>

      {/* 📋 리스트 */}
      <div className="grid">
        {filtered.map((m) => (
          <div key={m.id} className="card soft">
            <div className="cardHeader">
              <div className="avatar">🐰</div>
              <div>
                <div className="name">{m.name}</div>
                <div className="job">🧙 {m.class}</div>
              </div>
            </div>

            {editId === m.id ? (
              <div className="editBox">
                <div className="editTitle">✏️ 정보 수정</div>

                <div className="editGrid">
                  <div>
                    <span className="label-text">🧙 직업</span>
                    <input
                      className="input"
                      value={editForm.class}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          class: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <span className="label-text">⚔ 공격력</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      value={editForm.attack}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          attack: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <span className="label-text">🛡 방어력</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      value={editForm.defense}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          defense: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <span className="label-text">🎯 명중</span>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      value={editForm.accuracy}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          accuracy: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <span className="label-text">📝 신화 / 메모</span>
                  <input
                    className="input"
                    value={editForm.memo}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        memo: e.target.value,
                      })
                    }
                    placeholder="신화 3개 / 전설 2개"
                  />
                </div>

                <div className="editBtns">
                  <button
                    className="btn save action-inline-btn"
                    onClick={() => saveEdit(m.id)}
                  >
                    💾 저장
                  </button>

                  <button
                    className="btn cancel action-inline-btn"
                    onClick={() => setEditId(null)}
                  >
                    ❌ 취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="infoContainer">
                  <div className="info">
                    <span>⚔ 공격력</span> <strong>{m.attack.toLocaleString()}</strong>
                  </div>

                  <div className="info">
                    <span>🛡 방어력</span> <strong>{m.defense.toLocaleString()}</strong>
                  </div>

                  <div className="info">
                    <span>🎯 명중</span> <strong>{m.accuracy.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="power">
                  ⭐ 전투력 {power(m)}
                </div>
                
                <div className="memo">
                  📝 {m.memo || "메모 없음"}
                </div>

                <div className="cardFooter">
                  <div className="updated">
                    수정일: {m.updated_at ? new Date(m.updated_at).toLocaleDateString("ko-KR") : "-"}
                  </div>
                  <button
                    className="btn edit itemEditBtn"
                    onClick={() => startEdit(m)}
                  >
                    ✏️ 수정하기
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .bg {
          min-height: 100vh;
          padding: 40px 24px;
          background: linear-gradient(180deg, #fff7fc, #f7f1ff);
          box-sizing: border-box;
        }

        .header-top-area {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .title {
          font-size: 36px;
          font-weight: 900;
          color: #ff72b8;
          margin: 0;
          white-space: nowrap; /* 💥 모바일에서 '목' '록'이 쪼개지지 않도록 방지 */
        }

        .actionRow {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search {
          padding: 14px 20px;
          flex: 1;
          min-width: 260px;
          border-radius: 999px;
          border: 1px solid rgba(255, 114, 184, 0.15);
          outline: none;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(255, 114, 184, 0.04);
        }

        .mainBtn {
          margin: 0;
          padding: 14px 24px;
          font-weight: bold;
          border-radius: 999px;
          font-size: 15px;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .card {
          padding: 24px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 10px 25px rgba(134, 114, 255, 0.05);
          display: flex;
          flex-direction: column;
        }

        .soft {
          border: 1px solid #f2ecff;
        }

        .cardHeader {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .avatar {
          font-size: 36px;
        }

        .name {
          font-size: 20px;
          font-weight: 900;
          color: #222;
        }

        .job {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          background: #f3e9ff;
          font-size: 13px;
          font-weight: 700;
          color: #7a46e6;
          margin-top: 4px;
        }

        .infoContainer {
          background: #fafaff;
          padding: 12px 16px;
          border-radius: 16px;
          margin-top: 8px;
        }

        .info {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #555;
          margin: 6px 0;
        }

        .info strong {
          color: #222;
        }

        .power {
          margin-top: 14px;
          font-weight: 900;
          font-size: 17px;
          color: #ff4e9f;
        }

        .memo {
          margin-top: 10px;
          font-size: 13px;
          color: #666;
          background: #f9f9fb;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #f1eff5;
          line-height: 1.4;
        }

        .cardFooter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #f8f6fa;
        }

        .itemEditBtn {
          margin: 0;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: bold;
        }

        .updated {
          font-size: 12px;
          color: #aaa;
        }

        .input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          margin-top: 6px;
          border-radius: 12px;
          border: 1px solid #e2d9f3;
          outline: none;
          font-size: 14px;
          background: #fdfbfe;
        }
        .input:focus {
          border-color: #ff8fc9;
        }

        .btn {
          border: none;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.2s;
        }

        .save { background: #ff8fc9; color: white; }
        .save:hover { background: #ff72b8; }
        .cancel { background: #eee; color: #555; }
        .cancel:hover { background: #e0e0e0; }
        .edit { background: #8672ff; color: white; }
        .edit:hover { background: #6c54ff; }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 100;
        }

        .modalCard {
          background: white;
          padding: 24px;
          border-radius: 24px;
          width: 100%;
          max-width: 340px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .modalCard h2 { font-size: 20px; margin: 0 0 16px 0; color: #222; }
        .modalBtns { display: flex; gap: 8px; margin-top: 16px; }
        .modalBtns .btn { flex: 1; margin: 0; }

        .panel {
          position: fixed;
          top: 0;
          right: -440px;
          width: 400px;
          height: 100vh;
          background: white;
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.12);
          padding: 24px;
          box-sizing: border-box;
          transition: right 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
          z-index: 200;
          display: flex;
          flex-direction: column;
        }

        .panel.open { right: 0; }
        .panelHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .panelHeader h2 { margin: 0; font-size: 22px; color: #222; }
        .panelBody { flex: 1; overflow-y: auto; padding-bottom: 40px; }
        .panelBody label { display: block; font-size: 13px; font-weight: 700; color: #666; margin-top: 14px; }
        .closeBtn { margin: 0; background: none; font-size: 18px; padding: 4px; }
        .submitBtn { margin-top: 24px; padding: 14px; font-size: 16px; font-weight: bold; }
        .full { width: 100%; }

        .editBox {
          margin-top: 14px;
          padding: 16px;
          border-radius: 16px;
          background: #fbf9ff;
          border: 1px solid #ede8f5;
        }
        .editTitle { font-weight: 900; font-size: 15px; color: #555; margin-bottom: 12px; }
        .editGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .label-text { font-size: 12px; font-weight: bold; color: #777; }
        .editBtns { display: flex; gap: 8px; margin-top: 14px; }
        .action-inline-btn { flex: 1; margin: 0; padding: 10px; font-size: 13px; }

        @media (max-width: 500px) {
          .bg { padding: 24px 16px; }
          .header-top-area { justify-content: center; } /* 모바일 타이틀 중앙정렬 */
          .title { font-size: 26px; text-align: center; }
          .actionRow { flex-direction: column; gap: 8px; }
          .search { width: 100%; min-width: 100%; text-align: center; padding: 12px; }
          .mainBtn { width: 100%; border-radius: 12px; padding: 12px; }
          
          .grid { grid-template-columns: 1fr; gap: 14px; }
          .card { padding: 18px; border-radius: 20px; }
          .name { font-size: 18px; }
          .power { font-size: 16px; }
          
          .panel {
            right: -100%;
            width: 100%;
            height: 100vh;
          }
          .panel.open { right: 0; }
          
          .editGrid { grid-template-columns: 1fr; gap: 8px; }
        }
      `}</style>
    </div>
  );
}