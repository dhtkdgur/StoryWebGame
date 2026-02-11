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
const roomCodeDisplay = $("room-code-btn"); // 방 코드 표시 컨테이너 (클릭 시 복사)
const waitMsgLobby = $("wait-msg-lobby");

// BGM
const bgm = $("bgm");

// Menu (설정 메뉴)
const menuToggle = $("menu-toggle");
const menuPanel = $("menu-panel");
const menuClose = $("menu-close");
const menuOverlay = $("menu-overlay");
const bgmVolumeSlider = $("bgm-volume");
const bgmVolumeValue = $("bgm-volume-value");
const sfxVolumeSlider = $("sfx-volume");
const sfxVolumeValue = $("sfx-volume-value");
const masterMuteToggle = $("master-mute-toggle");

// lobby
const displayRoomCode = $("display-room-code");
const playerList = $("player-list");

const btnLeave = $("btn-leave");
const btnStart = $("btn-start");

// 대기실 인원수
const playerCountEl = $("player-count");
const playerMaxEl = $("player-max");

const MAX_PLAYERS = 12;

// prompts
const btnSubmitPrompts = $("btn-submit-prompts");
const waitMsg = $("wait-msg");
const displayPromptTimer = $("display-prompt-timer");
const promptStatusList = $("prompt-status-list");

// story
const displayRound = $("display-round");
const displayTotalRounds = $("display-total-rounds");
const myInboxPrompts = $("my-inbox-prompts");
const storySoFar = $("story-so-far");
const inputStoryText = $("input-story-text");
const btnSubmitStory = $("btn-submit-story");
const storyWaitMsg = $("story-wait-msg");
const displayTimer = $("display-timer");

// results (채팅방 스타일)
const storyTitle = $("story-title");
const chatContainer = $("chat-container");
const storyProgress = $("story-progress");
const progressText = $("progress-text");

// results buttons
const btnPrev = $("btn-prev");
const btnNextStory = $("btn-next-story");
const btnRestart = $("btn-restart");
const btnScreenshot = $("btn-screenshot");
const btnExit = $("btn-exit");

// player status (작성 상태)
const playerStatusList = $("player-status-list");

// player sidebar (양쪽 플레이어 사이드바 - 스토리 화면)
const playersLeft = $("players-left");
const playersRight = $("players-right");

// player sidebar (양쪽 플레이어 사이드바 - 키워드 화면)
const promptsPlayersLeft = $("prompts-players-left");
const promptsPlayersRight = $("prompts-players-right");

// player sidebar (결과 화면)
const resultsPlayersLeft = $("results-players-left");

// emoji (이모티콘)
const btnEmojiToggle = $("btn-emoji-toggle");
const emojiPicker = $("emoji-picker");
const emojiList = $("emoji-list");
const emojiDisplay = $("emoji-display");

// avatar (아바타)
const avatarList = $("avatar-list");
const avatarPreview = $("avatar-preview");

// result emoji (결과 화면 이모티콘)
const resultEmojiContainer = $("result-emoji-container");

// round label and countdown
const roundLabel = $("round-label");
const screenCountdown = $("screen-countdown");
const countdownNumber = $("countdown-number");

// ---- Local state ----
let myName = "";
let myAvatar = null; // 선택한 아바타 ID
let currentRoomState = null;
let currentRoundPayload = null;
let isWriting = false; // 작성 중 상태
let writingTimeout = null; // 작성 중 타이머
let lastPhase = null; // 이전 단계 추적용

// 타이머 알림음 재생 여부 추적
let promptTimeoutSoundPlayed = false;
let storyTimeoutSoundPlayed = false;

// 결과 화면 상태
let resultData = null;       // 전체 결과 데이터
let resultHostId = null;     // 결과 화면의 방장 ID
let currentChainIndex = 0;   // 현재 스토리 인덱스
let chatAnimationTimer = null; // 채팅 애니메이션 타이머
let displayedEntryCount = 0;   // 현재 표시된 문장 수

// TTS 관련 (Web Speech API 사용)
let ttsEnabled = true;       // TTS 활성화 여부

// 닉네임 색상 배열 (다양한 색상으로 구분)
const NICKNAME_COLORS = [
  "#f59e0b", // 주황 (기존)
  "#3b82f6", // 파랑
  "#10b981", // 초록
  "#ec4899", // 핑크
  "#8b5cf6", // 보라
  "#ef4444", // 빨강
  "#06b6d4", // 청록
  "#84cc16", // 연두
];

// 플레이어 이름 → 색상 매핑 (결과 화면용)
let playerColorMap = {};

// ---- Utility: Visual Length ----
function getVisualLength(str) {
  if (!str) return 0;
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    // 한글 등 2바이트 이상 문자는 가중치 2, 그 외 1
    if (str.charCodeAt(i) > 127) len += 2;
    else len += 1;
  }
  return len;
}


// 제출 상태에 따른 입력 잠금
function applyInputLocksFromState(state) {
  if (!state) return;

  const me = (state.players || []).find((p) => p.id === socket.id);
  const phase = state.phase;

  // prompt 단계: 제시어 제출 완료면 input 막기
  if (phase === "prompt") {
    const locked = !!me?.submitted?.prompts;
    const inputs = document.querySelectorAll(".input-prompt");
    inputs.forEach((el) => {
      el.disabled = locked;
    });
    if (btnSubmitPrompts) btnSubmitPrompts.disabled = locked;
  }

  // story 단계: 스토리 제출 완료면 textarea 막기
  if (phase === "story") {
    const locked = !!me?.submitted?.story;
    if (inputStoryText) inputStoryText.disabled = locked;
    if (btnSubmitStory) btnSubmitStory.disabled = locked;

    // 제출 완료면 "다른 플레이어 기다리는 중" 표시도 같이
    if (storyWaitMsg) storyWaitMsg.classList.toggle("hidden", !locked);
  }
}

// ---- UI helpers ----
function showScreen(which) {
  [
    screenName,
    screenLobby,
    screenWaiting,
    screenCountdown,
    screenPrompts,
    screenStory,
    screenResults
  ].forEach((s) => s?.classList.add("hidden"));

  if (which) which.classList.remove("hidden");

  // 첫화면/대기실에서만 통합 배경 적용
  const useMainBg = (which === screenName || which === screenLobby);
  document.body.classList.toggle("bg-main", useMainBg);
}


function alertError(msg) {
  playSound('error');
  alert(msg);
}

// 제시어 사용 현황 UI 갱신
function updatePromptUsageUI() {
  if (!inputStoryText || !myInboxPrompts) return;

  const textRaw = String(inputStoryText.value || "");
  const text = textRaw.replace(/\s+/g, ""); // 공백 제거

  const cards = Array.from(myInboxPrompts.querySelectorAll(".story-keyword-card"));
  for (const card of cards) {
    const textDiv = card.querySelector(".story-keyword-text");
    if (!textDiv) continue;

    const keyRaw = String(textDiv.dataset.prompt || "");
    const key = keyRaw.replace(/\s+/g, ""); // 공백 제거
    if (!key) continue;

    const used = text.includes(key);
    card.classList.toggle("used", used);
  }
}


// 닉네임을 매번 안전하게 확보 (버튼 누르는 순간 읽어서 myName 갱신)
function ensureName() {
  const raw = String(nicknameInput?.value || "");
  const trimmed = raw.trim();
  
  if (!trimmed) {
    alertError("닉네임을 입력해줘!");
    return null;
  }

  const vLen = getVisualLength(trimmed);
  if (vLen > 16) {
    alertError(`닉네임이 너무 길어! (한글 8자, 영문 16자 이내)\n현재 길이: ${vLen}/16`);
    return null;
  }

  myName = trimmed;
  return myName;
}

function renderPlayers(players, hostId) {
  if (!playerList) return;
  playerList.innerHTML = "";

  (players || []).forEach((p) => {
    // player-row 컨테이너
    const playerRow = document.createElement("div");
    playerRow.className = "player-row";

    // player-info: 아바타, 이름, 방장 아이콘을 가로로 배치
    const playerInfo = document.createElement("div");
    playerInfo.className = "player-info";

    const isHost = p.id === hostId;
    const promptDone = p.submitted?.prompts ? " (제시어 완료)" : "";

    // 아바타 표시 (대기실용 - WaitingRoom 이미지)
    const avatarImg = document.createElement("img");
    avatarImg.className = "player-avatar-img";
    const character = getCharacterById(p.avatar);
    if (character) {
      avatarImg.src = character.waitingRoomImage;
      avatarImg.alt = character.name;
    } else {
      avatarImg.src = "";
    }
    playerInfo.appendChild(avatarImg);

    // 이름 표시
    const nameSpan = document.createElement("span");
    nameSpan.className = "player-name";
    let displayName = p.name;
    if (getVisualLength(displayName) > 16) {
      displayName = displayName.substring(0, 10) + "...";
    }
    nameSpan.textContent = `${displayName}${isHost ? " (방장)" : ""}${promptDone}`;
    nameSpan.title = p.name;
    playerInfo.appendChild(nameSpan);

    // 방장 왕관 아이콘 (오른쪽에 배치)
    if (isHost) {
      const hostIcon = document.createElement("img");
      hostIcon.src = "./image/02_로비/방장왕관.png";
      hostIcon.alt = "방장";
      hostIcon.className = "host-icon";
      playerInfo.appendChild(hostIcon);
    }

    playerRow.appendChild(playerInfo);

    // 구분선
    const dividerImg = document.createElement("img");
    dividerImg.src = "./image/02_로비/참가자목록 구분선.png";
    dividerImg.className = "divider-img";
    playerRow.appendChild(dividerImg);

    playerList.appendChild(playerRow);
  });
}

// 키워드 작성 상태 렌더링 (키워드 입력 화면에서 사용)
function renderPromptStatus(players, writingStatus) {
  if (!promptStatusList) return;
  promptStatusList.innerHTML = "";

  (players || []).forEach((p) => {
    const div = document.createElement("div");
    const isDone = p.submitted?.prompts === true;
    const isWritingNow = writingStatus?.[p.id] === true;

    div.className = `player-status-item ${isDone ? "done" : (isWritingNow ? "writing" : "")}`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "status-icon";

    if (isDone) {
      iconSpan.innerHTML = '<img src="/image/03_키워드 적기/작성완료.png" class="status-icon-img" alt="완료">';
    } else if (isWritingNow) {
      iconSpan.innerHTML = '<img src="/image/03_키워드 적기/작성중.png" class="status-icon-img" alt="작성중">';
    } else {
      iconSpan.innerHTML = '<img src="/image/03_키워드 적기/생각중.png" class="status-icon-img" alt="생각중">';
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = p.name;

    div.appendChild(iconSpan);
    div.appendChild(nameSpan);
    promptStatusList.appendChild(div);
  });
}

// 플레이어 작성 상태 렌더링 (스토리 화면에서 사용)
function renderPlayerStatus(players, writingStatus) {
  if (!playerStatusList) return;
  playerStatusList.innerHTML = "";

  (players || []).forEach((p) => {
    const div = document.createElement("div");
    const isDone = p.submitted?.story === true;
    const isWritingNow = writingStatus?.[p.id] === true;

    div.className = `player-status-item ${isDone ? "done" : (isWritingNow ? "writing" : "")}`;

    const iconSpan = document.createElement("span");
    iconSpan.className = "status-icon";

    if (isDone) {
      iconSpan.textContent = "✓";
    } else if (isWritingNow) {
      iconSpan.textContent = "...";
    } else {
      iconSpan.textContent = "○";
    }

    const nameSpan = document.createElement("span");
    nameSpan.textContent = p.name;

    div.appendChild(iconSpan);
    div.appendChild(nameSpan);
    playerStatusList.appendChild(div);
  });
}

// 프로필 배열 정렬: 본인은 왼쪽 첫 번째, 나머지는 지정된 규칙에 따라 배치
function arrangeProfilesByRules(players) {
  const playerArray = players || [];
  const totalPlayers = playerArray.length;
  
  // 본인 찾기
  const meIndex = playerArray.findIndex(p => p.id === socket.id);
  const me = meIndex !== -1 ? playerArray[meIndex] : null;
  
  // 본인을 제외한 나머지 플레이어
  const others = playerArray.filter(p => p.id !== socket.id);
  
  // 배치 규칙: 2열과 3열을 번갈아가며 채우기 (2열 -> 3열 -> 2열 -> 3열 ...)
  // 본인은 2열 1행에 고정
  const hasMe = !!me;
  const col2Players = hasMe ? [me] : [];  // 2열에는 본인부터 시작 (본인이 있을 때만)
  const col3Players = [];    // 3열
  const col4Players = [];    // 4열 (9명부터)
  
  // 나머지 플레이어를 2열과 3열에 번갈아 배치
  others.forEach((player, index) => {
    if (hasMe) {
      // 본인이 있을 때: 기존 parity 유지
      if (index % 2 === 0) {
        // 짝수 인덱스(0, 2, 4...): 3열(오른쪽)에 추가
        col3Players.push(player);
      } else {
        // 홀수 인덱스(1, 3, 5...): 2열(왼쪽)에 추가
        col2Players.push(player);
      }
    } else {
      // 본인이 없을 때: parity 반전 (첫 번째 other가 2열로)
      if (index % 2 === 0) {
        // 짝수 인덱스(0, 2, 4...): 2열(왼쪽)에 추가
        col2Players.push(player);
      } else {
        // 홀수 인덱스(1, 3, 5...): 3열(오른쪽)에 추가
        col3Players.push(player);
      }
    }
  });
  
  // 9명부터는 4열에 배치
  // 8명(본인 1명 + 나머지 7명)까지는 2열, 3열만 사용
  // 9명부터는 넘친 플레이어들을 4열에 배치
  const maxCol2 = Math.ceil(8 / 2); // 2열 최대 4명 (본인 + 3명)
  const maxCol3 = Math.floor(8 / 2); // 3열 최대 4명
  
  if (col2Players.length > maxCol2) {
    col4Players.push(...col2Players.splice(maxCol2));
  }
  if (col3Players.length > maxCol3) {
    col4Players.push(...col3Players.splice(maxCol3));
  }
  
  return {
    me,
    col2: col2Players,      // 2열 플레이어들
    col3: col3Players,      // 3열 플레이어들
    col4: col4Players,      // 4열 플레이어들 (9명부터)
    totalPlayers,
    hasEmojiPanel: totalPlayers >= 9
  };
}

// 플레이어 사이드바 렌더링 (1열: 이모티콘 | 2열: 플레이어 | 3열: 플레이어 | 4열: 플레이어)
function renderPlayerSidebars(players, writingStatus) {
  if (!playersLeft || !playersRight) return;

  playersLeft.innerHTML = "";
  playersRight.innerHTML = "";

  const arranged = arrangeProfilesByRules(players);
  
  // ===== 왼쪽 사이드바 (1열: 이모티콘, 2열: 플레이어) =====
  // 1열: 이모티콘 피커 (고정)
  const emojiPickerDiv = document.createElement("div");
  emojiPickerDiv.className = "sidebar-emoji-picker-always";
  renderSidebarEmojiPicker(emojiPickerDiv);
  playersLeft.appendChild(emojiPickerDiv);
  
  // 2열: 플레이어들 (본인부터)
  const col2Container = document.createElement("div");
  col2Container.className = "player-column";
  arranged.col2.forEach((p) => {
    const playerDiv = createSidebarPlayer(p, writingStatus, true, "story");
    col2Container.appendChild(playerDiv);
  });
  playersLeft.appendChild(col2Container);
  
  // ===== 오른쪽 사이드바 (3열: 플레이어, 4열: 플레이어) =====
  // 3열: 플레이어들
  const col3Container = document.createElement("div");
  col3Container.className = "player-column";
  arranged.col3.forEach((p) => {
    const playerDiv = createSidebarPlayer(p, writingStatus, false, "story");
    col3Container.appendChild(playerDiv);
  });
  playersRight.appendChild(col3Container);
  
  // 4열: 플레이어들 (9명부터)
  if (arranged.col4.length > 0) {
    const col4Container = document.createElement("div");
    col4Container.className = "player-column";
    arranged.col4.forEach((p) => {
      const playerDiv = createSidebarPlayer(p, writingStatus, false, "story");
      col4Container.appendChild(playerDiv);
    });
    playersRight.appendChild(col4Container);
  }
}

// 키워드 화면용 플레이어 사이드바 렌더링
function renderPromptsSidebars(players, writingStatus) {
  console.log("📋 renderPromptsSidebars 호출됨, players:", players?.length);
  if (!promptsPlayersLeft || !promptsPlayersRight) {
    console.log("❌ promptsPlayersLeft 또는 promptsPlayersRight가 없음");
    return;
  }

  promptsPlayersLeft.innerHTML = "";
  promptsPlayersRight.innerHTML = "";

  const arranged = arrangeProfilesByRules(players);
  
  // ===== 왼쪽 사이드바 (1열: 이모티콘, 2열: 플레이어) =====
  // 1열: 이모티콘 피커 (고정)
  const emojiPickerDiv = document.createElement("div");
  emojiPickerDiv.className = "sidebar-emoji-picker-always";
  renderSidebarEmojiPicker(emojiPickerDiv);
  promptsPlayersLeft.appendChild(emojiPickerDiv);
  console.log("✅ 이모티콘 피커가 추가됨, 버튼 수:", emojiPickerDiv.querySelectorAll("button").length);
  
  // 2열: 플레이어들 (본인부터)
  const col2Container = document.createElement("div");
  col2Container.className = "player-column";
  arranged.col2.forEach((p) => {
    const playerDiv = createSidebarPlayer(p, writingStatus, true, "prompts");
    col2Container.appendChild(playerDiv);
  });
  promptsPlayersLeft.appendChild(col2Container);
  
  // ===== 오른쪽 사이드바 (3열: 플레이어, 4열: 플레이어) =====
  // 3열: 플레이어들
  const col3Container = document.createElement("div");
  col3Container.className = "player-column";
  arranged.col3.forEach((p) => {
    const playerDiv = createSidebarPlayer(p, writingStatus, false, "prompts");
    col3Container.appendChild(playerDiv);
  });
  promptsPlayersRight.appendChild(col3Container);
  
  // 4열: 플레이어들 (9명부터)
  if (arranged.col4.length > 0) {
    const col4Container = document.createElement("div");
    col4Container.className = "player-column";
    arranged.col4.forEach((p) => {
      const playerDiv = createSidebarPlayer(p, writingStatus, false, "prompts");
      col4Container.appendChild(playerDiv);
    });
    promptsPlayersRight.appendChild(col4Container);
  }
}

// 키워드 화면 사이드바 상태 업데이트
function updatePromptsSidebarStatus(players, writingStatus) {
  if (!promptsPlayersLeft || !promptsPlayersRight) return;

  (players || []).forEach((p) => {
    const playerDiv = promptsPlayersLeft.querySelector(`[data-player-id="${p.id}"]`) ||
                      promptsPlayersRight.querySelector(`[data-player-id="${p.id}"]`);

    if (!playerDiv) return;

    const isDone = p.submitted?.prompts === true;
    const isWritingNow = writingStatus?.[p.id] === true;

    // 클래스 업데이트
    playerDiv.className = `sidebar-player ${isDone ? "done" : (isWritingNow ? "writing" : "")} ${playerDiv.classList.contains("left-side") ? "left-side" : "right-side"}`;

    // 상태 배지 업데이트
    const statusBadge = playerDiv.querySelector(".status-badge");
    if (statusBadge) {
      if (isDone) {
        statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성완료.png" class="badge-status-icon" alt="완료">';
      } else if (isWritingNow) {
        statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성중.png" class="badge-status-icon" alt="작성중">';
      } else {
        statusBadge.innerHTML = '<img src="/image/04_스토리 적기/생각중.png" class="badge-status-icon" alt="생각중">';
      }
    }
  });
}

// 결과 화면 사이드바 렌더링 (본인 프로필 + 이모티콘 피커만)
function renderResultsSidebar() {
  if (!resultsPlayersLeft) return;
  
  resultsPlayersLeft.innerHTML = "";
  
  // 이모티콘 피커만 표시 (결과 화면용 - 클릭 시 떠오르는 효과)
  const emojiPickerDiv = document.createElement("div");
  emojiPickerDiv.className = "sidebar-emoji-picker-always results-emoji-picker";
  renderResultsEmojiPicker(emojiPickerDiv);
  resultsPlayersLeft.appendChild(emojiPickerDiv);
}

// 결과 화면용 이모티콘 피커 렌더링 (클릭 시 떠오르는 효과)
function renderResultsEmojiPicker(container) {
  if (!container) return;
  container.innerHTML = "";

  for (const emoji of EMOJI_LIST) {
    const btn = document.createElement("button");
    btn.className = "sidebar-emoji-btn";
    btn.dataset.emojiId = emoji.id;

    if (emoji.type === "image") {
      const img = document.createElement("img");
      img.src = emoji.content;
      img.alt = emoji.id;
      btn.appendChild(img);
    } else if (emoji.type === "text") {
      btn.textContent = emoji.content;
      btn.style.fontSize = "11px";
      btn.style.fontWeight = "bold";
      btn.style.color = "#262341";
      btn.style.backgroundColor = "#FCB52D";
      btn.style.border = "1px solid #D99C27";
      btn.style.borderRadius = "6px";
      btn.style.padding = "3px 6px";
      btn.style.gridColumn = "span 2";
    } else {
      btn.textContent = emoji.content;
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // 결과 화면 이모티콘 효과 (아래에서 올라오는 애니메이션)
      sendResultEmojiFromPicker(emoji);
    });

    container.appendChild(btn);
  }
}

// 결과 화면 이모티콘 전송 (피커에서)
function sendResultEmojiFromPicker(emoji) {
  playSound('click');
  // 서버에 전송 (기존 result:emoji 이벤트 활용)
  socket.emit("result:emoji", { emojiId: emoji.id, emojiContent: emoji.content, emojiType: emoji.type });
}

// 결과 화면 이모티콘 표시 (모든 이모티콘 지원)
function displayResultEmojiFromPicker(senderName, emojiContent, senderColor) {
  if (!resultEmojiContainer) return;

  // emojiContent를 안전한 문자열로 정규화
  const safeContent = (emojiContent == null) ? "" : String(emojiContent);
  
  // 빈 문자열이면 무시
  if (!safeContent) return;

  const color = senderColor || playerColorMap[senderName] || "#fbbf24";
  const count = RESULT_EMOJI_CONFIG.count;

  // 이모지 타입 추론
  // 이미지: /image/로 시작하거나 http로 시작
  // 텍스트: 한글이 포함되어 있거나 길이가 2보다 큼 (이모지는 보통 1-2자)
  // 이모지: 그 외
  let emojiType = "emoji";
  if (safeContent.startsWith("/image/") || safeContent.startsWith("http")) {
    emojiType = "image";
  } else if (/[가-힣]/.test(safeContent) || safeContent.length > 2) {
    emojiType = "text";
  }

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      createResultEmojiFloatGeneric(senderName, safeContent, color, emojiType);
    }, i * 80);
  }
}

// 결과 화면 이모티콘 요소 생성 (모든 이모티콘 타입 지원)
function createResultEmojiFloatGeneric(senderName, emojiContent, senderColor, emojiType) {
  // emojiContent 방어적 처리
  const safeContent = (emojiContent == null) ? "" : String(emojiContent);
  
  // 빈 콘텐츠면 무시
  if (!safeContent) return;
  
  const container = document.createElement("div");
  container.className = "result-emoji-float";

  const screenWidth = window.innerWidth;
  const minX = screenWidth * 0.1;
  const maxX = screenWidth * 0.9;
  const randomX = minX + Math.random() * (maxX - minX);
  const startY = Math.random() * RESULT_EMOJI_CONFIG.maxStartY;
  const riseHeight = RESULT_EMOJI_CONFIG.minRiseHeight +
    Math.random() * (RESULT_EMOJI_CONFIG.maxRiseHeight - RESULT_EMOJI_CONFIG.minRiseHeight);
  const duration = RESULT_EMOJI_CONFIG.minDuration +
    Math.random() * (RESULT_EMOJI_CONFIG.maxDuration - RESULT_EMOJI_CONFIG.minDuration);

  container.style.setProperty("--rise-height", `-${riseHeight}px`);
  container.style.setProperty("--rise-duration", `${duration}s`);
  container.style.left = `${randomX}px`;
  container.style.bottom = `${startY}px`;

  const emojiDiv = document.createElement("div");
  emojiDiv.className = "emoji-content";
  
  if (emojiType === "image" && safeContent) {
    const img = document.createElement("img");
    img.src = safeContent;
    img.alt = "emoji";
    img.style.width = "40px";
    img.style.height = "40px";
    // 이미지 로드 실패 시 fallback
    img.onerror = () => {
      img.style.display = "none";
      emojiDiv.textContent = "😊";
      emojiDiv.style.fontSize = "2.5rem";
    };
    emojiDiv.appendChild(img);
  } else if (emojiType === "text") {
    // 글씨 이모티콘: 노란 배경 스타일 (플레이 중과 동일)
    emojiDiv.style.fontSize = "14px";
    emojiDiv.style.backgroundColor = "#FCB52D";
    emojiDiv.style.padding = "4px 8px";
    emojiDiv.style.borderRadius = "8px";
    emojiDiv.style.border = "1px solid #D99C27";
    emojiDiv.style.color = "#262341";
    emojiDiv.style.fontWeight = "bold";
    emojiDiv.style.whiteSpace = "nowrap";
    emojiDiv.textContent = safeContent;
  } else {
    // 일반 이모지
    emojiDiv.style.fontSize = "2.5rem";
    emojiDiv.textContent = safeContent || "😊";
  }

  const nameDiv = document.createElement("div");
  nameDiv.className = "emoji-name";
  nameDiv.textContent = senderName || "";
  nameDiv.style.color = senderColor || "#fbbf24";
  nameDiv.style.backgroundColor = "transparent";

  container.appendChild(emojiDiv);
  container.appendChild(nameDiv);
  resultEmojiContainer.appendChild(container);

  setTimeout(() => {
    container.remove();
  }, duration * 1000 + 100);
}

// 결과 화면 본인 프로필 요소 생성 (상태 배지 없음)
function createResultsSidebarPlayer(player) {
  const div = document.createElement("div");
  div.className = "sidebar-player left-side";
  div.dataset.playerId = player.id;

  const profileContainer = document.createElement("div");
  profileContainer.className = "profile-container";

  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "avatar-wrapper";

  const avatarImg = document.createElement("img");
  avatarImg.className = "avatar-img";
  const characterData = getCharacterById(player.avatar);
  if (characterData) {
    avatarImg.src = characterData.inGameImage;
    avatarImg.alt = characterData.name;
  } else {
    avatarImg.src = DEFAULT_AVATAR;
    avatarImg.alt = "avatar";
  }

  avatarWrapper.appendChild(avatarImg);

  const nicknameTag = document.createElement("div");
  nicknameTag.className = "nickname-tag";
  nicknameTag.textContent = player.name;

  profileContainer.appendChild(avatarWrapper);
  profileContainer.appendChild(nicknameTag);
  div.appendChild(profileContainer);

  return div;
}

// 사이드바 플레이어 요소 생성
// screenType: "story" (스토리 화면) 또는 "prompts" (키워드 화면)
function createSidebarPlayer(player, writingStatus, isLeftSide, screenType = "story") {
  const submittedField = screenType === "prompts" ? "prompts" : "story";
  const isDone = player.submitted?.[submittedField] === true;
  const isWritingNow = writingStatus?.[player.id] === true;
  const isMe = player.id === socket.id;

  const div = document.createElement("div");
  div.className = `sidebar-player ${isDone ? "done" : (isWritingNow ? "writing" : "")} ${isLeftSide ? "left-side" : "right-side"}`;
  div.dataset.playerId = player.id;

  // 프로필 컨테이너
  const profileContainer = document.createElement("div");
  profileContainer.className = "profile-container";

  // 아바타 래퍼
  const avatarWrapper = document.createElement("div");
  avatarWrapper.className = "avatar-wrapper";

  // 아바타 이미지
  const avatarImg = document.createElement("img");
  avatarImg.className = "avatar-img";
  const characterData = getCharacterById(player.avatar);
  if (characterData) {
    avatarImg.src = characterData.inGameImage;
    avatarImg.alt = characterData.name;
  } else {
    avatarImg.src = DEFAULT_AVATAR;
    avatarImg.alt = "프로필";
  }

  // 상태 배지
  const statusBadge = document.createElement("div");
  statusBadge.className = "status-badge";
  
  // 상태에 따라 배지 내용 설정
  if (isDone) {
    statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성완료.png" class="badge-status-icon" alt="완료">';
  } else if (isWritingNow) {
    statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성중.png" class="badge-status-icon" alt="작성중">';
  } else {
    statusBadge.innerHTML = '<img src="/image/04_스토리 적기/생각중.png" class="badge-status-icon" alt="생각중">';
  }

  avatarWrapper.appendChild(avatarImg);
  avatarWrapper.appendChild(statusBadge);

  // 닉네임 태그
  const nicknameTag = document.createElement("div");
  nicknameTag.className = "nickname-tag";
  nicknameTag.textContent = player.name;

  profileContainer.appendChild(avatarWrapper);
  profileContainer.appendChild(nicknameTag);

  div.appendChild(profileContainer);

  return div;
}

// 사이드바 플레이어 상태만 업데이트 (다시 렌더링하지 않고)
function updateSidebarPlayerStatus(players, writingStatus) {
  if (!playersLeft || !playersRight) return;

  (players || []).forEach((p) => {
    const isDone = p.submitted?.story === true;
    const isWritingNow = writingStatus?.[p.id] === true;

    // 왼쪽, 오른쪽 모두에서 찾기
    const playerDiv = playersLeft.querySelector(`[data-player-id="${p.id}"]`) ||
                      playersRight.querySelector(`[data-player-id="${p.id}"]`);

    if (playerDiv) {
      playerDiv.className = `sidebar-player ${isDone ? "done" : (isWritingNow ? "writing" : "")} ${playerDiv.classList.contains("left-side") ? "left-side" : "right-side"}`;

      // 상태 배지 업데이트 (게임 화면에서만)
      const statusBadge = playerDiv.querySelector(".status-badge");
      if (statusBadge) {
        if (isDone) {
          statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성완료.png" class="badge-status-icon" alt="완료">';
        } else if (isWritingNow) {
          statusBadge.innerHTML = '<img src="/image/04_스토리 적기/작성중.png" class="badge-status-icon" alt="작성중">';
        } else {
          statusBadge.innerHTML = '<img src="/image/04_스토리 적기/생각중.png" class="badge-status-icon" alt="생각중">';
        }
      }
    }
  });
}

// ---- 아바타 관련 ----
// 아바타 목록 - 12개의 동물 캐릭터
// type: "image" = 커스텀 이미지 (경로)
// ---- 새로운 캐릭터 시스템 ----
// 기본 아바타 (캐릭터 데이터 없을 때 사용)
const DEFAULT_AVATAR = "./image/char/Char_InGame/Char_Circle_Alien.png";

const CHARACTER_LIST = [
  { id: "alien", name: "Alien", chooseImage: "./image/char/Char_all/ChooseChar_Alien.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Alien.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Alien.png" },
  { id: "bear", name: "Racoon", chooseImage: "./image/char/Char_all/ChooseChar_Racoon.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Racoon.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Racoon.png" },
  { id: "bear-1", name: "Tiger", chooseImage: "./image/char/Char_all/ChooseChar_Tiger.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Tiger.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Tiger.png" },
  { id: "crocodile", name: "Crocodile", chooseImage: "./image/char/Char_all/ChooseChar_Crocodile.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Crocodile.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Crocodile.png" },
  { id: "eagle", name: "Eagle", chooseImage: "./image/char/Char_all/ChooseChar_Eagle.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Eagle.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Eagle.png" },
  { id: "giraffe", name: "Giraffe", chooseImage: "./image/char/Char_all/ChooseChar_Giraffe.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Giraffe.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Giraffe.png" },
  { id: "goldfish", name: "Goldfish", chooseImage: "./image/char/Char_all/ChooseChar_Goldfish.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Goldfish.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Goldfish.png" },
  { id: "hedgehog", name: "Hedgehog", chooseImage: "./image/char/Char_all/ChooseChar_Hedgehog.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Hedgehog.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Hedgehog.png" },
  { id: "hippo", name: "Hippo", chooseImage: "./image/char/Char_all/ChooseChar_Hippo.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Hippo.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Hippo.png" },
  { id: "koala", name: "Koala", chooseImage: "./image/char/Char_all/ChooseChar_Koala.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Koala.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Koala.png" },
  { id: "monkey", name: "Monkey", chooseImage: "./image/char/Char_all/ChooseChar_Monkey.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Monkey.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Monkey.png" },
  { id: "parrot", name: "Parrot", chooseImage: "./image/char/Char_all/ChooseChar_Parrot.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Parrot.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Parrot.png" },
  { id: "penguin", name: "Penguin", chooseImage: "./image/char/Char_all/ChooseChar_Penguin.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Penguin.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Penguin.png" },
  { id: "pig", name: "Pig", chooseImage: "./image/char/Char_all/ChooseChar_Pig.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Pig.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Pig.png" },
  { id: "puppy", name: "Puppy", chooseImage: "./image/char/Char_all/ChooseChar_Puppy.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Puppy.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Puppy.png" },
  { id: "rabbit", name: "Rabbit", chooseImage: "./image/char/Char_all/ChooseChar_Rabbit.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Rabbit.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Rabbit.png" },
  { id: "triceratops", name: "Triceratops", chooseImage: "./image/char/Char_all/ChooseChar_Triceratops.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Triceratops.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Triceratops.png" },
  { id: "zebra", name: "Zebra", chooseImage: "./image/char/Char_all/ChooseChar_Zebra.png", waitingRoomImage: "./image/char/Char_WaitingRoom_TTS/Char_Circle_Zebra.png", inGameImage: "./image/char/Char_InGame/Char_Circle_Zebra.png" },
];

// 캐릭터 ID로 캐릭터 객체 찾기
function getCharacterById(characterId) {
  return CHARACTER_LIST.find((c) => c.id === characterId) || null;
}

// 랜덤 캐릭터 선택 버튼 렌더링
// 랜덤 캐릭터 선택
function selectRandomCharacter() {
  const randomIndex = Math.floor(Math.random() * CHARACTER_LIST.length);
  const randomCharacter = CHARACTER_LIST[randomIndex];
  selectCharacter(randomCharacter.id);
}

// 캐릭터 선택
function selectCharacter(characterId) {
  myAvatar = characterId;

  // 미리보기 업데이트
  if (avatarPreview) {
    const character = getCharacterById(characterId);
    if (character) {
      avatarPreview.innerHTML = `<img src="${character.chooseImage}" alt="${character.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  }
}

// 아바타 선택 UI 초기화 (사용하지 않음 - 랜덤만 사용)
function renderAvatarList() {
  // 아바타 선택 UI 제거 - 랜덤 버튼으로만 진행
  if (avatarList) {
    avatarList.style.display = "none";
  }
  setupRandomAvatarButton();
}

// 랜덤 아바타 버튼 설정
function setupRandomAvatarButton() {
  const btnRandomAvatar = document.getElementById("btn-random-avatar");
  
  if (btnRandomAvatar) {
    btnRandomAvatar.addEventListener("click", () => {
      playSound('click');
      selectRandomCharacter();
    });
  }
}

// ---- 이모티콘 관련 ----
// 이모티콘 목록 (나중에 커스텀 이미지로 교체 가능)
// type: "emoji" = 기본 이모지, "text" = 글씨 이모티콘
const EMOJI_LIST = [
  { id: "emoj1", type: "emoji", content: "🤣" },
  { id: "emoj2", type: "emoji", content: "😡" },
  { id: "emoj3", type: "emoji", content: "☠️" },
  { id: "emoj4", type: "emoji", content: "🤔" },
  { id: "emoj5", type: "emoji", content: "🙌" },

  { id: "emoj6", type: "emoji", content: "🥱" },
  { id: "emoj7", type: "emoji", content: "😴" },
  { id: "emoj8", type: "emoji", content: "😘" },
  { id: "emoj9", type: "emoji", content: "😥" },
  { id: "emoj10", type: "emoji", content: "😭" },

  { id: "emoj11", type: "emoji", content: "👍" },
  { id: "emoj12", type: "emoji", content: "👎" },

  // 글씨 이모티콘 추가
  { id: "text1", type: "text", content: "엥?" },
  { id: "text2", type: "text", content: "메롱" },
  { id: "text3", type: "text", content: "엄청나요!" },
  { id: "text4", type: "text", content: "빨리 해주세요." },
  { id: "text5", type: "text", content: "이거 진짜에요?" },
  { id: "text6", type: "text", content: "심금을 울리네요." },
  { id: "text7", type: "text", content: "이해할 수 없네요." },
];

// 이모티콘 목록 렌더링 (전역 이모지 리스트용 - 기존 호환)
function renderEmojiList() {
  if (!emojiList) return;
  emojiList.innerHTML = "";

  for (const emoji of EMOJI_LIST) {
    const btn = document.createElement("button");
    btn.className = "emoji-btn";
    btn.dataset.emojiId = emoji.id;

    if (emoji.type === "image") {
      const img = document.createElement("img");
      img.src = emoji.content;
      img.alt = emoji.id;
      btn.appendChild(img);
    } else if (emoji.type === "text") {
      // 글씨 이모티콘 스타일링
      btn.textContent = emoji.content;
      btn.style.fontSize = "12px";
      btn.style.fontWeight = "bold";
      btn.style.color = "#262341";
      btn.style.backgroundColor = "#FCB52D";
      btn.style.border = "1px solid #D99C27";
      btn.style.borderRadius = "8px";
      btn.style.padding = "4px 8px";
    } else {
      btn.textContent = emoji.content;
    }

    btn.addEventListener("click", () => {
      sendEmoji(emoji.id);
    });

    emojiList.appendChild(btn);
  }
}

// 사이드바 이모티콘 피커 렌더링 (본인 아바타 아래용)
function renderSidebarEmojiPicker(container) {
  console.log("🎨 renderSidebarEmojiPicker 호출됨, container:", container);
  if (!container) return;
  container.innerHTML = "";

  for (const emoji of EMOJI_LIST) {
    const btn = document.createElement("button");
    btn.className = "sidebar-emoji-btn";
    btn.dataset.emojiId = emoji.id;

    if (emoji.type === "image") {
      const img = document.createElement("img");
      img.src = emoji.content;
      img.alt = emoji.id;
      btn.appendChild(img);
    } else if (emoji.type === "text") {
      // 글씨 이모티콘: 칸 2개 할당
      btn.textContent = emoji.content;
      btn.style.fontSize = "11px";
      btn.style.fontWeight = "bold";
      btn.style.color = "#262341";
      btn.style.backgroundColor = "#FCB52D";
      btn.style.border = "1px solid #D99C27";
      btn.style.borderRadius = "6px";
      btn.style.padding = "3px 6px";
      btn.style.gridColumn = "span 2"; // 칸 2개 할당
    } else {
      btn.textContent = emoji.content;
    }

    btn.addEventListener("click", (e) => {
      console.log("🖱️ 이모티콘 버튼 클릭됨:", emoji.id);
      e.stopPropagation(); // 이벤트 버블링 방지
      sendEmoji(emoji.id);
    });

    container.appendChild(btn);
  }
}

// 페이지 로드 시 이모티콘 목록 초기화
document.addEventListener("DOMContentLoaded", () => {
  renderEmojiList();
});

// 이모티콘 선택창 토글
function toggleEmojiPicker(show) {
  if (!emojiPicker) return;
  if (show === undefined) {
    emojiPicker.classList.toggle("hidden");
  } else {
    emojiPicker.classList.toggle("hidden", !show);
  }
}

// 이모티콘 전송
function sendEmoji(emojiId) {
  console.log("🎭 sendEmoji 호출됨:", emojiId, "socket.connected:", socket.connected);
  if (!socket.connected) {
    console.error("❌ 소켓이 연결되어 있지 않습니다!");
    return;
  }
  playSound('click');
  socket.emit("emoji:send", { emojiId });
}

// 받은 이모티콘 표시 (플레이어 아바타 주위에 랜덤 위치로 표시)
function displayReceivedEmoji(senderId, senderName, emojiId) {
  const emoji = EMOJI_LIST.find(e => e.id === emojiId);
  if (!emoji) {
    console.log("❌ 이모티콘을 찾을 수 없음:", emojiId);
    return;
  }

  // 현재 보이는 화면 확인
  const isPromptsScreen = screenPrompts && !screenPrompts.classList.contains("hidden");
  const isStoryScreen = screenStory && !screenStory.classList.contains("hidden");
  
  // 현재 화면에 맞는 사이드바에서만 플레이어 찾기
  let playerDiv = null;
  if (isPromptsScreen) {
    playerDiv = promptsPlayersLeft?.querySelector(`[data-player-id="${senderId}"]`) ||
                promptsPlayersRight?.querySelector(`[data-player-id="${senderId}"]`);
  } else if (isStoryScreen) {
    playerDiv = playersLeft?.querySelector(`[data-player-id="${senderId}"]`) ||
                playersRight?.querySelector(`[data-player-id="${senderId}"]`);
  } else {
    // 둘 다 아니면 모든 사이드바 검색 (fallback)
    playerDiv = playersLeft?.querySelector(`[data-player-id="${senderId}"]`) ||
                playersRight?.querySelector(`[data-player-id="${senderId}"]`) ||
                promptsPlayersLeft?.querySelector(`[data-player-id="${senderId}"]`) ||
                promptsPlayersRight?.querySelector(`[data-player-id="${senderId}"]`);
  }

  console.log("🔍 플레이어 찾기:", senderId, "화면:", isPromptsScreen ? "prompts" : isStoryScreen ? "story" : "other", "결과:", playerDiv ? "찾음" : "못찾음");
  
  if (playerDiv) {
    // 플레이어가 어느 사이드바에 있는지 확인
    const isLeftSide = playersLeft?.contains(playerDiv) || promptsPlayersLeft?.contains(playerDiv);
    let parentSidebar;
    if (playersLeft?.contains(playerDiv)) parentSidebar = playersLeft;
    else if (playersRight?.contains(playerDiv)) parentSidebar = playersRight;
    else if (promptsPlayersLeft?.contains(playerDiv)) parentSidebar = promptsPlayersLeft;
    else parentSidebar = promptsPlayersRight;

    // 현재 화면 컨테이너 찾기 (스케일이 적용되는 #app 내부)
    let currentScreen = null;
    if (isPromptsScreen && screenPrompts) currentScreen = screenPrompts;
    else if (isStoryScreen && screenStory) currentScreen = screenStory;
    
    // 화면을 찾지 못한 경우 fallback
    if (!currentScreen) {
      currentScreen = document.querySelector('.screen:not(.hidden)') || document.body;
    }

    // 플레이어 위치 가져오기
    const playerRect = playerDiv.getBoundingClientRect();
    const screenRect = currentScreen.getBoundingClientRect();

    // 이모티콘 엘리먼트 생성
    const emojiEl = document.createElement("div");
    emojiEl.className = "player-emoji-floating";
    emojiEl.style.position = "absolute"; // fixed → absolute로 변경 (화면 내 상대 위치)
    emojiEl.style.zIndex = "9999"; // z-index를 매우 높게 설정
    emojiEl.style.pointerEvents = "none";

    if (emoji.type === "image") {
      emojiEl.style.fontSize = "32px";
      emojiEl.innerHTML = `<img src="${emoji.content}" alt="${emojiId}" style="width: 40px; height: 40px;">`;
    } else if (emoji.type === "text") {
      // 글씨 이모티콘 스타일
      emojiEl.style.fontSize = "14px";
      emojiEl.style.fontWeight = "bold";
      emojiEl.style.color = "#262341";
      emojiEl.style.backgroundColor = "#FCB52D";
      emojiEl.style.padding = "4px 8px";
      emojiEl.style.borderRadius = "8px";
      emojiEl.style.border = "1px solid #D99C27";
      emojiEl.style.whiteSpace = "nowrap";
      emojiEl.style.display = "inline-flex";
      emojiEl.style.alignItems = "center";
      emojiEl.textContent = emoji.content;
    } else {
      emojiEl.style.fontSize = "32px";
      emojiEl.textContent = emoji.content;
    }

    // 랜덤 위치 계산 (플레이어 프로필 주위) - 범위 확대
    const randomOffsetX = (Math.random() - 0.5) * 150; // -75px ~ +75px
    const randomOffsetY = (Math.random() - 0.5) * 100; // -50px ~ +50px
    const randomRotation = (Math.random() - 0.5) * 60; // -30deg ~ +30deg

    // 화면 컨테이너 기준 위치 계산
    const relativeTop = playerRect.top - screenRect.top + playerRect.height / 2 + randomOffsetY;
    let relativeLeft;

    if (isLeftSide) {
      // 왼쪽 사이드바: 프로필 오른쪽에 표시 (바깥쪽으로)
      relativeLeft = playerRect.left - screenRect.left + playerRect.width + 20 + randomOffsetX;
    } else {
      // 오른쪽 사이드바: 3열/4열 구분
      const sidebarRect = parentSidebar.getBoundingClientRect();
      const sidebarCenterX = sidebarRect.left + sidebarRect.width / 2;
      const playerCenterX = playerRect.left + playerRect.width / 2;
      
      if (playerCenterX < sidebarCenterX) {
        // 3열(안쪽): 프로필 왼쪽에 표시
        relativeLeft = playerRect.left - screenRect.left - 60 + randomOffsetX;
      } else {
        // 4열(바깥쪽): 프로필 오른쪽에 표시 (프로필을 가리지 않을 정도로)
        relativeLeft = playerRect.left - screenRect.left + playerRect.width + 20 + randomOffsetX;
      }
    }

    emojiEl.style.top = relativeTop + "px";
    emojiEl.style.left = relativeLeft + "px";
    emojiEl.style.transform = `rotate(${randomRotation}deg)`;

    // 현재 화면에 추가하여 스케일 적용을 받도록 함
    if (getComputedStyle(currentScreen).position === "static") {
      currentScreen.style.position = "relative";
    }
    currentScreen.appendChild(emojiEl);
    console.log("📍 이모티콘 추가됨:", {
      currentScreen: currentScreen.id || currentScreen.className,
      top: relativeTop,
      left: relativeLeft,
      emojiEl: emojiEl
    });

    // 애니메이션: 위로 올라가며 페이드아웃
    const animation = emojiEl.animate([
      {
        transform: `translateY(0) scale(0.5) rotate(${randomRotation}deg)`,
        opacity: 0
      },
      {
        transform: `translateY(0) scale(1.2) rotate(${randomRotation}deg)`,
        opacity: 1,
        offset: 0.1
      },
      {
        transform: `translateY(-100px) scale(1) rotate(${randomRotation}deg)`,
        opacity: 0
      }
    ], {
      duration: 2500,
      easing: "ease-out"
    });

    animation.onfinish = () => {
      emojiEl.remove();
    };

  } else {
    // 사이드바에 플레이어가 없으면 중앙에 표시
    if (!emojiDisplay) return;

    const container = document.createElement("div");
    container.className = "emoji-floating";

    const iconDiv = document.createElement("div");
    iconDiv.className = "emoji-icon";

    if (emoji.type === "image") {
      const img = document.createElement("img");
      img.src = emoji.content;
      img.alt = emojiId;
      iconDiv.appendChild(img);
    } else {
      iconDiv.textContent = emoji.content;
      if (emoji.type === "text") {
        iconDiv.style.whiteSpace = "nowrap";
      }
    }

    const senderDiv = document.createElement("div");
    senderDiv.className = "emoji-sender";
    senderDiv.textContent = senderName;

    container.appendChild(iconDiv);
    container.appendChild(senderDiv);
    emojiDisplay.appendChild(container);

    // 3초 후 제거
    setTimeout(() => {
      container.remove();
    }, 3000);
  }
}

// ---- 결과 화면 이모티콘 애니메이션 ----
// 설정: 이모티콘 개수 (여기서 수정 가능)
const RESULT_EMOJI_CONFIG = {
  count: 8,              // 한 번에 생성되는 이모티콘 개수
  minRiseHeight: 300,    // 최소 올라가는 높이 (px)
  maxRiseHeight: 500,    // 최대 올라가는 높이 (px)
  minDuration: 2.5,      // 최소 애니메이션 시간 (초)
  maxDuration: 4,        // 최대 애니메이션 시간 (초)
  maxStartY: 100,        // 최대 시작 Y 위치 (화면 하단으로부터, px) - 너무 위에서 시작하지 않도록
};

// 결과 화면 이모티콘 전송
function sendResultEmoji(emojiType) {
  playSound('click');
  socket.emit("result:emoji", { emojiType });
}

// 결과 화면 이모티콘 표시 (여러 개가 아래에서 올라오는 애니메이션)
function displayResultEmoji(senderName, emojiType) {
  if (!resultEmojiContainer) return;

  // 이모티콘 콘텐츠 결정
  const emojiContent = emojiType === "thumbsup" ? "👍" : "👏";
  const senderColor = playerColorMap[senderName] || "#fbbf24"; // 이름에 맞는 색상 가져오기

  const count = RESULT_EMOJI_CONFIG.count;

  for (let i = 0; i < count; i++) {
    // 약간의 시간차를 두고 생성
    setTimeout(() => {
      createResultEmojiFloat(senderName, emojiContent, senderColor);
    }, i * 80); // 80ms 간격
  }
}


// 개별 이모티콘 요소 생성
function createResultEmojiFloat(senderName, emojiContent, senderColor) {
  const container = document.createElement("div");
  container.className = "result-emoji-float";

  // 랜덤 X 위치 (화면 너비의 10% ~ 90%)
  const screenWidth = window.innerWidth;
  const minX = screenWidth * 0.1;
  const maxX = screenWidth * 0.9;
  const randomX = minX + Math.random() * (maxX - minX);

  // 랜덤 시작 Y 위치 (0 ~ maxStartY, 화면 하단 기준)
  const startY = Math.random() * RESULT_EMOJI_CONFIG.maxStartY;

  // 랜덤 올라가는 높이
  const riseHeight = RESULT_EMOJI_CONFIG.minRiseHeight +
    Math.random() * (RESULT_EMOJI_CONFIG.maxRiseHeight - RESULT_EMOJI_CONFIG.minRiseHeight);

  // 랜덤 애니메이션 시간
  const duration = RESULT_EMOJI_CONFIG.minDuration +
    Math.random() * (RESULT_EMOJI_CONFIG.maxDuration - RESULT_EMOJI_CONFIG.minDuration);

  // CSS 변수로 전달
  container.style.setProperty("--rise-height", `-${riseHeight}px`);
  container.style.setProperty("--rise-duration", `${duration}s`);
  container.style.left = `${randomX}px`;
  container.style.bottom = `${startY}px`;

  // 이모티콘 콘텐츠
  const emojiDiv = document.createElement("div");
  emojiDiv.className = "emoji-content";
  emojiDiv.style.fontSize = "2.5rem";
  emojiDiv.textContent = emojiContent;

  // 보낸 사람 이름
  const nameDiv = document.createElement("div");
  nameDiv.className = "emoji-name";
  nameDiv.textContent = senderName;
  nameDiv.style.color = senderColor;
  nameDiv.style.backgroundColor = "transparent";

  container.appendChild(emojiDiv);
  container.appendChild(nameDiv);
  resultEmojiContainer.appendChild(container);

  // 애니메이션 종료 후 제거
  setTimeout(() => {
    container.remove();
  }, duration * 1000 + 100);
}

function renderPromptChips(container, items) {
  if (!container) return;
  container.innerHTML = "";

  // 제시어가 없으면 부모 div 전체 숨기기 (첫 번째 라운드)
  const hasPrompts = items && items.length > 0 && items.some(item => item && item.trim());
  const parentDiv = container.parentElement;

  if (!hasPrompts) {
    if (parentDiv) parentDiv.style.display = "none";
    return;
  }

  // 제시어가 있으면 표시
  if (parentDiv) parentDiv.style.display = "";

  // 카드 이미지 경로
  const cardImages = [
    "/image/03_키워드 적기/카드1.png",
    "/image/03_키워드 적기/카드2.png",
    "/image/03_키워드 적기/카드3.png"
  ];

  for (let i = 0; i < items.length && i < 3; i++) {
    const t = items[i] || "";
    if (!t.trim()) continue; // 빈 제시어는 건너뛰기

    const card = document.createElement("div");
    card.className = "story-keyword-card";

    const img = document.createElement("img");
    img.src = cardImages[i];
    img.alt = `카드${i + 1}`;

    const textDiv = document.createElement("div");
    textDiv.className = "story-keyword-text";
    textDiv.textContent = t;
    textDiv.dataset.prompt = normalizePromptText(t);

    card.appendChild(img);
    card.appendChild(textDiv);

    // 클릭 시 textarea에 자동 입력
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      if (inputStoryText && !inputStoryText.disabled) {
        const currentText = inputStoryText.value;

        if (currentText.trim()) {
          inputStoryText.value = currentText + " " + t;
        } else {
          inputStoryText.value = t;
        }

        inputStoryText.focus();
        inputStoryText.setSelectionRange(inputStoryText.value.length, inputStoryText.value.length);
        inputStoryText.dispatchEvent(new Event('input'));
      }
    });

    container.appendChild(card);
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

// ---- TTS 함수 (Web Speech API 사용) ----
// 한국어 음성 캐싱
let koreanVoice = null;

// 음성 목록 로드 (페이지 로드 시)
function loadVoices() {
  if (!window.speechSynthesis) return;

  const voices = window.speechSynthesis.getVoices();
  // 한국어 음성 찾기 (우선순위: ko-KR > ko)
  koreanVoice = voices.find(v => v.lang === 'ko-KR')
             || voices.find(v => v.lang.startsWith('ko'))
             || null;

  if (koreanVoice) {
    console.log("TTS 한국어 음성 로드됨:", koreanVoice.name);
  }
}

// 음성 목록이 비동기로 로드되는 경우 대비
if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// TTS 취소 함수
let ttsQueue = [];
let ttsResumeInterval = null;
let ttsWatchdogInterval = null;
let ttsCurrentCallback = null;

function cancelTTS() {
  ttsQueue = [];
  ttsCurrentCallback = null;
  if (ttsResumeInterval) {
    clearInterval(ttsResumeInterval);
    ttsResumeInterval = null;
  }
  if (ttsWatchdogInterval) {
    clearInterval(ttsWatchdogInterval);
    ttsWatchdogInterval = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function stopTTS() {
  cancelTTS();
}

// 큐에서 다음 문장 읽기
function processNextInQueue() {
  if (ttsQueue.length === 0) {
    // 모든 문장 완료 → 콜백 호출
    const cb = ttsCurrentCallback;
    ttsCurrentCallback = null;
    if (cb) cb();
    return;
  }

  const sentence = ttsQueue.shift();
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.lang = 'ko-KR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  let finished = false; // 중복 호출 방지

  function onFinish() {
    if (finished) return;
    finished = true;
    if (ttsResumeInterval) {
      clearInterval(ttsResumeInterval);
      ttsResumeInterval = null;
    }
    if (ttsWatchdogInterval) {
      clearInterval(ttsWatchdogInterval);
      ttsWatchdogInterval = null;
    }
    setTimeout(() => processNextInQueue(), 100);
  }

  // Chrome 버그 대응: 긴 발화 시 자동 중단 방지
  if (ttsResumeInterval) clearInterval(ttsResumeInterval);
  ttsResumeInterval = setInterval(() => {
    if (!window.speechSynthesis) return;
    // paused 상태면 resume만 호출 (pause+resume 패턴은 onend 누락 유발)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, 3000);

  // 안전장치: onend가 발생하지 않는 Chrome 버그 대응
  if (ttsWatchdogInterval) clearInterval(ttsWatchdogInterval);
  ttsWatchdogInterval = setInterval(() => {
    if (finished) return;
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      console.warn("TTS watchdog: onend 미발생 감지, 강제 진행");
      onFinish();
    }
  }, 500);

  utterance.onend = () => {
    onFinish();
  };

  utterance.onerror = (e) => {
    if (e.error !== "interrupted") {
      console.error("TTS 오류:", e.error);
    }
    onFinish();
  };

  window.speechSynthesis.speak(utterance);
}

// 텍스트를 문장 단위로 분리
function splitTextForTTS(text) {
  const rawSentences = text.split(/(?<=[.!?。！？\n])\s*/);
  const sentences = [];
  let buffer = "";

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    buffer += (buffer ? " " : "") + trimmed;
    if (buffer.length >= 30 || /[.!?。！？]$/.test(buffer)) {
      sentences.push(buffer);
      buffer = "";
    }
  }
  if (buffer.trim()) sentences.push(buffer.trim());
  if (sentences.length === 0 && text.trim()) sentences.push(text.trim());
  return sentences;
}

// 텍스트 읽기 함수 (콜백 지원: TTS 완료 후 호출)
function speakText(text, onEndCallback) {
  if (!ttsEnabled || !text) {
    if (onEndCallback) onEndCallback();
    return;
  }
  if (!window.speechSynthesis) {
    if (onEndCallback) onEndCallback();
    return;
  }

  // 이전 TTS 중지
  cancelTTS();

  // 텍스트를 문장 단위로 분리 (Chrome 긴 발화 끊김 방지)
  ttsQueue = splitTextForTTS(text);
  ttsCurrentCallback = onEndCallback || null;
  console.log("TTS 시작, 문장 수:", ttsQueue.length, "텍스트:", text.substring(0, 40));
  processNextInQueue();
}

// 폭죽 효과 표시
function showFireworks(element) {
  const fireworksColors = ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#00f", "#ffa500"];

  // 여러 개의 파티클 생성
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${fireworksColors[Math.floor(Math.random() * fireworksColors.length)]};
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
    `;

    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    particle.style.left = startX + "px";
    particle.style.top = startY + "px";

    document.body.appendChild(particle);

    // 랜덤 방향으로 애니메이션
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 50 + Math.random() * 50;
    const endX = startX + Math.cos(angle) * distance;
    const endY = startY + Math.sin(angle) * distance;

    particle.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0)`, opacity: 0 }
      ],
      {
        duration: 800,
        easing: "cubic-bezier(0, 0.5, 0.5, 1)"
      }
    ).onfinish = () => {
      particle.remove();
    };
  }

  // 이모지 폭죽 효과
  const emojiFireworks = ["🎉", "✨", "🌟", "💫", "⭐"];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const emoji = document.createElement("div");
      emoji.textContent = emojiFireworks[Math.floor(Math.random() * emojiFireworks.length)];
      emoji.style.cssText = `
        position: absolute;
        font-size: 24px;
        pointer-events: none;
        z-index: 1001;
      `;

      const rect = element.getBoundingClientRect();
      emoji.style.left = rect.left + Math.random() * rect.width + "px";
      emoji.style.top = rect.top + "px";

      document.body.appendChild(emoji);

      emoji.animate(
        [
          { transform: "translateY(0) scale(1)", opacity: 1 },
          { transform: "translateY(-100px) scale(1.5)", opacity: 0 }
        ],
        {
          duration: 1000,
          easing: "ease-out"
        }
      ).onfinish = () => {
        emoji.remove();
      };
    }, i * 100);
  }
}

// 💩 폭죽 효과 표시 (화남 과반수)
function showPoopFireworks(element) {
  const poopColors = ["#8B4513", "#A0522D", "#6B3410", "#D2691E", "#CD853F"];

  // 똥 색깔 파티클 생성
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${poopColors[Math.floor(Math.random() * poopColors.length)]};
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
    `;

    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    particle.style.left = startX + "px";
    particle.style.top = startY + "px";

    document.body.appendChild(particle);

    // 랜덤 방향으로 애니메이션
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 50 + Math.random() * 50;
    const endX = startX + Math.cos(angle) * distance;
    const endY = startY + Math.sin(angle) * distance;

    particle.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0)`, opacity: 0 }
      ],
      {
        duration: 800,
        easing: "cubic-bezier(0, 0.5, 0.5, 1)"
      }
    ).onfinish = () => {
      particle.remove();
    };
  }

  // 똥 이모지 폭죽 효과
  const poopEmojis = ["💩", "💩", "💩", "😡", "🤬"];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const emoji = document.createElement("div");
      emoji.textContent = poopEmojis[Math.floor(Math.random() * poopEmojis.length)];
      emoji.style.cssText = `
        position: absolute;
        font-size: 24px;
        pointer-events: none;
        z-index: 1001;
      `;

      const rect = element.getBoundingClientRect();
      emoji.style.left = rect.left + Math.random() * rect.width + "px";
      emoji.style.top = rect.top + "px";

      document.body.appendChild(emoji);

      emoji.animate(
        [
          { transform: "translateY(0) scale(1)", opacity: 1 },
          { transform: "translateY(-100px) scale(1.5)", opacity: 0 }
        ],
        {
          duration: 1000,
          easing: "ease-out"
        }
      ).onfinish = () => {
        emoji.remove();
      };
    }, i * 100);
  }
}


function renderStorySoFar(entries, round) {
  if (!storySoFar) return;

  const parentDiv = storySoFar.parentElement;

  // 처음 라운드(round === 0)면 부모 div 전체 숨기기
  if (round === 0) {
    storySoFar.innerHTML = "";
    if (parentDiv) parentDiv.style.display = "none";
    return;
  }

  // 라운드가 0이 아니면 표시
  if (parentDiv) parentDiv.style.display = "";

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

  // 전체 텍스트 길이 계산
  const totalText = (entries || []).map(e => e?.text || "").join(" ");
  const textLength = totalText.length;
  
  // 400자 이상이면 스크롤바 표시, 미만이면 폰트 크기 조정
  if (textLength > 400) {
    // 400자 넘으면 글자 크기 고정하고 스크롤바 표시
    storySoFar.classList.add('show-scroll');
    storySoFar.style.fontSize = '1.1rem';
  } else {
    // 400자 이하면 기존 로직대로 글자 크기 조정
    storySoFar.classList.remove('show-scroll');
    
    let fontSize = 1.3; // 기본 크기 (1.3rem)
    
    if (textLength > 300) {
      fontSize = 0.8;   // 아주 긴 텍스트
    } else if (textLength > 200) {
      fontSize = 0.9;   // 긴 텍스트
    } else if (textLength > 150) {
      fontSize = 1.0;   // 중간 정도 긴 텍스트
    } else if (textLength > 100) {
      fontSize = 1.05;  // 약간 긴 텍스트
    } else if (textLength > 70) {
      fontSize = 1.1;   // 보통보다 약간 긴
    } else if (textLength > 50) {
      fontSize = 1.15;  // 보통 길이
    } else if (textLength > 30) {
      fontSize = 1.2;   // 짧은 편
    } else if (textLength > 20) {
      fontSize = 1.25;  // 매우 짧은 편
    }
    // 20자 이하는 기본 크기 1.3rem 유지
    
    storySoFar.style.fontSize = `${fontSize}rem`;
  }


}

// 방장 여부 체크
function isResultHost() {
  return socket.id === resultHostId;
}

// 채팅 애니메이션 정지
function stopChatAnimation() {
  if (chatAnimationTimer) {
    clearTimeout(chatAnimationTimer);
    chatAnimationTimer = null;
  }
}

// 채팅방 스타일 결과 표시 함수들
function initResultsPresentation(payload) {
  resultData = payload;
  resultHostId = payload?.hostId || null;
  currentChainIndex = 0;
  displayedEntryCount = 0;

  // 이전 TTS, 애니메이션 중지
  cancelTTS();
  stopChatAnimation();

  // 플레이어별 색상 매핑 생성
  playerColorMap = {};
  const chains = payload?.chains || [];

  // 모든 작성자 이름 수집 (중복 제거)
  const allWriters = new Set();
  for (const chain of chains) {
    if (chain.ownerName) allWriters.add(chain.ownerName);
    for (const entry of (chain.entries || [])) {
      if (entry.writerName) allWriters.add(entry.writerName);
    }
  }

  // 각 작성자에게 색상 할당
  let colorIndex = 0;
  for (const writerName of allWriters) {
    playerColorMap[writerName] = NICKNAME_COLORS[colorIndex % NICKNAME_COLORS.length];
    colorIndex++;
  }

  if (chains.length === 0) {
    if (storyTitle) storyTitle.textContent = "결과가 없어요";
    if (chatContainer) chatContainer.innerHTML = "";
    if (btnPrev) btnPrev.classList.add("hidden");
    if (btnNextStory) btnNextStory.classList.add("hidden");
    if (btnRestart) btnRestart.classList.remove("hidden");
    return;
  }

  // 결과 화면 사이드바 렌더링 (이모지 피커 + 본인 프로필)
  renderResultsSidebar();

  // 첫 스토리 표시 시작
  displayStory(0);
}

// 특정 스토리 표시 (채팅방 스타일로 문장 순차 표시)
function displayStory(chainIndex) {
  cancelTTS();
  stopChatAnimation();

  currentChainIndex = chainIndex;
  displayedEntryCount = 0;

  const chains = resultData?.chains || [];
  const chain = chains[chainIndex];
  if (!chain) return;

  const entries = chain.entries || [];
  const totalStories = chains.length;

  // 제목 표시
  if (storyTitle) {
    storyTitle.style.visibility = "hidden";
    storyTitle.textContent = `${chain.ownerName}의 사생활`;
    // 다음 프레임에 표시 (레이아웃 계산 완료 후)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        storyTitle.style.visibility = "visible";
        storyTitle.style.animation = "fadeIn 0.5s ease";
      });
    });
  }

  // 진행 상황 표시
  if (progressText) {
    progressText.textContent = `${chainIndex + 1} / ${totalStories}`;
  }

  // 채팅 컨테이너 초기화
  if (chatContainer) {
    chatContainer.innerHTML = "";
  }

  // 버튼 상태 업데이트 (항상 활성화)
  updateResultButtons();

  // 제목 TTS → 완료 후 첫 메시지 표시
  if (entries.length > 0) {
    try {
      speakText(`${chain.ownerName}의 사생활`, () => {
        // 제목 TTS 완료 후 잠시 대기 → 첫 메시지 표시
        chatAnimationTimer = setTimeout(() => {
          showNextChatMessage(entries, 0);
        }, 500);
      });
    } catch (e) {
      console.error("제목 TTS 재생 중 오류:", e);
      chatAnimationTimer = setTimeout(() => {
        showNextChatMessage(entries, 0);
      }, 1500);
    }
  } else {
    try {
      speakText(`${chain.ownerName}의 사생활`);
    } catch (e) {
      console.error("제목 TTS 재생 중 오류:", e);
    }
  }
}

// 채팅 메시지 하나씩 표시
function showNextChatMessage(entries, index) {
  if (index >= entries.length) {
    return;
  }

  const entry = entries[index];
  const isLastEntry = (index === entries.length - 1);

  // 채팅 메시지 생성
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message";

  const writerName = entry.writerName || "알 수 없음";
  const writerId = entry.writerId;

  // 플레이어 정보 찾기 (writerId로 찾아서 닉네임이 같아도 다른 플레이어 구분)
  const writer = (currentRoomState?.players || []).find(p => p.id === writerId);
  const characterData = writer ? getCharacterById(writer.avatar) : null;

  // 아바타 요소 생성 (결과 화면용 - WaitingRoom 이미지)
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "chat-avatar";
  if (characterData) {
    avatarDiv.innerHTML = `<img src="${characterData.waitingRoomImage}" alt="${writerName}">`;
  } else {
    avatarDiv.textContent = "👤";
  }

  // 이름, 버블 컨테이너
  const contentDiv = document.createElement("div");
  contentDiv.className = "chat-content";

  const writerDiv = document.createElement("div");
  writerDiv.className = "chat-writer";
  writerDiv.textContent = writerName;

  // 플레이어별 고유 색상 적용
  const writerColor = playerColorMap[writerName] || NICKNAME_COLORS[0];
  writerDiv.style.color = writerColor;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "chat-bubble";
  bubbleDiv.innerHTML = highlightKeywords(entry.text || "", entry.usedKeywords || []);

  // 리액션 버튼 컨테이너
  const reactionContainer = document.createElement("div");
  reactionContainer.style.cssText = "display: flex; gap: 10px; margin-top: 5px; pointer-events: auto !important; position: relative; z-index: 999 !important;";

  // 좋아요 버튼 추가
  const likeBtn = document.createElement("button");
  likeBtn.type = "button";
  likeBtn.className = "like-btn";
  likeBtn.disabled = false;
  likeBtn.innerHTML = `<span class="like-icon" style="pointer-events: none;">❤️</span> <span class="like-count" style="pointer-events: none;">0</span>`;
  likeBtn.dataset.chainIndex = currentChainIndex;
  likeBtn.dataset.entryIndex = index;
  likeBtn.style.cssText = "padding: 5px 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 15px; cursor: pointer; font-size: 14px; pointer-events: auto !important; position: relative; z-index: 1000 !important;";

  likeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const chainIdx = parseInt(likeBtn.dataset.chainIndex);
    const entryIdx = parseInt(likeBtn.dataset.entryIndex);
    console.log("하트 버튼 클릭:", chainIdx, entryIdx); // 디버깅용
    socket.emit("sentence:like", { chainIndex: chainIdx, entryIndex: entryIdx });
  });

  // 화남 버튼 추가
  const angryBtn = document.createElement("button");
  angryBtn.type = "button";
  angryBtn.className = "angry-btn";
  angryBtn.disabled = false;
  angryBtn.innerHTML = `<span class="angry-icon" style="pointer-events: none;">😡</span> <span class="angry-count" style="pointer-events: none;">0</span>`;
  angryBtn.dataset.chainIndex = currentChainIndex;
  angryBtn.dataset.entryIndex = index;
  angryBtn.style.cssText = "padding: 5px 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 15px; cursor: pointer; font-size: 14px; pointer-events: auto !important; position: relative; z-index: 1000 !important;";

  angryBtn.addEventListener("mouseenter", () => {
    console.log("🖱️ 화남 버튼에 마우스 올림");
  });

  angryBtn.addEventListener("mouseleave", () => {
    console.log("🖱️ 화남 버튼에서 마우스 벗어남");
  });

  angryBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const chainIdx = parseInt(angryBtn.dataset.chainIndex);
    const entryIdx = parseInt(angryBtn.dataset.entryIndex);
    console.log("========================================");
    console.log("😡 화남 버튼 클릭!");
    console.log("chainIndex:", chainIdx, "entryIndex:", entryIdx);
    console.log("버튼 요소:", angryBtn);
    console.log("현재 화남 수:", angryBtn.querySelector('.angry-count')?.textContent);
    console.log("📤 서버로 sentence:angry 이벤트 전송 중...");
    console.log("========================================");

    socket.emit("sentence:angry", { chainIndex: chainIdx, entryIndex: entryIdx }, (response) => {
      console.log("========================================");
      console.log("📥 서버 응답 받음:");
      console.log("response:", response);
      if (response && response.ok) {
        console.log("✅ 성공! angryCount:", response.angryCount, "totalPlayers:", response.totalPlayers);

        // 즉시 UI 업데이트 (서버 브로드캐스트 기다리지 않고)
        const angryCountSpan = angryBtn.querySelector('.angry-count');
        if (angryCountSpan) {
          angryCountSpan.textContent = response.angryCount;
          console.log("✨ UI 업데이트 완료:", response.angryCount);
        }

        // 배경색 변경 (클릭했음을 표시)
        angryBtn.style.background = "rgba(139, 69, 19, 0.3)";
        angryBtn.style.borderColor = "rgba(139, 69, 19, 0.6)";

        // 과반수 체크
        if (response.angryCount > response.totalPlayers / 2) {
          console.log("💩 과반수 달성! 똥 폭죽!");
          const bubbleDiv = angryBtn.closest(".chat-content")?.querySelector(".chat-bubble");
          if (bubbleDiv && !bubbleDiv.classList.contains("poop-fireworks-shown")) {
            bubbleDiv.classList.add("poop-fireworks-shown");
            showPoopFireworks(bubbleDiv);
          }
        }
      } else if (response && !response.ok) {
        console.error("❌ 서버 에러:", response.error);
      }
      console.log("========================================");
    });
  });

  reactionContainer.appendChild(likeBtn);
  reactionContainer.appendChild(angryBtn);

  contentDiv.appendChild(writerDiv);
  contentDiv.appendChild(bubbleDiv);
  contentDiv.appendChild(reactionContainer);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);

  if (chatContainer) {
    chatContainer.appendChild(messageDiv);
    // 스크롤 맨 아래로
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  displayedEntryCount = index + 1;

  // TTS로 읽기 → 완료 후 다음 메시지 표시
  speakText(entry.text, () => {
    // TTS 완료 후 다음 메시지로
    if (!isLastEntry) {
      chatAnimationTimer = setTimeout(() => {
        showNextChatMessage(entries, index + 1);
      }, 500);
    }
  });
}

// 버튼 상태 업데이트
function updateResultButtons() {
  const chains = resultData?.chains || [];
  const isFirstStory = currentChainIndex === 0;
  const isLastStory = currentChainIndex === chains.length - 1;
  const isHost = isResultHost();

  if (screenResults) {
    screenResults.classList.toggle("results-host", isHost);
  }

  // 이전/다음 버튼은 방장만 표시, TTS 중에도 항상 활성화
  if (btnPrev) {
    if (isHost) {
      btnPrev.disabled = isFirstStory;
      btnPrev.classList.remove("hidden");
    } else {
      btnPrev.classList.add("hidden");
    }
  }

  if (btnNextStory) {
    if (isHost) {
      btnNextStory.classList.remove("hidden");
      btnNextStory.disabled = isLastStory;
    } else {
      btnNextStory.classList.add("hidden");
    }
  }

  // 다시하기 버튼 (마지막 스토리일 때만 활성화, 방장만)
  if (btnRestart) {
    if (isHost) {
      btnRestart.classList.remove("hidden");
      btnRestart.disabled = !isLastStory;
    } else {
      btnRestart.classList.add("hidden");
    }
  }
}

// 다음 스토리로 이동
function goNextStory() {
  if (!isResultHost()) return;

  const chains = resultData?.chains || [];
  if (currentChainIndex >= chains.length - 1) return;

  // 서버에 동기화 요청
  socket.emit("result:navigate", { chainIndex: currentChainIndex + 1 });
}

// 이전 스토리로 이동
function goPrevStory() {
  if (!isResultHost()) return;

  if (currentChainIndex <= 0) return;

  // 서버에 동기화 요청
  socket.emit("result:navigate", { chainIndex: currentChainIndex - 1 });
}

// 서버에서 동기화 신호 받으면 해당 스토리 표시
function syncResultsDisplay(chainIndex) {
  displayStory(chainIndex);
}


function goByPhase(state) {
  if (!state) return;

  const players = state.players || [];

  // 최대 인원 표시
  if (playerMaxEl) {
    playerMaxEl.textContent = String(MAX_PLAYERS);
  }

  // 현재 인원 표시
  if (playerCountEl) {
    playerCountEl.textContent = String(players.length);
  }

  if (displayRoomCode) {
    displayRoomCode.textContent = `#${state.roomId}`;
  }

  renderPlayers(players, state.hostId);

  // ───────── phase 분기 ─────────
  if (state.phase === "countdown") {
  showScreen(screenCountdown);
  return;
  }

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
    
    const me = (state.players || []).find((p) => p.id === socket.id);

    if (lastPhase !== "prompt" && !me?.submitted?.prompts) {
      const promptInputs = document.querySelectorAll(".input-prompt");
      promptInputs.forEach((input) => (input.value = ""));
    }    

    // 플레이어 사이드바 렌더링 (키워드 화면)
    renderPromptsSidebars(state.players, {});

    if (btnSubmitPrompts) btnSubmitPrompts.disabled = false;
    if (waitMsg) waitMsg.classList.add("hidden");

    if (me?.submitted?.prompts) {
      if (btnSubmitPrompts) btnSubmitPrompts.disabled = true;
      if (waitMsg) waitMsg.classList.remove("hidden");
    }
    return;
  }

  if (state.phase === "story") {
    showScreen(screenStory);
    
    // 플레이어 사이드바 렌더링 (스토리 화면) - 플레이어 목록 변경 반영
    renderPlayerSidebars(state.players, {});
    
    wireStoryInputListeners();
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
  console.log("✅ Socket 연결됨:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Socket 연결 끊김");
  // TTS 중지
  cancelTTS();
  // 연결 끊기면 안전하게 입장 화면으로
  showScreen(screenName);
});

// 방 상태 업데이트
socket.on("game:countdown", ({ secondsLeft }) => {
  if (secondsLeft === 3) {
    playSound('countdown');
  }
  if (countdownNumber) countdownNumber.textContent = String(secondsLeft);
  showScreen(screenCountdown);
});

socket.on("game:countdownEnd", () => {
  // 아무것도 안 해도 됨 (room:state로 prompt로 넘어가면서 화면 전환됨)
});


socket.on("room:state", (state) => {
  console.log("room:state", state);
  currentRoomState = state;
  goByPhase(state);
  
  // 제출 상태에 따른 입력 잠금
  applyInputLocksFromState(state);
  
  // 사이드바 상태 업데이트 (제출 상태 즉시 반영)
  if (state.phase === "prompt" && state.players) {
    updatePromptsSidebarStatus(state.players, {});
  } else if (state.phase === "story" && state.players) {
    updateSidebarPlayerStatus(state.players, {});
  }
  
  lastPhase = state.phase;
});

socket.on("game:aborted", ({ reason }) => {
  // TTS 중지
  cancelTTS();
  alertError(`게임이 중단됐어: ${reason}`);
  showScreen(screenLobby);
});

socket.on("story:round", (payload) => {
  // Fix: 라운드 시작 시 모든 플레이어 상태를 즉시 '생각중'으로 업데이트
  if (currentRoomState && currentRoomState.players) {
    updateSidebarPlayerStatus(currentRoomState.players, {});
  }

  // 라운드 시작 사운드
  playSound('nextTurn');

  currentRoundPayload = payload;
  const currentRound = payload.round ?? 0;
  const totalRounds = payload.totalRounds ?? 0;

  const isLastRound = totalRounds > 0 && (currentRound + 1 === totalRounds);

  // 라운드에 따라 배경 이미지 설정
  const notebookPanel = document.querySelector('.notebook-panel');
  if (notebookPanel) {
    if (currentRound === 0) {
      notebookPanel.style.backgroundImage = "url('./image/04_스토리 적기/Note_Asset_round_01.png')";
    } else if (isLastRound) {
      notebookPanel.style.backgroundImage = "url('./image/05_엔딩/Note_Asset_Final_Round.png')";
    } else {
      notebookPanel.style.backgroundImage = "url('./image/04_스토리 적기/Note_Asset_Normal.png')";
    }
  }

  // 라운드 표기 UI
  if (roundLabel) {
    roundLabel.innerHTML =
      `라운드 <span id="display-round"></span> / <span id="display-total-rounds"></span>`;
  }

  const dr = document.getElementById("display-round");
  const dt = document.getElementById("display-total-rounds");

  if (dr) dr.textContent = String(currentRound + 1);
  if (dt) dt.textContent = String(totalRounds);


  // 혹시 다른 곳에서 displayRound/displayTotalRounds를 계속 쓰고 있으면 유지
  if (!isLastRound) {
    if (displayRound) displayRound.textContent = String(currentRound + 1);
    if (displayTotalRounds) displayTotalRounds.textContent = String(totalRounds);
  }

  // 제시어 카드 렌더링
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

  if (inputStoryText) inputStoryText.value = "";
  updatePromptUsageUI();

  if (inputStoryText) inputStoryText.disabled = false;
  if (btnSubmitStory) btnSubmitStory.disabled = false;
  if (storyWaitMsg) storyWaitMsg.classList.add("hidden");

  isWriting = false;
  if (writingTimeout) clearTimeout(writingTimeout);

  // 플레이어 상태 초기 렌더링 (라운드 시작 시 제출 상태 초기화 표시)
  if (currentRoomState && currentRoomState.players) {
    const resetPlayers = currentRoomState.players.map((p) => ({
      ...p,
      submitted: { ...(p.submitted || {}), story: false },
    }));
    renderPlayerStatus(resetPlayers, {});
    renderPlayerSidebars(resetPlayers, {});
  }
  
  // 입력 잠금 상태는 room:state에서 동기화

  showScreen(screenStory);
});

socket.on("prompt:timer", ({ secondsLeft }) => {
  if (displayPromptTimer) {
    displayPromptTimer.textContent = `${secondsLeft}s`;
    // 색상 통일
    displayPromptTimer.style.color = "#f8fafc";
  }

  // 5초 전 알림음 (한 번만 재생)
  if (secondsLeft === 5 && !promptTimeoutSoundPlayed) {
    playSound('beforeTimeout');
    promptTimeoutSoundPlayed = true;
  }

  // 타이머 리셋 (새 라운드 시작 시)
  if (secondsLeft > 5) {
    promptTimeoutSoundPlayed = false;
  }
});

socket.on("story:timer", ({ secondsLeft }) => {
  if (displayTimer) {
    displayTimer.textContent = `${secondsLeft}s`;
  }

  // 5초 전 알림음 (한 번만 재생)
  if (secondsLeft === 5 && !storyTimeoutSoundPlayed) {
    playSound('beforeTimeout');
    storyTimeoutSoundPlayed = true;
  }

  // 타이머 리셋 (새 라운드 시작 시)
  if (secondsLeft > 5) {
    storyTimeoutSoundPlayed = false;
  }

  if (secondsLeft <= 0) {
    if (inputStoryText && !inputStoryText.disabled && btnSubmitStory && !btnSubmitStory.disabled) {
      const currentText = String(inputStoryText.value || "");
      // 최신 초안을 서버에 저장
      socket.emit("story:writing", { writing: false, text: currentText });
      // 작성한 만큼 자동 제출
      submitStoryText(currentText, { auto: true });
    }
  }
});

socket.on("game:result", (payload) => {
  initResultsPresentation(payload);
  showScreen(screenResults);
});

// 결과 화면 동기화 (방장이 조작하면 모두에게 전파)
socket.on("result:sync", ({ chainIndex }) => {
  syncResultsDisplay(chainIndex);
});

// 다시하기 (방장이 누르면 모두 로비로)
socket.on("game:restarted", () => {
  // 키워드 입력란 초기화
  const promptInputs = document.querySelectorAll(".input-prompt");
  promptInputs.forEach((input) => {
    input.value = "";
  });

  // 스토리 입력란 초기화
  if (inputStoryText) inputStoryText.value = "";

  // 제시어 제출 버튼 활성화
  if (btnSubmitPrompts) btnSubmitPrompts.disabled = false;
  if (waitMsg) waitMsg.classList.add("hidden");

  // 상태 초기화
  lastPhase = null;
  resultData = null;
  resultHostId = null;
  currentChainIndex = 0;
  displayedEntryCount = 0;
  
  // 이전 게임의 사이드바 초기화 (이모티콘 표시 오류 방지)
  if (playersLeft) playersLeft.innerHTML = "";
  if (playersRight) playersRight.innerHTML = "";
  if (promptsPlayersLeft) promptsPlayersLeft.innerHTML = "";
  if (promptsPlayersRight) promptsPlayersRight.innerHTML = "";
  if (resultsPlayersLeft) resultsPlayersLeft.innerHTML = "";
  
  // TTS 중지
  cancelTTS();
  stopChatAnimation();

  showScreen(screenLobby);
});

// 키워드 작성 상태 업데이트
socket.on("prompt:writingStatus", ({ writingStatus }) => {
  if (currentRoomState && currentRoomState.players) {
    renderPromptStatus(currentRoomState.players, writingStatus);
    updatePromptsSidebarStatus(currentRoomState.players, writingStatus);
  }
});

// 플레이어 작성 상태 업데이트
socket.on("story:writingStatus", ({ writingStatus }) => {
  if (currentRoomState && currentRoomState.players) {
    renderPlayerStatus(currentRoomState.players, writingStatus);
    updateSidebarPlayerStatus(currentRoomState.players, writingStatus);
  }
});

// 이모티콘 수신
socket.on("emoji:received", ({ senderId, senderName, emojiId }) => {
  console.log("✨ 이모티콘 수신:", senderName, emojiId);
  displayReceivedEmoji(senderId, senderName, emojiId);
});

// 결과 화면 이모티콘 수신
socket.on("result:emojiReceived", ({ senderName, emojiType, emojiId, emojiContent, senderColor }) => {
  console.log("🎉 결과 이모티콘 수신:", senderName, emojiType, emojiId, emojiContent);
  
  // playerColorMap에서 먼저 색상 찾기 (결과 데이터에서 할당된 색상 사용)
  const color = playerColorMap[senderName] || senderColor || "#fbbf24";
  
  // 새로운 이모지 피커에서 온 경우 (emojiContent가 있음)
  if (emojiContent) {
    displayResultEmojiFromPicker(senderName, emojiContent, color);
  } else {
    // 기존 버튼 방식 (👍, 👏)
    displayResultEmoji(senderName, emojiType);
  }
});

// 문장 좋아요 업데이트
socket.on("sentence:likeUpdated", ({ chainIndex, entryIndex, likeCount, totalPlayers, likedBy }) => {
  // 해당 문장의 좋아요 버튼 찾기
  const likeBtn = document.querySelector(`button.like-btn[data-chain-index="${chainIndex}"][data-entry-index="${entryIndex}"]`);
  if (!likeBtn) return;

  // 좋아요 수 업데이트
  const likeCountSpan = likeBtn.querySelector(".like-count");
  if (likeCountSpan) {
    likeCountSpan.textContent = likeCount;
  }

  // 내가 좋아요 했는지 확인
  const iLiked = likedBy.includes(socket.id);
  if (iLiked) {
    likeBtn.style.background = "rgba(255, 100, 100, 0.3)";
    likeBtn.style.borderColor = "rgba(255, 100, 100, 0.6)";
  } else {
    likeBtn.style.background = "rgba(255,255,255,0.1)";
    likeBtn.style.borderColor = "rgba(255,255,255,0.3)";
  }

  // 과반수 이상 좋아요 시 폭죽 효과
  if (likeCount > totalPlayers / 2) {
    // 이전에 폭죽을 표시하지 않았으면 표시
    const bubbleDiv = likeBtn.closest(".chat-content")?.querySelector(".chat-bubble");
    if (bubbleDiv && !bubbleDiv.classList.contains("fireworks-shown")) {
      bubbleDiv.classList.add("fireworks-shown");
      showFireworks(bubbleDiv);
    }
  }
});

// 문장 화남 업데이트
socket.on("sentence:angryUpdated", ({ chainIndex, entryIndex, angryCount, totalPlayers, angriedBy }) => {
  console.log("🔴 화남 업데이트 수신:", { chainIndex, entryIndex, angryCount, totalPlayers, angriedBy });

  // 해당 문장의 화남 버튼 찾기
  const angryBtn = document.querySelector(`button.angry-btn[data-chain-index="${chainIndex}"][data-entry-index="${entryIndex}"]`);

  if (!angryBtn) {
    console.error("❌ 화남 버튼을 찾을 수 없음:", { chainIndex, entryIndex });
    console.log("현재 존재하는 화남 버튼들:", document.querySelectorAll('.angry-btn'));
    return;
  }

  console.log("✅ 화남 버튼 찾음:", angryBtn);

  // 화남 수 업데이트
  const angryCountSpan = angryBtn.querySelector(".angry-count");
  if (angryCountSpan) {
    console.log(`📊 화남 수 업데이트: ${angryCountSpan.textContent} → ${angryCount}`);
    angryCountSpan.textContent = angryCount;
  } else {
    console.error("❌ angry-count span을 찾을 수 없음");
  }

  // 내가 화남 했는지 확인
  const iAngried = angriedBy.includes(socket.id);
  console.log("😡 내가 화남 했나?", iAngried, "/ 내 ID:", socket.id);

  if (iAngried) {
    angryBtn.style.background = "rgba(255, 80, 50, 0.3)";
    angryBtn.style.borderColor = "rgba(255, 80, 50, 0.6)";
  } else {
    angryBtn.style.background = "rgba(255,255,255,0.1)";
    angryBtn.style.borderColor = "rgba(255,255,255,0.3)";
  }

  // 과반수 이상 화남 시 💩 폭죽 효과
  if (angryCount > totalPlayers / 2) {
    console.log("💩 과반수 화남! 똥 폭죽 발동:", angryCount, ">", totalPlayers / 2);
    // 이전에 똥 폭죽을 표시하지 않았으면 표시
    const bubbleDiv = angryBtn.closest(".chat-content")?.querySelector(".chat-bubble");
    if (bubbleDiv && !bubbleDiv.classList.contains("poop-fireworks-shown")) {
      bubbleDiv.classList.add("poop-fireworks-shown");
      showPoopFireworks(bubbleDiv);
    } else {
      console.log("⚠️ 똥 폭죽 이미 표시됨 또는 bubbleDiv 없음");
    }
  } else {
    console.log("ℹ️ 아직 과반수 미달:", angryCount, "<=", totalPlayers / 2);
  }
});

// ---- Button handlers ----

// 닉네임 입력 제한 (입력 이벤트에서 실시간 체크)
nicknameInput?.addEventListener("input", (e) => {
  const val = e.target.value;
  let len = 0;
  let newStr = "";
  
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    const weight = (char.charCodeAt(0) > 127) ? 2 : 1;
    if (len + weight > 16) break;
    len += weight;
    newStr += char;
  }
  
  if (val !== newStr) {
    e.target.value = newStr;
  }
});

// 키워드 입력란 변화 감지: 작성 중 상태 전송
let isWritingPrompts = false;
let writingPromptsTimeout = null;

document.querySelectorAll(".input-prompt").forEach(input => {
  input.addEventListener("input", () => {
    // 작성 중 상태 전송
    if (!isWritingPrompts) {
      isWritingPrompts = true;
      socket.emit("prompt:writing", { writing: true });
    }

    // 2초간 입력 없으면 작성 중 해제
    if (writingPromptsTimeout) clearTimeout(writingPromptsTimeout);
    writingPromptsTimeout = setTimeout(() => {
      if (isWritingPrompts) {
        isWritingPrompts = false;
        socket.emit("prompt:writing", { writing: false });
      }
    }, 2000);
  });
});

// Enter로 제출: 한 번만 등록
let storyKeydownListenerRegistered = false;
function wireStoryInputListeners() {
  if (storyKeydownListenerRegistered) return;
  
  inputStoryText?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // Shift+Enter는 줄바꿈 유지

    const r = currentRoundPayload?.round;
    if (typeof r !== "number") return;

    e.preventDefault();

    if (!inputStoryText.disabled && btnSubmitStory && !btnSubmitStory.disabled) {
      submitStoryText(inputStoryText.value);
    }
  });
  
  storyKeydownListenerRegistered = true;
}

// 스토리 입력란 변화 감지: 제시어 사용 현황 UI 갱신 + 작성 중 상태 전송 + Auto Save
inputStoryText?.addEventListener("input", () => {
  updatePromptUsageUI();
  const currentText = inputStoryText.value;

  // 작성 중 상태 전송 (텍스트 포함 - Auto Save)
  if (!isWriting) {
    isWriting = true;
    socket.emit("story:writing", { writing: true, text: currentText });
  } else {
    // 이미 작성 중 상태여도 텍스트 갱신을 위해 주기적으로 보낼 수도 있지만
    // 트래픽 과부하 방지를 위해 디바운스 처리된 타임아웃에서 최종 전송하거나
    // 중요: 여기서는 간단히 타임아웃 갱신 시점에 'false' 보내기 직전에 한번 더 'true'와 텍스트를 보내는게 좋을수도.
    // 하지만 단순하게 매번 보내는 건 너무 많음.
    // -> 서버에서 'writing' 이벤트에 text를 받도록 수정했으므로,
    //    디바운스 타임아웃 리셋.
  }

  // 1초간 입력 없으면 작성 중 해제 (서버에 최신본 저장)
  if (writingTimeout) clearTimeout(writingTimeout);
  writingTimeout = setTimeout(() => {
    if (isWriting) {
      isWriting = false;
      // 마지막으로 최신 텍스트와 함께 writing: false 전송 (혹은 true 유지하면서 텍스트만 갱신?)
      // writing: false로 보내면 '...' 표시가 사라짐.
      // Auto-save 목적이라면 writing: true 상태로 text만 보내는게 좋지만,
      // 여기서는 "입력을 멈춤" = "생각중" 으로 간주하여 false를 보냄.
      socket.emit("story:writing", { writing: false, text: inputStoryText.value });
    }
  }, 1000);
});


// 방 만들기: 닉네임 확인 후 바로 생성
btnCreateRoom?.addEventListener("click", () => {
  if (!ensureName()) return;
  playSound('click');

  socket.emit("room:create", { name: myName, avatar: myAvatar }, (res) => {
    if (!res?.ok) return alertError(`방 생성 실패: ${res?.error || "UNKNOWN"}`);
    playSound('enter');
    if (res.state) {
      currentRoomState = res.state;
      goByPhase(res.state);
    }
  });
});

// 포스트잇 위 join-inline 열기
const joinInline = document.getElementById("join-inline");
const roomCodeInputInline = document.getElementById("input-room-code-inline");
const btnJoinInline = document.getElementById("btn-join-inline");

btnJoinRoom?.addEventListener("click", () => {
  if (!ensureName()) return;
  playSound('click');

  const isOpen = !joinInline?.classList.contains("hidden");

  if (isOpen) {
    // 다시 원래 상태로
    joinInline?.classList.add("hidden");
    btnJoinInline?.classList.add("hidden");
    if (roomCodeInputInline) roomCodeInputInline.value = "";
  } else {
    // 코드 입력 UI 열기
    joinInline?.classList.remove("hidden");
    btnJoinInline?.classList.remove("hidden");
    setTimeout(() => roomCodeInputInline?.focus(), 0);
  }
});


function joinRoomWith(roomId) {
  if (!ensureName()) return;
  playSound('click');

  const rid = String(roomId || "").trim();
  if (!rid) return alertError("그 방은 없는 방이에요…🙀");

  socket.emit("room:join", { roomId: rid, name: myName, avatar: myAvatar }, (res) => {
    if (!res?.ok) {
      if (res?.error === "ROOM_FULL") {
        return alertError("입장 가능 인원이 초과 되었습니다.");
      }
      return alertError(`방 입장 실패: ${res?.error || "UNKNOWN"}`);
    }

    playSound('enter');

    // 인라인 닫기
    joinInline?.classList.add("hidden");
    btnJoinInline?.classList.add("hidden");

    if (roomCodeInputInline) roomCodeInputInline.value = "";

    if (res.state) {
      currentRoomState = res.state;
      goByPhase(res.state);
    }
  });

  // 인라인 입장하기 버튼 클릭 → joinRoomWith 실행
  btnJoinInline?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    joinRoomWith(roomCodeInputInline?.value);
  });

  // 엔터로도 입장
  roomCodeInputInline?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinRoomWith(roomCodeInputInline?.value);
    }
  });
}

// join-inline의 Go 버튼
btnJoinInline?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  joinRoomWith(roomCodeInputInline?.value);
});

// join-inline에서 Enter로도 입장
roomCodeInputInline?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    joinRoomWith(roomCodeInputInline?.value);
  }
});



// Go!: 실제 방 입장
btnJoin?.addEventListener("click", () => {
  if (!ensureName()) return;

  const roomId = String(roomCodeInput?.value || "").trim();
  if (!roomId) return alertError("그 방은 없는 방이에요… 🙀");

  socket.emit("room:join", { roomId, name: myName, avatar: myAvatar }, (res) => {
    if (!res?.ok) return alertError(`방 입장 실패: ${res?.error || "UNKNOWN"}`);
    if (res.state) {
      currentRoomState = res.state;
      goByPhase(res.state);
    }
  });
});

btnLeave?.addEventListener("click", () => {
  playSound('click');
  // TTS 중지
  cancelTTS();

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
  playSound('click');
  socket.emit("game:start", {}, (res) => {
    if (!res?.ok) return alertError(`${res?.error || "UNKNOWN"}`);
  });
});

// 방 코드 복사 (방 코드 컨테이너 클릭 시)
roomCodeDisplay?.addEventListener("click", async () => {
  playSound('click');
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
  playSound('click');
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

  // 성공 즉시 잠금
  const inputs = document.querySelectorAll(".input-prompt");
  inputs.forEach((el) => (el.disabled = true));    
  });
});

function submitStoryText(text, { auto = false } = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    if (!auto) alertError("문장을 작성해 주세요.");
    return;
  }

  const round = typeof currentRoundPayload?.round === "number" ? currentRoundPayload.round : null;

  if (btnSubmitStory) btnSubmitStory.disabled = true;
  if (storyWaitMsg) storyWaitMsg.classList.remove("hidden");

  socket.emit("story:submit", { text: trimmed, round }, (res) => {
    if (!res?.ok) {
      if (storyWaitMsg) storyWaitMsg.classList.add("hidden");
      if (auto) return;
      if (btnSubmitStory) btnSubmitStory.disabled = false;
      alertError(`제출 실패: ${res?.error || "UNKNOWN"}`);
      return;
    }

    // 성공 즉시 잠금
    if (inputStoryText) inputStoryText.disabled = true;
  });
}

btnSubmitStory?.addEventListener("click", () => {
  playSound('click');
  const text = String(inputStoryText?.value || "");
  submitStoryText(text);
});

// 결과 화면 버튼 핸들러
btnNextStory?.addEventListener("click", () => {
  playSound('click');
  goNextStory();
});

btnPrev?.addEventListener("click", () => {
  playSound('click');
  goPrevStory();
});

// 키보드 네비게이션 (결과 화면에서, 방장만)
document.addEventListener("keydown", (e) => {
  if (screenResults?.classList.contains("hidden")) return;
  if (!isResultHost()) return; // 방장만 키보드 조작 가능

  if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    goNextStory();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goPrevStory();
  }
});

// 다시하기 버튼 (방장만)
btnRestart?.addEventListener("click", () => {
  playSound('click');
  if (!isResultHost()) return;

  socket.emit("game:restart", {}, (res) => {
    if (!res?.ok) return alertError(`다시하기 실패: ${res?.error || "UNKNOWN"}`);
  });
});

// 게임 나가기 (첫 화면으로 이동)
btnExit?.addEventListener("click", () => {
  playSound('click');
  cancelTTS();

  socket.emit("room:leave", {}, (res) => {
    if (!res?.ok) return alertError(`나가기 실패: ${res?.error || "UNKNOWN"}`)

    if (displayRoomCode) displayRoomCode.textContent = "#----";
    if (playerList) playerList.innerHTML = "";
    if (roomCodeInput) roomCodeInput.value = "";    

    // 화면/상태 초기화
    currentRoomState = null;
    currentRoomId = null;

    showScreen(screenName);
    document.body.classList.add("bg-main");
  });
});

// 스크린샷 저장 (Canvas API 직접 사용 - 선명한 렌더링)
async function captureAndDownloadScreenshot() {
  const storyContainer = document.querySelector(".results-container");
  if (!storyContainer) {
    alertError("캡처할 대상을 찾을 수 없습니다.");
    return;
  }

  try {
    // 1. 배경 이미지 로드
    const bgImage = new Image();
    bgImage.crossOrigin = "anonymous";
    bgImage.src = './image/05_엔딩/공책.png';
    
    await new Promise((resolve, reject) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => resolve();  // 에러 발생해도 계속 진행
    });

    // 2. Canvas 생성 (고해상도)
    const scale = 2;  // 2배 해상도
    const canvasWidth = 900 * scale;
    const canvasHeight = 600 * scale;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // 고품질 렌더링 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 3. 배경 이미지 그리기
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
    
    // 4. 제목 그리기 (~~의 사생활)
    const titleText = storyTitle?.textContent || "";
    ctx.font = `bold ${58 * scale}px 'NostalgicMongtori', cursive, sans-serif`;
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, canvasWidth / 2, 85 * scale);
    
    // 5. 진행 상황 그리기 (1 / 2)
    const progressStr = `${currentChainIndex + 1} / ${resultData?.chains?.length || 1}`;
    ctx.font = `${36 * scale}px 'NostalgicMongtori', cursive, sans-serif`;
    ctx.fillStyle = '#2F3569';
    ctx.textAlign = 'left';
    ctx.fillText(progressStr, 90 * scale, 80 * scale);
    
    // 6. 채팅 메시지들 그리기
    const chatMessages = document.querySelectorAll('#screen-results .chat-message');
    let yOffset = 150 * scale;  // 시작 Y 위치
    
    // 필요한 canvas height 계산을 위한 사전 계산
    let totalHeight = 150 * scale;
    
    for (const message of chatMessages) {
      const bubbleEl = message.querySelector('.chat-bubble');
      const bubbleText = bubbleEl?.textContent || "";
      
      // 텍스트 줄 수 계산
      ctx.font = `${16 * scale}px sans-serif`;
      const maxWidth = 580 * scale;
      const words = bubbleText.split('');
      let line = '';
      let numberOfLines = 1;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          numberOfLines++;
          line = words[i];
        } else {
          line = testLine;
        }
      }
      
      // 말풍선 높이 동적 계산
      const paddingTop = 10 * scale;
      const paddingBottom = 10 * scale;
      const lineHeight = 20 * scale;
      const bubbleHeight = paddingTop + paddingBottom + numberOfLines * lineHeight;
      
      // 메시지 하나의 총 높이 (아바타 64px + gap + 닉네임 여백 + 말풍선 + 좋아요 + 간격)
      const messageHeight = 64 * scale + bubbleHeight + 30 * scale + 20 * scale;
      totalHeight += messageHeight;
    }
    
    // Canvas height 확장 필요시
    if (totalHeight > canvasHeight) {
      canvas.height = Math.ceil(totalHeight + 50 * scale);  // 하단 여백 추가
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // 배경 다시 그리기
      ctx.drawImage(bgImage, 0, 0, canvasWidth, canvas.height);
      // 제목 다시 그리기
      ctx.font = `bold ${58 * scale}px 'NostalgicMongtori', cursive, sans-serif`;
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, canvasWidth / 2, 85 * scale);
      // 진행 상황 다시 그리기
      ctx.font = `${36 * scale}px 'NostalgicMongtori', cursive, sans-serif`;
      ctx.fillStyle = '#2F3569';
      ctx.textAlign = 'left';
      ctx.fillText(progressStr, 90 * scale, 80 * scale);
    }
    
    yOffset = 150 * scale;
    const verticalSpacing = 20 * scale;  // 메시지 간 간격
    
    for (const message of chatMessages) {
      // 아바타 이미지
      const avatarImg = message.querySelector('.chat-avatar img');
      const writerEl = message.querySelector('.chat-writer');
      const bubbleEl = message.querySelector('.chat-bubble');
      const likeBtn = message.querySelector('.like-btn');
      
      const writerName = writerEl?.textContent || "";
      const writerColor = writerEl?.style.color || '#f59e0b';
      const bubbleText = bubbleEl?.textContent || "";
      const likeCount = likeBtn?.querySelector('.like-count')?.textContent || "0";
      
      // 아바타 그리기
      if (avatarImg && avatarImg.complete) {
        try {
          ctx.save();
          ctx.beginPath();
          ctx.arc(80 * scale + 32 * scale, yOffset + 32 * scale, 32 * scale, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatarImg, 80 * scale, yOffset, 64 * scale, 64 * scale);
          ctx.restore();
        } catch (e) {
          // 아바타 로드 실패 시 기본 원 그리기
          ctx.beginPath();
          ctx.arc(80 * scale + 32 * scale, yOffset + 32 * scale, 32 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#e0e0e0';
          ctx.fill();
        }
      }
      
      // 닉네임 그리기
      ctx.font = `bold ${16 * scale}px sans-serif`;
      ctx.fillStyle = writerColor;
      ctx.textAlign = 'left';
      ctx.fillText(writerName, 160 * scale, yOffset + 20 * scale);
      
      // 메시지 텍스트 줄 수 계산
      ctx.font = `${16 * scale}px sans-serif`;
      const maxWidth = 580 * scale;
      const words = bubbleText.split('');
      let line = '';
      let numberOfLines = 1;
      const textLines = [];
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          textLines.push(line);
          line = words[i];
          numberOfLines++;
        } else {
          line = testLine;
        }
      }
      if (line) textLines.push(line);
      
      // 말풍선 높이 동적 계산
      const paddingTop = 10 * scale;
      const paddingBottom = 10 * scale;
      const lineHeight = 20 * scale;
      const bubbleHeight = paddingTop + paddingBottom + numberOfLines * lineHeight;
      
      // 말풍선 배경 그리기
      const bubbleX = 160 * scale;
      const bubbleY = yOffset + 30 * scale;
      const bubbleWidth = 600 * scale;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10 * scale);
      ctx.fill();
      
      // 말풍선 테두리
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
      
      // 메시지 텍스트 그리기
      ctx.font = `${16 * scale}px sans-serif`;
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      
      let textY = bubbleY + paddingTop + 16 * scale;
      for (const textLine of textLines) {
        ctx.fillText(textLine, bubbleX + 10 * scale, textY);
        textY += lineHeight;
      }
      
      // 좋아요 버튼 그리기 (크기 고정)
      const likeY = bubbleY + bubbleHeight + 5 * scale;
      ctx.font = `${14 * scale}px sans-serif`;
      ctx.fillStyle = '#ef4444';
      const likeButtonText = `❤️ ${likeCount}`;
      ctx.fillText(likeButtonText, bubbleX, likeY + 15 * scale);
      
      // 다음 메시지 위치 (동적 높이 + 간격)
      yOffset += 64 * scale + bubbleHeight + 30 * scale + verticalSpacing;
    }

    // 7. PNG로 다운로드
    const imageUri = canvas.toDataURL("image/png", 1.0);
    
    const link = document.createElement("a");
    link.href = imageUri;
    
    const date = new Date();
    const storyName = storyTitle?.textContent || "우리들의_이야기";
    const cleanName = storyName.replace(/\s+/g, "_");
    const fileName = `${cleanName}_${date.getHours()}시${date.getMinutes()}분.png`;
    link.download = fileName;
    
    link.click();
    
    alert("이미지가 성공적으로 저장되었습니다!");

  } catch (error) {
    console.error("캡처 실패:", error);
    alertError("저장에 실패했습니다. 다시 시도해 주세요.");
  }
}

btnScreenshot?.addEventListener("click", () => {
  playSound('click');
  captureAndDownloadScreenshot();
});

// ---- 이모티콘 버튼 이벤트 ----
btnEmojiToggle?.addEventListener("click", () => {
  playSound('click');
  toggleEmojiPicker();
});

// 바깥 클릭 시 이모티콘 선택창 닫기
document.addEventListener("click", (e) => {
  if (!emojiPicker || emojiPicker.classList.contains("hidden")) return;
  if (!e.target.closest(".emoji-section")) {
    toggleEmojiPicker(false);
  }
});

// ---- BGM 초기화 ----
// 마스터 음량 상태
let masterMuted = false;
let bgmVolume = 0.3;
let sfxVolume = 0.5;

if (bgm) {
  bgm.volume = bgmVolume;
}

// 첫 상호작용 후 BGM 재생
let bgmStarted = false;
function startBGM() {
  if (bgmStarted || !bgm) return;
  bgmStarted = true;
  bgm.play().catch((e) => {
    console.warn("BGM 자동 재생 실패:", e);
  });
}

// 모든 클릭/터치 이벤트에서 BGM 시작 시도
document.addEventListener("click", startBGM, { once: false });
document.addEventListener("touchstart", startBGM, { once: false });
document.addEventListener("keydown", startBGM, { once: false });

// ---- 메뉴 기능 ----
function openMenu() {
  menuPanel?.classList.remove("hidden");
  menuOverlay?.classList.remove("hidden");
}

function closeMenu() {
  menuPanel?.classList.add("hidden");
  menuOverlay?.classList.add("hidden");
}

// 메뉴 열기/닫기
menuToggle?.addEventListener("click", (e) => {
  playSound('click');
  e.stopPropagation();
  openMenu();
});

menuClose?.addEventListener("click", closeMenu);
menuOverlay?.addEventListener("click", closeMenu);

// ESC 키로 메뉴 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menuPanel?.classList.contains("hidden")) {
    closeMenu();
  }
});

// BGM 볼륨 슬라이더
bgmVolumeSlider?.addEventListener("input", (e) => {
  playSound('click');
  const value = parseInt(e.target.value);
  bgmVolume = value / 100;

  if (bgm && !masterMuted) {
    bgm.volume = bgmVolume;
  }

  if (bgmVolumeValue) {
    bgmVolumeValue.textContent = `${value}%`;
  }
});

// 효과음 볼륨 슬라이더
sfxVolumeSlider?.addEventListener("input", (e) => {
  playSound('click');
  const value = parseInt(e.target.value);
  sfxVolume = value / 100;

  if (sfxVolumeValue) {
    sfxVolumeValue.textContent = `${value}%`;
  }
});

// 마스터 음량 갱신 (BGM 및 향후 효과음 제어)
function updateAudioVolumes() {
  if (bgm) {
    if (masterMuted) {
      bgm.volume = 0;
    } else {
      bgm.volume = bgmVolume;
    }
  }
}

// 마스터 뮤트 토글 상태 갱신
function updateMasterMuteButton() {
  if (!masterMuteToggle) return;

  if (masterMuted) {
    masterMuteToggle.textContent = "OFF";
    masterMuteToggle.classList.remove("on");
    masterMuteToggle.classList.add("off");
  } else {
    masterMuteToggle.textContent = "ON";
    masterMuteToggle.classList.remove("off");
    masterMuteToggle.classList.add("on");
  }
}

// 마스터 뮤트 토글 클릭
masterMuteToggle?.addEventListener("click", () => {
  playSound('click');
  masterMuted = !masterMuted;
  updateAudioVolumes();
  updateMasterMuteButton();
});

// 초기 뮤트 버튼 상태 설정
updateMasterMuteButton();

// ---- 반응형 스케일링 (가로 화면 기준) ----
// 기준 해상도 (디자인 기준 해상도)
const DESIGN_WIDTH = 1920;  // 디자인 기준 가로 해상도

function applyResponsiveScale() {
  const app = $("app");
  const whiteBorderBg = $("white-border-bg");
  if (!app) return;

  const windowWidth = window.innerWidth;

  // 화면 가로 크기 기준으로 스케일 계산
  const scale = windowWidth / DESIGN_WIDTH;

  // 최소/최대 스케일 제한 (0.5 ~ 1.5)
  const clampedScale = Math.min(Math.max(scale, 0.5), 1.5);

  app.style.transform = `scale(${clampedScale})`;

  // 배경 이미지에도 같은 스케일 적용
  if (whiteBorderBg) {
    whiteBorderBg.style.transform = `translate(-50%, -50%) scale(${clampedScale})`;
  }
}

// 초기 실행 및 리사이즈 이벤트
window.addEventListener('load', applyResponsiveScale);
window.addEventListener('resize', applyResponsiveScale);

// ---- 초기화 ----
renderEmojiList();
renderAvatarList();

// 첫 화면 진입 시 아바타 랜덤 선택
if (CHARACTER_LIST.length > 0) {
  selectRandomCharacter();
}


// ---- 초기 화면 ----
showScreen(screenName);