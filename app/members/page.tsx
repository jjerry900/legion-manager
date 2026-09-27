"use client";

import { useEffect, useMemo, useState } from "react";
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

type SortKey = "power" | "name" | "class";

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");

  // 🔐 관리자
  const [pw, setPw] = useState("");
  const [showPwModal, setShowPwModal] = useState(false);
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
    name: "",
    class: "",
    attack: 0,
    defense: 0,
    accuracy: 0,
    memo: "",
  });

  // ↕️ 정렬
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }
    setMembers(data || []);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const checkPassword = () => {
    if (pw === "0910") {
      setShowPwModal(false);
      setPw("");
      setShowAddPanel(true);
    } else {
      alert("비밀번호 틀림");
    }
  };

  const addMember = async () => {
    if (!addForm.name.trim()) return alert("이름을 입력해 주세요.");

    const { data, error } = await supabase
      .from("members")
      .insert([{
        name: addForm.name.trim(),
        class: addForm.class,
        attack: Number(addForm.attack) || 0,
        defense: Number(addForm.defense) || 0,
        accuracy: Number(addForm.accuracy) || 0,
      }])
      .select();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) setMembers((prev) => [...prev, ...data]);

    setAddForm({ name: "", class: "", attack: 0, defense: 0, accuracy: 0 });
    setShowAddPanel(false);
  };

  const startEdit = (m: Member) => {
    setEditId(m.id);
    setEditForm({
      name: m.name,
      class: m.class || "",
      attack: Number(m.attack) || 0,
      defense: Number(m.defense) || 0,
      accuracy: Number(m.accuracy) || 0,
      memo: m.memo || "",
    });
  };

  // 닉네임 변경 시 attendance.user_name도 함께 변경
  const saveEdit = async (id: string) => {
    const current = members.find((m) => m.id === id);
    if (!current) return;

    const oldName = current.name.trim();
    const newName = editForm.name.trim();

    if (!newName) {
      alert("닉네임을 입력해 주세요.");
      return;
    }

    if (
      newName.toLowerCase() !== oldName.toLowerCase() &&
      members.some(
        (m) => m.id !== id && m.name.trim().toLowerCase() === newName.toLowerCase()
      )
    ) {
      alert("이미 사용 중인 닉네임입니다.");
      return;
    }

    const { error: memberError } = await supabase
      .from("members")
      .update({
        name: newName,
        class: editForm.class,
        attack: Number(editForm.attack) || 0,
        defense: Number(editForm.defense) || 0,
        accuracy: Number(editForm.accuracy) || 0,
        memo: editForm.memo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (memberError) {
      alert("수정 실패: " + memberError.message);
      return;
    }

    // 이름이 바뀐 경우 기존 모든 보스 참여 기록의 닉네임도 즉시 변경
    if (newName !== oldName) {
      const { error: attendanceError } = await supabase
        .from("attendance")
        .update({ user_name: newName })
        .ilike("user_name", oldName);

      if (attendanceError) {
        alert(
          "길드원 정보는 변경됐지만 보스 참여 기록의 닉네임 변경에 실패했습니다: " +
          attendanceError.message
        );
      }
    }

    await fetchMembers();
    setEditId(null);
  };

  // 삭제 버튼은 확인창 없이 즉시 삭제
  const deleteMember = async (m: Member) => {
    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .eq("user_name", m.name.trim());

    if (attendanceError) {
      alert("참여 기록 삭제 실패: " + attendanceError.message);
      return;
    }

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", m.id);

    if (error) {
      alert("길드원 삭제 실패: " + error.message);
      return;
    }

    setMembers((prev) => prev.filter((item) => item.id !== m.id));
  };

  const powerValue = (m: Member) =>
    Number(m.attack || 0) + Number(m.defense || 0) + Number(m.accuracy || 0);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return members
      .filter((m) => m.name.toLowerCase().includes(keyword))
      .sort((a, b) => {
        let result = 0;

        if (sortKey === "power") {
          result = powerValue(a) - powerValue(b);
        } else if (sortKey === "name") {
          result = a.name.localeCompare(b.name, "ko");
        } else {
          result = String(a.class || "").localeCompare(String(b.class || ""), "ko");
        }

        return sortAsc ? result : -result;
      });
  }, [members, search, sortKey, sortAsc]);

  return (
    <div className="bg">
      <div className="topArea">
        <div>
          <h1 className="title">🏰 길드원 목록</h1>
          <p className="subtitle">길드원의 정보와 전체 투력을 한눈에 관리하세요.</p>
        </div>
        <button className="btn save addTop" onClick={() => setShowPwModal(true)}>
          ➕ 길드원 추가
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="🔎 닉네임 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="sortArea">
          <span>정렬</span>
          <select
            className="sortSelect"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="power">전체 투력</option>
            <option value="name">닉네임</option>
            <option value="class">직업</option>
          </select>
          <button
            className="sortDirection"
            onClick={() => setSortAsc((v) => !v)}
            title="정렬 방향 변경"
          >
            {sortAsc ? "↑ 오름차순" : "↓ 내림차순"}
          </button>
        </div>
      </div>

      {showPwModal && (
        <div className="modal" onClick={() => setShowPwModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <h2>🔐 관리자 인증</h2>
            <input
              className="input"
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkPassword();
              }}
              autoFocus
            />
            <button className="btn save" onClick={checkPassword}>확인</button>
            <button className="btn cancel" onClick={() => setShowPwModal(false)}>취소</button>
          </div>
        </div>
      )}

      <div className={`panel ${showAddPanel ? "open" : ""}`}>
        <div className="panelHeader">
          <h2>➕ 길드원 추가</h2>
          <button className="btn cancel" onClick={() => setShowAddPanel(false)}>❌</button>
        </div>

        <input className="input" placeholder="닉네임" value={addForm.name}
          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
        <input className="input" placeholder="직업" value={addForm.class}
          onChange={(e) => setAddForm({ ...addForm, class: e.target.value })} />
        <input className="input" type="number" placeholder="공격력"
          value={addForm.attack === 0 ? "" : addForm.attack}
          onChange={(e) => setAddForm({ ...addForm, attack: Number(e.target.value) })} />
        <input className="input" type="number" placeholder="방어력"
          value={addForm.defense === 0 ? "" : addForm.defense}
          onChange={(e) => setAddForm({ ...addForm, defense: Number(e.target.value) })} />
        <input className="input" type="number" placeholder="명중"
          value={addForm.accuracy === 0 ? "" : addForm.accuracy}
          onChange={(e) => setAddForm({ ...addForm, accuracy: Number(e.target.value) })} />

        <button className="btn save full" onClick={addMember}>저장</button>
      </div>

      <div className="resultCount">총 {filtered.length}명</div>

      <div className="grid">
        {filtered.map((m) => (
          <div key={m.id} className="card soft">
            <div className="cardHead">
              <div className="avatar">🐰</div>
              <div className="headActions">
                <button className="iconBtn editIcon" onClick={() => startEdit(m)} title="수정">✏️</button>
                <button className="iconBtn deleteIcon" onClick={() => deleteMember(m)} title="삭제">🗑️</button>
              </div>
            </div>

            <div className="name">{m.name}</div>
            <div className="job">🧙 {m.class || "직업 미입력"}</div>

            {editId === m.id ? (
              <div className="editBox">
                <div className="editTitle">✏️ 길드원 정보 수정</div>

                <div>
                  🏷 닉네임
                  <input className="input" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>

                <div className="editGrid">
                  <div>🧙 직업
                    <input className="input" value={editForm.class}
                      onChange={(e) => setEditForm({ ...editForm, class: e.target.value })} />
                  </div>
                  <div>⚔ 공격력
                    <input className="input" type="number" value={editForm.attack}
                      onChange={(e) => setEditForm({ ...editForm, attack: Number(e.target.value) })} />
                  </div>
                  <div>🛡 방어력
                    <input className="input" type="number" value={editForm.defense}
                      onChange={(e) => setEditForm({ ...editForm, defense: Number(e.target.value) })} />
                  </div>
                  <div>🎯 명중
                    <input className="input" type="number" value={editForm.accuracy}
                      onChange={(e) => setEditForm({ ...editForm, accuracy: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="memoInput">
                  📝 신화 / 메모
                  <input className="input" value={editForm.memo}
                    onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                    placeholder="신화 3개 / 전설 2개" />
                </div>

                <div className="editBtns">
                  <button className="btn save" onClick={() => saveEdit(m.id)}>💾 저장</button>
                  <button className="btn cancel" onClick={() => setEditId(null)}>❌ 취소</button>
                </div>
              </div>
            ) : (
              <>
                <div className="statsGrid">
                  <div className="stat"><span>⚔ 공격력</span><b>{Number(m.attack || 0).toLocaleString()}</b></div>
                  <div className="stat"><span>🛡 방어력</span><b>{Number(m.defense || 0).toLocaleString()}</b></div>
                  <div className="stat"><span>🎯 명중</span><b>{Number(m.accuracy || 0).toLocaleString()}</b></div>
                </div>

                <div className="power">⭐ 전체 투력 <strong>{powerValue(m).toLocaleString()}</strong></div>
                <div className="memo">📝 {m.memo || "메모 없음"}</div>
                <div className="updated">
                  수정일 : {m.updated_at ? new Date(m.updated_at).toLocaleDateString("ko-KR") : "-"}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .bg { min-height: 100vh; padding: 35px; background: linear-gradient(180deg, #fff7fc, #f7f1ff); }
        .topArea { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:8px; }
        .title { font-size: 42px; font-weight: 900; color: #ff72b8; margin:0; }
        .subtitle { color:#a08b95; margin:8px 0 0; font-size:14px; }
        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:20px 0; }
        .search { padding:14px 18px; width:min(430px, 100%); border-radius:999px; border:1px solid #f0e6ff; background:white; box-shadow:0 2px 8px rgba(0,0,0,.05); outline:none; }
        .sortArea { display:flex; align-items:center; gap:8px; color:#736066; font-size:13px; font-weight:700; }
        .sortSelect, .sortDirection { border:1px solid #e8d9ff; background:white; color:#5f5260; border-radius:12px; padding:10px 12px; font-weight:700; cursor:pointer; }
        .sortDirection { color:#8672ff; }
        .resultCount { color:#8f7e87; font-size:13px; font-weight:700; margin:4px 0 12px; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px; }
        .card { padding:20px; border-radius:24px; background:white; box-shadow:0 10px 25px rgba(0,0,0,.08); position:relative; }
        .soft { border:1px solid #f0e6ff; }
        .cardHead { display:flex; justify-content:space-between; align-items:flex-start; }
        .avatar { font-size:40px; }
        .headActions { display:flex; gap:6px; }
        .iconBtn { border:none; width:36px; height:36px; border-radius:10px; cursor:pointer; padding:0; }
        .editIcon { background:#f0efff; color:#6d5ce7; }
        .deleteIcon { background:#fff0f3; color:#e85c7a; }
        .name { font-size:22px; font-weight:900; color:#332228; margin-top:4px; }
        .job { display:inline-block; padding:6px 14px; border-radius:999px; background:#f3e9ff; margin:10px 0 14px; font-size:13px; font-weight:bold; color:#6b21a8; }
        .statsGrid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .stat { background:#faf9fd; border-radius:12px; padding:10px 6px; text-align:center; }
        .stat span { display:block; font-size:11px; color:#8d7e86; margin-bottom:4px; }
        .stat b { font-size:14px; color:#3f3137; }
        .power { margin-top:12px; font-weight:900; color:#ff4e9f; font-size:16px; display:flex; justify-content:space-between; align-items:center; background:#fff5fa; padding:10px 12px; border-radius:12px; }
        .power strong { font-size:17px; }
        .memo { margin-top:12px; font-size:13px; color:#555; background:#fafafa; padding:10px; border-radius:12px; border:1px solid #f0f0f0; line-height:1.4; }
        .updated { margin-top:8px; font-size:11px; color:#aaa; text-align:right; }
        .input { width:100%; box-sizing:border-box; padding:11px 14px; margin-top:6px; border-radius:12px; border:1px solid #e8d9ff; outline:none; font-size:14px; background:white; }
        .input:focus { border-color:#ff8fc9; }
        .btn { border:none; padding:10px 16px; border-radius:12px; margin-top:10px; cursor:pointer; font-weight:bold; font-size:14px; }
        .save { background:#ff8fc9; color:white; }
        .save:hover { background:#f076b4; }
        .cancel { background:#e5e7eb; color:#4b5563; }
        .full { width:100%; margin-top:16px; padding:14px; }
        .addTop { white-space:nowrap; }
        .modal { position:fixed; inset:0; background:rgba(0,0,0,.4); backdrop-filter:blur(2px); display:flex; justify-content:center; align-items:center; z-index:999; }
        .modalCard { background:white; padding:24px; border-radius:24px; width:320px; box-shadow:0 20px 25px -5px rgba(0,0,0,.1); }
        .modalCard h2 { font-size:18px; margin:0 0 12px; color:#4a353d; }
        .panel { position:fixed; top:0; right:-420px; width:380px; height:100vh; background:white; box-shadow:-10px 0 30px rgba(0,0,0,.15); padding:24px; transition:.35s ease; z-index:9999; box-sizing:border-box; overflow-y:auto; }
        .panel.open { right:0; }
        .panelHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
        .panelHeader h2 { margin:0; font-size:20px; color:#4a353d; }
        .editBox { margin-top:10px; padding:16px; border-radius:20px; background:linear-gradient(135deg,#fff5fb,#f3efff); border:1px solid #ffd3e4; }
        .editTitle { font-weight:900; margin-bottom:12px; color:#4a353d; font-size:15px; }
        .editGrid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-top:12px; font-size:13px; color:#736066; font-weight:600; }
        .memoInput { margin-top:12px; font-size:13px; color:#736066; font-weight:600; }
        .editBtns { display:flex; gap:8px; margin-top:14px; }
        @media (max-width:768px) {
          .bg { padding:20px 14px; }
          .topArea { align-items:stretch; flex-direction:column; }
          .title { font-size:32px; }
          .addTop { width:100%; }
          .toolbar { flex-direction:column; align-items:stretch; }
          .search { width:100%; }
          .sortArea { flex-wrap:wrap; }
          .sortSelect { flex:1; }
          .sortDirection { flex:1; }
          .grid { grid-template-columns:1fr; }
          .panel { width:min(380px,92vw); }
        }
      `}</style>
    </div>
  );
}
