const socket = io();

// ---- DOM ----
const $ = (id) => document.getElementById(id);

const screenName = $("screen-name");
const screenLobby = $("screen-lobby");
const screenWaiting = $("screen-waiting");
const screenPrompts = $("screen-prompts");
const screenStory = $("screen-story");
const screenResults = $("screen-results");

const nicknameInput = $("input-nickname");
//const btnNext = $("btn-next");

// entry buttons
const btnCreateRoom = $("btn-create-room");
const btnJoinRoom = $("btn-join-room");

// join screen
const roomCodeInput = $("input-room-code");
const btnJoin = $("btn-join"); // Go! 버튼 (중요)
const hostControls = $("host-controls");
const btnCopy = $("btn-copy");
const waitMsgLobby = $("wait-msg-lobby");


// lobby
const displayRoomCode = $("display-room-code");
const playerList = $("player-list");

const btnLeave = $("btn-leave");
const btnStart = $("btn-start");

// prompts
const btnSubmitPrompts = $("btn-submit-prompts");
const waitMsg = $("wait-msg");

// story
const displayRound = $("display-round");
const displayTotalRounds = $("display-total-rounds");
const myInboxPrompts = $("my-inbox-prompts");
const storySoFar = $("story-so-far");
const inputStoryText = $("input-story-text");
const btnSubmitStory = $("btn-submit-story");
const storyWaitMsg = $("story-wait-msg");
const displayTimer = $("display-timer");

// results (갈틱폰 스타일)
const storyTitle = $("story-title");
const storyDisplay = $("story-display");
const currentSentence = $("current-sentence");
const sentenceWriter = $("sentence-writer");
const storyProgress = $("story-progress");
const progressText = $("progress-text");
const btnPrev = $("btn-prev");
const btnNextSentence = $("btn-next-sentence");
const btnRestart = $("btn-restart");

// ---- Local state ----
let myName = "";
let currentRoomState = null;
let currentRoundPayload = null;

// 결과 화면 상태
let resultData = null;       // 전체 결과 데이터
let resultHostId = null;     // 결과 화면의 방장 ID
let currentChainIndex = 0;   // 현재 스토리 인덱스
let currentEntryIndex = -1;  // 현재 문장 인덱스 (-1: 제목만 표시)

// ---- UI helpers ----
function showScreen(which) {
  [screenName, screenLobby, screenWaiting, screenPrompts, screenStory, screenResults].forEach((s) =>
    s?.classList.add("hidden")
  );
  if (which) which.classList.remove("hidden");
}

function alertError(msg) {
  alert(msg);
}

// 제시어 사용 현황 UI 갱신
function updatePromptUsageUI() {
  if (!inputStoryText || !myInboxPrompts) return;

  const textRaw = String(inputStoryText.value || "");
  const text = textRaw.replace(/\s+/g, ""); // 공백 제거

  const chips = Array.from(myInboxPrompts.querySelectorAll(".result-item"));
  for (const chip of chips) {
    const keyRaw = String(chip.dataset.prompt || "");
    const key = keyRaw.replace(/\s+/g, ""); // 공백 제거
    if (!key) continue;

    const used = text.includes(key);
    chip.classList.toggle("used", used);
  }
}


// 닉네임을 매번 안전하게 확보 (버튼 누르는 순간 읽어서 myName 갱신)
function ensureName() {
  const trimmed = String(nicknameInput?.value || "").trim();
  if (!trimmed) {
    alertError("닉네임을 입력해줘!");
    return null;
  }
  myName = trimmed;
  return myName;
}

function renderPlayers(players, hostId) {
  if (!playerList) return;
  playerList.innerHTML = "";

  (players || []).forEach((p) => {
    const div = document.createElement("div");
    div.className = "player-card";
    const isHost = p.id === hostId;
    const promptDone = p.submitted?.prompts ? " (제시어 완료)" : "";
    div.textContent = `${p.name}${isHost ? " (방장)" : ""}${promptDone}`;
    playerList.appendChild(div);
  });
}

function renderPromptChips(container, items) {
  if (!container) return;
  container.innerHTML = "";
  for (const t of items || []) {
    const chip = document.createElement("div");
    chip.className = "result-item";
    chip.textContent = t;
    chip.dataset.prompt = normalizePromptText(t);
    container.appendChild(chip);
  }
}

// 제시어 텍스트 비교용 (앞부분 라벨 제거)

// XSS 방지용 HTML escape
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 문장 안에서 사용된 카드 키워드를 하이라이트
function highlightKeywords(text, keywords) {
  const raw = String(text ?? "");
  const list = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  if (list.length === 0) return escapeHtml(raw);

  // 긴 키워드부터 먼저 치환(부분 겹침 최소화)
  const sorted = [...new Set(list)].sort((a, b) => String(b).length - String(a).length);

  let html = escapeHtml(raw);
  for (const kw of sorted) {
    const safeKw = escapeHtml(String(kw));
    const re = new RegExp(escapeRegExp(safeKw), "g");
    html = html.replace(re, `<span class="prompt-highlight">${safeKw}</span>`);
  }
  return html;
}

function normalizePromptText(labelText) {
  const s = String(labelText ?? "").trim();
  const idx = s.indexOf(":");
  if (idx === -1) return s;
  return s.slice(idx + 1).trim();
}


function renderStorySoFar(entries, round) {
  if (!storySoFar) return;

  if (round === 0) {
    storySoFar.innerHTML = "";
    storySoFar.classList.add("hidden");
    return;
  }

  storySoFar.classList.remove("hidden");

  if (!entries || entries.length === 0) {
    storySoFar.textContent = "아직 아무도 작성하지 않았어.";
    return;
  }

  storySoFar.innerHTML = (entries || [])
  .map((e) => {
    const t = e?.text || "";
    const kws = e?.usedKeywords || [];
    return `<div style="margin-bottom:8px;">${highlightKeywords(t, kws)}</div>`;
  })
  .join("");

}

// 방장 여부 체크
function isResultHost() {
  return socket.id === resultHostId;
}

// 갈틱폰 스타일 결과 표시 함수들
function initResultsPresentation(payload) {
  resultData = payload;
  resultHostId = payload?.hostId || null;
  currentChainIndex = 0;
  currentEntryIndex = -1;

  const chains = payload?.chains || [];
  if (chains.length === 0) {
    if (storyTitle) storyTitle.textContent = "결과가 없어요";
    if (currentSentence) currentSentence.textContent = "";
    if (sentenceWriter) sentenceWriter.textContent = "";
    if (btnPrev) btnPrev.classList.add("hidden");
    if (btnNextSentence) btnNextSentence.classList.add("hidden");
    if (btnRestart) btnRestart.classList.remove("hidden");
    return;
  }

  // 처음 상태 표시
  updateResultsDisplay();
}

function updateResultsDisplay() {
  const chains = resultData?.chains || [];
  if (chains.length === 0) return;

  const chain = chains[currentChainIndex];
  const entries = chain?.entries || [];
  const totalStories = chains.length;
  const totalEntries = entries.length;

  // 제목 표시
  if (storyTitle) {
    storyTitle.textContent = `${chain.ownerName}의 이야기`;
    // 애니메이션 트리거
    storyTitle.style.animation = "none";
    storyTitle.offsetHeight; // reflow
    storyTitle.style.animation = "fadeIn 0.5s ease";
  }

  // 문장 표시
  if (currentEntryIndex === -1) {
    // 제목만 표시 상태
    if (currentSentence) {
      currentSentence.textContent = "스토리를 시작합니다...";
      currentSentence.style.animation = "none";
      currentSentence.offsetHeight;
      currentSentence.style.animation = "slideIn 0.4s ease";
    }
    if (sentenceWriter) sentenceWriter.textContent = "";
  } else {
    // 특정 문장 표시
    const entry = entries[currentEntryIndex];
    if (currentSentence) {
      currentSentence.innerHTML = highlightKeywords(entry?.text || "", entry?.usedKeywords || []);
      currentSentence.style.animation = "none";
      currentSentence.offsetHeight;
      currentSentence.style.animation = "slideIn 0.4s ease";
    }
    if (sentenceWriter) {
      sentenceWriter.textContent = `- ${entry?.writerName || "알 수 없음"} -`;
    }
  }

  // 진행 상황 표시
  if (progressText) {
    const storyNum = currentChainIndex + 1;
    const sentenceNum = currentEntryIndex + 1;
    if (currentEntryIndex === -1) {
      progressText.textContent = `스토리 ${storyNum} / ${totalStories}`;
    } else {
      progressText.textContent = `스토리 ${storyNum} / ${totalStories} • 문장 ${sentenceNum} / ${totalEntries}`;
    }
  }

  // 버튼 상태 업데이트
  updateResultButtons();
}

function updateResultButtons() {
  const chains = resultData?.chains || [];
  const chain = chains[currentChainIndex];
  const entries = chain?.entries || [];
  const isFirstPosition = currentChainIndex === 0 && currentEntryIndex === -1;
  const isLastPosition = currentChainIndex === chains.length - 1 && currentEntryIndex === entries.length - 1;
  const isHost = isResultHost();

  // 이전/다음 버튼은 방장만 표시
  if (btnPrev) {
    if (isHost) {
      btnPrev.disabled = isFirstPosition;
      btnPrev.classList.remove("hidden");
    } else {
      btnPrev.classList.add("hidden");
    }
  }

  if (btnNextSentence) {
    if (isHost) {
      if (isLastPosition) {
        btnNextSentence.textContent = "완료!";
      } else {
        btnNextSentence.textContent = "다음 →";
      }
      btnNextSentence.classList.remove("hidden");
    } else {
      btnNextSentence.classList.add("hidden");
    }
  }

  // 다시하기 버튼 (마지막에만, 방장만 표시)
  if (btnRestart) {
    btnRestart.classList.toggle("hidden", !(isLastPosition && isHost));
  }
}

function goNextInResults() {
  // 방장만 조작 가능
  if (!isResultHost()) return;

  const chains = resultData?.chains || [];
  if (chains.length === 0) return;

  const chain = chains[currentChainIndex];
  const entries = chain?.entries || [];

  // 마지막 위치인지 체크
  const isLastPosition = currentChainIndex === chains.length - 1 && currentEntryIndex === entries.length - 1;
  if (isLastPosition) {
    // 완료 상태
    return;
  }

  // 다음으로 이동
  let newChainIndex = currentChainIndex;
  let newEntryIndex = currentEntryIndex;

  if (currentEntryIndex < entries.length - 1) {
    // 같은 스토리 내에서 다음 문장
    newEntryIndex++;
  } else {
    // 다음 스토리로 이동
    if (currentChainIndex < chains.length - 1) {
      newChainIndex++;
      newEntryIndex = -1; // 제목부터 시작
    }
  }

  // 서버에 동기화 요청
  socket.emit("result:navigate", { chainIndex: newChainIndex, entryIndex: newEntryIndex });
}

function goPrevInResults() {
  // 방장만 조작 가능
  if (!isResultHost()) return;

  const chains = resultData?.chains || [];
  if (chains.length === 0) return;

  // 첫 위치인지 체크
  if (currentChainIndex === 0 && currentEntryIndex === -1) {
    return;
  }

  // 이전으로 이동
  let newChainIndex = currentChainIndex;
  let newEntryIndex = currentEntryIndex;

  if (currentEntryIndex > -1) {
    // 같은 스토리 내에서 이전 문장
    newEntryIndex--;
  } else {
    // 이전 스토리의 마지막 문장으로 이동
    if (currentChainIndex > 0) {
      newChainIndex--;
      const prevChain = chains[newChainIndex];
      const prevEntries = prevChain?.entries || [];
      newEntryIndex = prevEntries.length - 1;
    }
  }

  // 서버에 동기화 요청
  socket.emit("result:navigate", { chainIndex: newChainIndex, entryIndex: newEntryIndex });
}

// 서버에서 동기화 신호 받으면 화면 업데이트
function syncResultsDisplay(chainIndex, entryIndex) {
  currentChainIndex = chainIndex;
  currentEntryIndex = entryIndex;
  updateResultsDisplay();
}

function goByPhase(state) {
  if (!state) return;

  if (displayRoomCode) displayRoomCode.textContent = `#${state.roomId}`;
  renderPlayers(state.players || [], state.hostId);

  

  if (btnStart) btnStart.disabled = socket.id !== state.hostId;

if (state.phase === "lobby") {
  showScreen(screenLobby);

  const isHost = socket.id === state.hostId;

  // 방장/게스트 UI 토글
  if (hostControls) hostControls.classList.toggle("hidden", !isHost);
  if (waitMsgLobby) waitMsgLobby.classList.toggle("hidden", isHost);

  // 방장만 시작 가능
  if (btnStart) btnStart.disabled = !isHost;

  return;
}


  if (state.phase === "prompt") {
    showScreen(screenPrompts);

    if (btnSubmitPrompts) btnSubmitPrompts.disabled = false;
    if (waitMsg) waitMsg.classList.add("hidden");

    const me = (state.players || []).find((p) => p.id === socket.id);
    if (me?.submitted?.prompts) {
      if (btnSubmitPrompts) btnSubmitPrompts.disabled = true;
      if (waitMsg) waitMsg.classList.remove("hidden");
    }
    return;
  }

  if (state.phase === "story") {
    showScreen(screenStory);
    return;
  }

  if (state.phase === "result") {
    showScreen(screenResults);
    return;
  }

  // fallback
  showScreen(screenLobby);
}

// ---- Socket events ----
socket.on("connect", () => {
  console.log("connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("disconnected");
  // 연결 끊기면 안전하게 입장 화면으로
  showScreen(screenName);
});

socket.on("room:state", (state) => {
  console.log("room:state", state);
  currentRoomState = state;
  goByPhase(state);
});

socket.on("game:aborted", ({ reason }) => {
  alertError(`게임이 중단됐어: ${reason}`);
  showScreen(screenLobby);
});

socket.on("story:round", (payload) => {
  currentRoundPayload = payload;
  const currentRound = payload.round ?? 0;

  if (displayRound) displayRound.textContent = String(currentRound + 1);
  if (displayTotalRounds) displayTotalRounds.textContent = String(payload.totalRounds ?? 0);

  renderPromptChips(myInboxPrompts, payload.inboxPrompts || []);

  if (currentRound === 0) {
    if (storySoFar) {
      storySoFar.innerHTML = "";
      storySoFar.classList.add("hidden");
    }
  } else {
    if (storySoFar) storySoFar.classList.remove("hidden");
    renderStorySoFar(payload.chainEntries || [], currentRound);
  }

  // 입력란 초기화
  if (inputStoryText) inputStoryText.value = "";
  // 제시어 사용 현황 UI 갱신
  updatePromptUsageUI();

  // 버튼/메시지 초기화
  if (btnSubmitStory) btnSubmitStory.disabled = false;
  // 대기 메시지 숨기기
  if (storyWaitMsg) storyWaitMsg.classList.add("hidden");

  showScreen(screenStory);
});

socket.on("story:timer", ({ secondsLeft }) => {
  if (displayTimer) {
    displayTimer.textContent = `${secondsLeft}s`;
  }
});

socket.on("game:result", (payload) => {
  initResultsPresentation(payload);
  showScreen(screenResults);
});

// 결과 화면 동기화 (방장이 조작하면 모두에게 전파)
socket.on("result:sync", ({ chainIndex, entryIndex }) => {
  syncResultsDisplay(chainIndex, entryIndex);
});

// 다시하기 (방장이 누르면 모두 로비로)
socket.on("game:restarted", () => {
  showScreen(screenLobby);
});

// ---- Button handlers ----

// (옵션) Next 버튼: 닉네임 저장하고 join 화면으로 이동
//btnNext?.addEventListener("click", () => {
 // if (!ensureName()) return;
 // showScreen(screenWaiting);
 // setTimeout(() => roomCodeInput?.focus(), 0);
//});

// 스토리 입력란 변화 감지: 제시어 사용 현황 UI 갱신
inputStoryText?.addEventListener("input", () => {
  updatePromptUsageUI();
});


// 방 만들기: 닉네임 확인 후 바로 생성
btnCreateRoom?.addEventListener("click", () => {
  if (!ensureName()) return;

  socket.emit("room:create", { name: myName }, (res) => {
    if (!res?.ok) return alertError(`방 생성 실패: ${res?.error || "UNKNOWN"}`);
    if (res.state) {
      currentRoomState = res.state;
      goByPhase(res.state);
    }
  });
});

// 방 들어가기: 닉네임 확인 후 방 코드 입력 화면으로 이동만
btnJoinRoom?.addEventListener("click", () => {
  if (!ensureName()) return;

  showScreen(screenWaiting);
  setTimeout(() => roomCodeInput?.focus(), 0);
});

// Go!: 실제 방 입장
btnJoin?.addEventListener("click", () => {
  if (!ensureName()) return;

  const roomId = String(roomCodeInput?.value || "").trim();
  if (!roomId) return alertError("방 코드를 입력해줘!");

  socket.emit("room:join", { roomId, name: myName }, (res) => {
    if (!res?.ok) return alertError(`방 입장 실패: ${res?.error || "UNKNOWN"}`);
    if (res.state) {
      currentRoomState = res.state;
      goByPhase(res.state);
    }
  });
});

btnLeave?.addEventListener("click", () => {
  socket.emit("room:leave", {}, (res) => {
    if (!res?.ok) return alertError(`나가기 실패: ${res?.error || "UNKNOWN"}`);

    if (displayRoomCode) displayRoomCode.textContent = "#----";
    if (playerList) playerList.innerHTML = "";
    if (roomCodeInput) roomCodeInput.value = "";

    showScreen(screenName);
  });
});

// 게임 시작
btnStart?.addEventListener("click", () => {
  socket.emit("game:start", {}, (res) => {
    if (!res?.ok) return alertError(`시작 실패: ${res?.error || "UNKNOWN"}`);
  });
});

// 방 코드 복사
btnCopy?.addEventListener("click", async () => {
  const roomId = currentRoomState?.roomId;
  if (!roomId) return alertError("복사할 방 코드가 없어!");

  const text = String(roomId);

  try {
    await navigator.clipboard.writeText(text);
    alert(`방 코드 복사됨: ${text}`);
  } catch (e) {
    // fallback (권한/https 이슈 대비)
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);

    alert(`방 코드 복사됨: ${text}`);
  }
});

// 제시어 제출
btnSubmitPrompts?.addEventListener("click", () => {
  const inputs = Array.from(document.querySelectorAll(".input-prompt"));
  const prompts = inputs.map((el) => {
    const v = String(el.value || "").trim();
    if (v) return v;
    // 못 적은 경우: placeholder(예시)로 자동 채움
    return String(el.placeholder || "").trim();
  });
 
  // 안전장치: placeholder도 비어있으면 에러
  if (prompts.some((p) => !p)) return alertError("제시어 3개를 모두 입력해줘!");

  btnSubmitPrompts.disabled = true;
  if (waitMsg) waitMsg.classList.remove("hidden");

  socket.emit("prompt:submit", { prompts }, (res) => {
    if (!res?.ok) {
      btnSubmitPrompts.disabled = false;
      if (waitMsg) waitMsg.classList.add("hidden");
      return alertError(`제시어 제출 실패: ${res?.error || "UNKNOWN"}`);
    }
  });
});

btnSubmitStory?.addEventListener("click", () => {
  const text = String(inputStoryText?.value || "").trim();
  if (!text) return alertError("문장을 입력해줘!");

  btnSubmitStory.disabled = true;
  if (storyWaitMsg) storyWaitMsg.classList.remove("hidden");

  socket.emit("story:submit", { text }, (res) => {
    if (!res?.ok) {
      btnSubmitStory.disabled = false;
      if (storyWaitMsg) storyWaitMsg.classList.add("hidden");
      return alertError(`제출 실패: ${res?.error || "UNKNOWN"}`);
    }
  });
});

// 결과 화면 버튼 핸들러
btnNextSentence?.addEventListener("click", () => {
  goNextInResults();
});

btnPrev?.addEventListener("click", () => {
  goPrevInResults();
});

// 키보드 네비게이션 (결과 화면에서, 방장만)
document.addEventListener("keydown", (e) => {
  if (screenResults?.classList.contains("hidden")) return;
  if (!isResultHost()) return; // 방장만 키보드 조작 가능

  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    goNextInResults();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goPrevInResults();
  }
});

// 다시하기 버튼 (방장만)
btnRestart?.addEventListener("click", () => {
  if (!isResultHost()) return;

  socket.emit("game:restart", {}, (res) => {
    if (!res?.ok) return alertError(`다시하기 실패: ${res?.error || "UNKNOWN"}`);
  });
});

// ---- 초기 화면 ----
showScreen(screenName);
