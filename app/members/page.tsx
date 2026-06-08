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
      <h1 className="title">🏰 길드원 목록</h1>

      <input
        className="search"
        placeholder="검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ➕ 버튼 */}
      <button className="btn save" onClick={() => setShowPwModal(true)}>
        ➕ 길드원 추가
      </button>

      {/* 🔐 비번 모달 */}
      {showPwModal && (
        <div className="modal">
          <div className="modalCard">
            <h2>🔐 관리자 인증</h2>

            <input
              className="input"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />

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
      )}

      {/* 🎮 슬라이드 패널 */}
      <div className={`panel ${showAddPanel ? "open" : ""}`}>
        <div className="panelHeader">
          <h2>➕ 길드원 추가</h2>

          <button
            className="btn cancel"
            onClick={() => setShowAddPanel(false)}
          >
            ❌
          </button>
        </div>

        <input
          className="input"
          placeholder="이름"
          value={addForm.name}
          onChange={(e) =>
            setAddForm({ ...addForm, name: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="직업"
          value={addForm.class}
          onChange={(e) =>
            setAddForm({ ...addForm, class: e.target.value })
          }
        />

        <input
          className="input"
          type="number"
          placeholder="공격력"
          value={addForm.attack}
          onChange={(e) =>
            setAddForm({
              ...addForm,
              attack: Number(e.target.value),
            })
          }
        />

        <input
          className="input"
          type="number"
          placeholder="방어력"
          value={addForm.defense}
          onChange={(e) =>
            setAddForm({
              ...addForm,
              defense: Number(e.target.value),
            })
          }
        />

        <input
          className="input"
          type="number"
          placeholder="명중"
          value={addForm.accuracy}
          onChange={(e) =>
            setAddForm({
              ...addForm,
              accuracy: Number(e.target.value),
            })
          }
        />

        <button className="btn save full" onClick={addMember}>
          저장
        </button>
      </div>

      {/* 📋 리스트 */}
      <div className="grid">
        {filtered.map((m) => (
          <div key={m.id} className="card soft">
            <div className="avatar">🐰</div>

            <div className="name">{m.name}</div>

            <div className="job">🧙 {m.class}</div>

            {editId === m.id ? (
              <div className="editBox">
                <div className="editTitle">✏️ 수정</div>

                <div className="editGrid">
                  <div>
                    🧙 직업
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
                    ⚔ 공격
                    <input
                      className="input"
                      type="number"
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
                    🛡 방어
                    <input
                      className="input"
                      type="number"
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
                    🎯 명중
                    <input
                      className="input"
                      type="number"
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

                <div className="editBtns">
                  <button
                    className="btn save"
                    onClick={() => saveEdit(m.id)}
                  >
                    💾
                  </button>

                  <button
                    className="btn cancel"
                    onClick={() => setEditId(null)}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="info">
                  ⚔ 공격력 <span>{m.attack.toLocaleString()}</span>
                </div>

                <div className="info">
                  🛡 방어력 <span>{m.defense.toLocaleString()}</span>
                </div>

                <div className="info">
                  🎯 명중 <span>{m.accuracy.toLocaleString()}</span>
                </div>

                <div className="power">
                  ⭐ 전투력 {power(m)}
                </div>

                <button
                  className="btn edit"
                  onClick={() => startEdit(m)}
                >
                  ✏️수정
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .bg {
          min-height: 100vh;
          padding: 35px;
          background: linear-gradient(180deg, #fff7fc, #f7f1ff);
        }

        .title {
          font-size: 48px;
          font-weight: 900;
          color: #ff72b8;
        }

        .search {
          padding: 16px;
          width: 400px;
          border-radius: 999px;
          border: none;
          margin: 20px 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .card {
          padding: 20px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
        }

        .soft {
          border: 1px solid #f0e6ff;
        }

        .avatar {
          font-size: 40px;
        }

        .name {
          font-size: 22px;
          font-weight: 900;
        }

        .job {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 999px;
          background: #f3e9ff;
          margin: 10px 0;
        }

        .info {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }

        .power {
          margin-top: 12px;
          font-weight: 900;
          color: #ff4e9f;
        }

        .input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 14px;
          margin-top: 8px;
          border-radius: 14px;
          border: 1px solid #e8d9ff;
          outline: none;
        }

        .btn {
          border: none;
          padding: 10px 14px;
          border-radius: 14px;
          margin-top: 10px;
          cursor: pointer;
          margin-right: 8px;
        }

        .save {
          background: #ff8fc9;
          color: white;
        }

        .cancel {
          background: #ddd;
        }

        .edit {
          background: #8672ff;
          color: white;
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modalCard {
          background: white;
          padding: 20px;
          border-radius: 20px;
          width: 320px;
        }

        /* 🎮 슬라이드 패널 */
        .panel {
          position: fixed;
          top: 0;
          right: -420px;
          width: 380px;
          height: 100vh;
          background: white;
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
          padding: 20px;
          transition: 0.35s ease;
          z-index: 50;
        }

        .panel.open {
          right: 0;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .full {
          width: 100%;
        }

        .editBox {
          margin-top: 10px;
          padding: 14px;
          border-radius: 20px;
          background: linear-gradient(135deg, #fff5fb, #f3efff);
        }

        .editTitle {
          font-weight: 900;
          margin-bottom: 10px;
        }

        .editGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .editBtns {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}