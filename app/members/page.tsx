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

  // ✏️ 수정 (수정 중인 멤버의 이름도 함께 추적하도록 name 추가)
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", 
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
    if (!addForm.name.trim()) return alert("이름을 입력해 주세요.");
    
    const { data, error } = await supabase
      .from("members")
      .insert([
        {
          name: addForm.name.trim(),
          class: addForm.class,
          attack: Number(addForm.attack) || 0,
          defense: Number(addForm.defense) || 0,
          accuracy: Number(addForm.accuracy) || 0,
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

  // ✏️ 수정 시작 (안전하게 기존 값들을 명확히 바인딩)
  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditForm({
      name: m.name, // 누굴 수정하는지 폼 상단에 보여주기 위함
      class: m.class || "",
      attack: Number(m.attack) || 0,
      defense: Number(m.defense) || 0,
      accuracy: Number(m.accuracy) || 0,
      memo: m.memo || "",
    });
  };

  // 💾 수정 저장 (공격력이 절대 꼬이지 않도록 Number 강제 형변환 보강)
  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("members")
      .update({
        class: editForm.class,
        attack: Number(editForm.attack) || 0,
        defense: Number(editForm.defense) || 0,
        accuracy: Number(editForm.accuracy) || 0,
        memo: editForm.memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("수정 실패: " + error.message);
      return;
    }

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
              type="password"
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
          value={addForm.attack === 0 ? "" : addForm.attack}
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
          value={addForm.defense === 0 ? "" : addForm.defense}
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
          value={addForm.accuracy === 0 ? "" : addForm.accuracy}
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
                {/* ⭐ UI 보강: 실수 방지를 위해 수정 중인 대상의 이름을 명확하게 노출 */}
                <div className="editTitle">✏️ [{editForm.name}] 정보 수정</div>

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
                    ⚔ 공격력
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
                    🛡 방어력
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

                <div style={{ marginTop: "12px" }}>
                  📝 신화 / 메모
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
                    className="btn save"
                    onClick={() => saveEdit(m.id)}
                  >
                    💾 저장
                  </button>

                  <button
                    className="btn cancel"
                    onClick={() => setEditId(null)}
                  >
                    ❌ 취소
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
                
                <div className="memo">
                  📝 {m.memo || "메모 없음"}
                </div>

                <div className="updated">
                  수정일 : {m.updated_at ? new Date(m.updated_at).toLocaleDateString("ko-KR") : "-"}
                </div>

                <button
                  className="btn edit"
                  onClick={() => startEdit(m)}
                >
                  ✏️ 수정
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ===== STYLE ===== */}
      <style jsx>{`
        .bg { min-height: 100vh; padding: 35px; background: linear-gradient(180deg, #fff7fc, #f7f1ff); }
        .title { font-size: 48px; font-weight: 900; color: #ff72b8; }
        .search { padding: 16px; width: 400px; border-radius: 999px; border: none; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); outline: none; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .card { padding: 20px; border-radius: 24px; background: white; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); position: relative; }
        .soft { border: 1px solid #f0e6ff; }
        .avatar { font-size: 40px; }
        .name { font-size: 22px; font-weight: 900; color: #332228; }
        .job { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #f3e9ff; margin: 10px 0; font-size: 13px; font-weight: bold; color: #6b21a8; }
        .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 14px; color: #4a353d; }
        .info span { font-weight: bold; }
        .power { margin-top: 12px; font-weight: 900; color: #ff4e9f; font-size: 16px; }
        .input { width: 100%; box-sizing: border-box; padding: 11px 14px; margin-top: 6px; border-radius: 12px; border: 1px solid #e8d9ff; outline: none; font-size: 14px; background: white; }
        .input:focus { border-color: #ff8fc9; }
        .btn { border: none; padding: 10px 16px; border-radius: 12px; margin-top: 10px; cursor: pointer; margin-right: 8px; font-weight: bold; font-size: 14px; }
        .save { background: #ff8fc9; color: white; }
        .save:hover { background: #f076b4; }
        .cancel { background: #e5e7eb; color: #4b5563; }
        .cancel:hover { background: #d1d5db; }
        .edit { background: #8672ff; color: white; position: absolute; top: 20px; right: 20px; margin: 0; padding: 8px 12px; border-radius: 10px; }
        .edit:hover { background: #705df2; }
        .modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 999; }
        .modalCard { background: white; padding: 24px; border-radius: 24px; width: 320px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .modalCard h2 { font-size: 18px; margin: 0 0 12px 0; color: #4a353d; }
        .panel { position: fixed; top: 0; right: -420px; width: 380px; height: 100vh; background: white; box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15); padding: 24px; transition: 0.35s ease; z-index: 9999; box-sizing: border-box; }
        .panel.open { right: 0; }
        .panelHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .panelHeader h2 { margin: 0; font-size: 20px; color: #4a353d; }
        .full { width: 100%; margin-top: 16px; padding: 14px; }
        .editBox { margin-top: 10px; padding: 16px; border-radius: 20px; background: linear-gradient(135deg, #fff5fb, #f3efff); border: 1px solid #ffd3e4; }
        .editTitle { font-weight: 900; margin-bottom: 12px; color: #4a353d; font-size: 15px; }
        .editGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; color: #736066; font-weight: 600; }
        .editBtns { display: flex; gap: 8px; margin-top: 14px; }
        .memo { margin-top: 12px; font-size: 13px; color: #555; background: #fafafa; padding: 10px; border-radius: 12px; border: 1px solid #f0f0f0; line-height: 1.4; }
        .updated { margin-top: 8px; font-size: 11px; color: #aaa; text-align: right; }
      `}</style>
    </div>
  );
}