"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Pos = { x: number; y: number };

// 🌟 [아이콘 크기 설정] 가로와 세로 길이를 여기서 개별 조절하세요!
const ICON_WIDTH = 96;   // ↔️ 가로 크기 (옆으로 더 늘리려면 이 숫자를 키우세요)
const ICON_HEIGHT = 64;  // ↕️ 세로 크기

export default function LadderGameFX() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 🌟 타고 내려갈 아이콘 이미지 객체를 담을 Ref
  const iconImageRef = useRef<HTMLImageElement | null>(null);

  // 👥 네이버 스타일 기본 인원수 상태 관리 (기본 6명)
  const [memberCount, setMemberCount] = useState<number>(6);
  const [players, setPlayers] = useState<string[]>([]);
  const [rewards, setRewards] = useState<string[]>([]);

  // 🌟 게임의 은폐 및 진행 상태 제어 ('READY': 가려진 상태 / 'PLAYING': 게임 진행 중)
  const [gameState, setGameState] = useState<"READY" | "PLAYING">("READY");
  const [running, setRunning] = useState(false);
  const [activePath, setActivePath] = useState<Pos[]>([]);
  const [cursor, setCursor] = useState<Pos | null>(null);
  const [result, setResult] = useState<string[]>([]);

  const rows = 10; // 사다리 가로줄 칸막이 층수
  const colGapRef = useRef(0);
  const rowGapRef = useRef(0);
  const paddingRef = useRef(40); // 🌟 좌우 짤림 방지 안심 여백 고정
  const ladder = useRef<boolean[][]>([]);

  // 🌟 컴포넌트 마운트 시 사용할 이미지 미리 로드하기
  useEffect(() => {
    const img = new Image();
    // 사용할 이미지 주소나 public 폴더 안의 경로를 넣어주세요.
    img.src = "/image.png"; 
    iconImageRef.current = img;
  }, []);

  // 🎯 1. 인원 수 변경에 따른 배열 초기화 및 데이터 보존
  useEffect(() => {
    setPlayers((prev) => {
      const copy = [...prev];
      if (copy.length < memberCount) {
        while (copy.length < memberCount) copy.push("");
      } else {
        copy.length = memberCount;
      }
      return copy;
    });

    setRewards((prev) => {
      const copy = [...prev];
      if (copy.length < memberCount) {
        while (copy.length < memberCount) copy.push("");
      } else {
        copy.length = memberCount;
      }
      return copy;
    });

    setResult([]);
    setActivePath([]);
    setCursor(null);
    setGameState("READY"); // 인원수 변경되면 가림막 대기 상태로 리셋
  }, [memberCount]);

  // 🎯 2. 가로 작대기 랜덤 생성 엔진 (다리가 양옆으로 겹치거나 이어지지 않게 안전 분기)
  const generateLadder = useCallback(() => {
    const nextLadder: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      const rowArr = Array(Math.max(memberCount - 1, 1)).fill(false);
      for (let x = 0; x < memberCount - 1; x++) {
        if (x > 0 && rowArr[x - 1]) {
          rowArr[x] = false; // 연속된 다리 겹침 방지
        } else {
          rowArr[x] = Math.random() > 0.6; // 약 40% 확률로 가로줄 다리 배치
        }
      }
      nextLadder.push(rowArr);
    }
    ladder.current = nextLadder;
  }, [memberCount]);

  // 🎯 3. 사다리 레이아웃 칼정렬 렌더링 시스템
  const draw = useCallback((path: Pos[] = [], current?: Pos | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);

    // 배경색 도장
    ctx.fillStyle = "#faf8ff";
    ctx.fillRect(0, 0, width, height);

    const padding = paddingRef.current;
    const usableWidth = width - padding * 2;
    
    const colGap = memberCount > 1 ? usableWidth / (memberCount - 1) : usableWidth;
    const rowGap = (height - 60) / rows;

    colGapRef.current = colGap;
    rowGapRef.current = rowGap;

    if (gameState === "READY") return;

    // A. 기본 뼈대 세로 기둥선 그리기
    for (let i = 0; i < memberCount; i++) {
      const lineX = padding + colGap * i;
      ctx.beginPath();
      ctx.moveTo(lineX, 30);
      ctx.lineTo(lineX, height - 30);
      ctx.strokeStyle = "#e2d9f3";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // B. 랜덤 생성된 가로 작대기 그리기
    for (let y = 0; y < rows; y++) {
      const lineY = 30 + (y + 0.5) * rowGap;
      for (let x = 0; x < memberCount - 1; x++) {
        if (ladder.current[y]?.[x]) {
          ctx.beginPath();
          ctx.moveTo(padding + colGap * x, lineY);
          ctx.lineTo(padding + colGap * (x + 1), lineY);
          ctx.strokeStyle = "#ff72b8";
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
    }

    // C. 타고 내려가는 실시간 경로 드로잉
    if (path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.strokeStyle = "#8672ff";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    // D. 🌟 [수정 완료] 아이콘 가로(Width), 세로(Height) 비율 개별 렌더링 반영
    if (current && iconImageRef.current) {
      const img = iconImageRef.current;

      if (img.complete && img.naturalWidth !== 0) {
        ctx.save();

        // 이미지가 선 정중앙에 위치하도록 가로/세로 각각 절반씩 차감하여 그립니다.
        ctx.drawImage(
          img,
          current.x - ICON_WIDTH / 2,
          current.y - ICON_HEIGHT / 2,
          ICON_WIDTH,
          ICON_HEIGHT
        );
        ctx.restore();
      }
    }
  }, [memberCount, gameState]);

  // 🎯 4. 캔버스 해상도 깨짐/짤림 방지 동기화 설정 함수
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    draw(activePath, cursor);
  }, [draw, activePath, cursor]);

  useEffect(() => {
    generateLadder();
  }, [memberCount, generateLadder]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [memberCount, setupCanvas, gameState]);

  const handleStartGame = () => {
    generateLadder();
    setResult([]);
    setActivePath([]);
    setCursor(null);
    setGameState("PLAYING");
  };

  // 🎯 5. 네이버처럼 가로-세로 꺾이는 무빙 프레임 좌표 추출 알고리즘
  function getSmoothPath(startIdx: number) {
    let x = startIdx;
    const pathPoints: Pos[] = [];
    const colGap = colGapRef.current;
    const rowGap = rowGapRef.current;
    const padding = paddingRef.current;

    pathPoints.push({ x: padding + colGap * x, y: 30 });

    for (let y = 0; y < rows; y++) {
      const currentY = 30 + (y + 0.5) * rowGap;
      pathPoints.push({ x: padding + colGap * x, y: currentY });

      if (ladder.current[y]?.[x]) {
        x += 1;
        pathPoints.push({ x: padding + colGap * x, y: currentY });
      } else if (x > 0 && ladder.current[y]?.[x - 1]) {
        x -= 1;
        pathPoints.push({ x: padding + colGap * x, y: currentY });
      }
    }

    pathPoints.push({ x: padding + colGap * x, y: canvasRef.current!.offsetHeight - 30 });
    return { points: pathPoints, finalX: x };
  }

  // 🎯 6. 선을 자연스럽게 스캔하며 타고 흐르는 애니메이션 코어 구동기
  function animateTrack(fullPoints: Pos[], finalX: number, startIdx: number) {
    setRunning(true);
    let segmentIdx = 0;
    let ratio = 0;
    const renderTrail: Pos[] = [fullPoints[0]];

    function animateStep() {
      if (segmentIdx >= fullPoints.length - 1) {
        const finalReward = rewards[finalX] || "미정";
        setResult((prev) => {
          const next = [...prev];
          next[startIdx] = finalReward;
          return next;
        });
        setRunning(false);
        return;
      }

      const startPt = fullPoints[segmentIdx];
      const endPt = fullPoints[segmentIdx + 1];

      ratio += 0.12;
      if (ratio >= 1) ratio = 1;

      const curX = startPt.x + (endPt.x - startPt.x) * ratio;
      const curY = startPt.y + (endPt.y - startPt.y) * ratio;
      const curPos = { x: curX, y: curY };

      setCursor(curPos);
      
      const currentTrail = [...renderTrail, curPos];
      setActivePath(currentTrail);
      draw(currentTrail, curPos);

      if (ratio >= 1) {
        renderTrail.push(endPt);
        segmentIdx++;
        ratio = 0;
      }

      requestAnimationFrame(animateStep);
    }

    requestAnimationFrame(animateStep);
  }

  function startTrigger(index: number) {
    if (running || gameState === "READY") return;
    const { points, finalX } = getSmoothPath(index);
    animateTrack(points, finalX, index);
  }

  return (
    <div className="wrap">
      <h2 className="title">🎲 사다리 게임</h2>

      {/* ⚙️ 네이버 스타일 인원 설정 컨트롤 바 영역 */}
      <div className="counter-panel">
        <span className="counter-label">사다리 수 설정 :</span>
        <button className="count-btn" disabled={memberCount <= 2 || running} onClick={() => setMemberCount(m => m - 1)}>-</button>
        <span className="count-num">{memberCount}</span>
        <button className="count-btn" disabled={memberCount >= 12 || running} onClick={() => setMemberCount(m => m + 1)}>+</button>
        <button className="reset-btn" disabled={running} onClick={() => { generateLadder(); setGameState("READY"); }}>🔄 배열 셔플</button>
      </div>

      {/* 📝 게임 본체 */}
      <div className="game-container">
        <div className="input-row-grid">
          {players.map((p, i) => (
            <div key={`p-${i}`} className="input-cell">
              <input
                className="game-input text-center"
                placeholder={`이름 ${i + 1}`}
                value={p}
                disabled={running}
                onChange={(e) => {
                  const copy = [...players];
                  copy[i] = e.target.value;
                  setPlayers(copy);
                }}
              />
            </div>
          ))}
        </div>

        <div className="canvas-holder">
          <canvas ref={canvasRef} className="ladder-canvas" style={{ width: "100%", height: "460px" }} />
          
          {gameState === "READY" && (
            <div className="canvas-overlay">
              <div className="overlay-card">
                <p className="overlay-text">🔒 사다리 배열이 비밀리에 믹싱되었습니다.</p>
                <button className="start-play-btn" onClick={handleStartGame}>🎲 사다리 시작하기</button>
              </div>
            </div>
          )}
        </div>

        <div className="input-row-grid">
          {rewards.map((r, i) => (
            <div key={`r-${i}`} className="input-cell">
              <input
                className="game-input text-center reward-input"
                placeholder={`결과 ${i + 1}`}
                value={r}
                disabled={running}
                onChange={(e) => {
                  const copy = [...rewards];
                  copy[i] = e.target.value;
                  setRewards(copy);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 수동 작동 대시보드 */}
      <div className="trigger-dashboard">
        <h3>{gameState === "READY" ? "상단의 [사다리 시작하기]를 먼저 눌러주세요" : "🎯 플레이어를 눌러 시작하세요"}</h3>
        <div className="btn-flex-row">
          {players.map((p, i) => (
            <button 
              key={`btn-${i}`} 
              className={`player-go-btn ${result[i] ? 'done' : ''} ${gameState === "READY" ? "locked" : ""}`}
              disabled={running || gameState === "READY"} 
              onClick={() => startTrigger(i)}
            >
              {p.trim() || `${i + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* 🏆 스코어 보드 */}
      {result.some(Boolean) && (
        <div className="score-board">
          <h3>📋 실시간 정산 결과</h3>
          <div className="score-grid">
            {result.map((r, i) => r && (
              <div key={`res-${i}`} className="score-item">
                <span className="s-name">{players[i] || `${i + 1}번`}</span>
                <span className="s-arrow">👉</span>
                <span className="s-reward">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CSS STYLE ===== */}
      <style jsx>{`
        .wrap { padding: 30px 16px; max-width: 1200px; margin: 0 auto; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; background: #fdfbfe; min-height: 100vh; box-sizing: border-box; }
        .title { font-size: 32px; font-weight: 900; color: #8672ff; margin: 0 0 16px 0; }
        .counter-panel { display: flex; align-items: center; gap: 12px; background: white; padding: 10px 20px; border-radius: 999px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); border: 1px solid #f0edf5; margin-bottom: 24px; }
        .counter-label { font-size: 14px; font-weight: bold; color: #555; }
        .count-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #ede8f5; background: #faf8ff; font-size: 18px; font-weight: bold; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; }
        .count-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .count-num { font-size: 18px; font-weight: 900; color: #8672ff; min-width: 24px; text-align: center; }
        .reset-btn { background: #fff0f6; border: 1px solid #ffd6e7; color: #ff5fa2; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer; margin-left: 6px; }
        .game-container { width: 100%; display: flex; flex-direction: column; background: white; padding: 16px; border-radius: 24px; box-shadow: 0 10px 30px rgba(134,114,255,0.06); border: 1px solid #f2ecff; box-sizing: border-box; }
        .canvas-holder { width: 100%; position: relative; margin: 6px 0; }
        .ladder-canvas { width: 100%; display: block; background: #faf8ff; border-radius: 12px; }
        .canvas-overlay { position: absolute; inset: 0; background: rgba(243, 240, 250, 0.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; border-radius: 12px; animation: fadeIn 0.3s ease-in-out; }
        .overlay-card { background: white; padding: 24px 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(134, 114, 255, 0.15); border: 1px solid #ebdfff; text-align: center; }
        .overlay-text { font-size: 14px; color: #666; margin: 0 0 16px 0; font-weight: 500; }
        .start-play-btn { background: linear-gradient(135deg, #8672ff 0%, #6c54ff 100%); color: white; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: bold; cursor: pointer; box-shadow: 0 5px 15px rgba(108, 84, 255, 0.3); transition: all 0.2s; }
        .start-play-btn:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(108, 84, 255, 0.4); }
        .input-row-grid { display: flex; width: 100%; padding: 0; box-sizing: border-box; }
        .input-cell { flex: 1; padding: 2px 4px; box-sizing: border-box; display: flex; justify-content: center; }
        .game-input { width: 100%; padding: 8px 4px; border-radius: 10px; border: 1px solid #ebdbe1; font-size: 13px; font-weight: bold; color: #333; outline: none; box-sizing: border-box; background: #fdfbfe; }
        .game-input:focus { border-color: #8672ff; background: white; }
        .game-input.reward-input { border-color: #ffd3e4; }
        .game-input.reward-input:focus { border-color: #ff5fa2; }
        .text-center { text-align: center; }
        .trigger-dashboard { width: 100%; margin-top: 24px; background: #faf9ff; padding: 16px; border-radius: 20px; border: 1px dashed #d6ceff; text-align: center; box-sizing: border-box; }
        .trigger-dashboard h3 { margin: 0 0 12px 0; font-size: 15px; color: #6c54ff; }
        .btn-flex-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
        .player-go-btn { padding: 8px 16px; min-width: 65px; border: none; border-radius: 12px; background: #8672ff; color: white; font-weight: bold; font-size: 13px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(134,114,255,0.2); }
        .player-go-btn:hover { background: #6c54ff; }
        .player-go-btn.done { background: #b0a6f2; opacity: 0.7; box-shadow: none; }
        .player-go-btn.locked { background: #e2d9f3; color: #b2a7cb; cursor: not-allowed; box-shadow: none; }
        .score-board { width: 100%; margin-top: 20px; background: white; padding: 20px; border-radius: 20px; border: 1px solid #f2ecff; box-shadow: 0 6px 20px rgba(0,0,0,0.02); box-sizing: border-box; }
        .score-board h3 { margin: 0 0 14px 0; font-size: 16px; color: #444; border-bottom: 2px solid #faf8ff; padding-bottom: 8px; }
        .score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .score-item { display: flex; align-items: center; padding: 10px 14px; background: #fdfbfe; border-radius: 12px; border: 1px solid #fcf7fa; font-size: 14px; font-weight: bold; gap: 8px; }
        .s-name { color: #555; }
        .s-arrow { color: #ccc; font-size: 12px; }
        .s-reward { color: #ff5fa2; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .wrap { padding: 16px 8px; }
          .title { font-size: 24px; }
          .counter-panel { padding: 8px 14px; gap: 8px; }
          .game-container { padding: 8px; border-radius: 16px; }
          .game-input { font-size: 11px; padding: 6px 2px; border-radius: 6px; }
          .score-grid { grid-template-columns: 1fr; }
          .player-go-btn { padding: 6px 10px; font-size: 12px; min-width: 50px; }
          .overlay-card { padding: 16px 20px; }
          .start-play-btn { padding: 10px 20px; font-size: 14px; }
        }
      `}</style>
    </div>
  );
}