# 이미지 에셋 적용 가이드

이 문서는 StoryWebGame에 적용된 이미지 에셋과 추가로 적용 가능한 항목을 정리한 가이드입니다.

**마지막 업데이트:** 2026-01-24

---

## 목차
1. [적용 완료된 이미지](#1-적용-완료된-이미지)
2. [미적용 이미지 (수동 적용 필요)](#2-미적용-이미지-수동-적용-필요)
3. [이미지 폴더 구조](#3-이미지-폴더-구조)
4. [수정된 파일 목록](#4-수정된-파일-목록)

---

## 1. 적용 완료된 이미지

### 1.1 전체 배경
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 배경 이미지 | `00_전체/배경.png` | `style.css` body 배경 |
| 로고 | `00_전체/로고.png` | `index.html` 입장 화면 타이틀 |

### 1.2 입장 화면 (screen-name)
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 방 만들기 버튼 | `01_메인화면/게임호스트버튼.png` | `index.html` #btn-create-room |
| 방 들어가기 버튼 | `01_메인화면/게임입장하기버튼.png` | `index.html` #btn-join-room |

### 1.3 로비 화면 (screen-lobby)
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 나가기 버튼 | `02_로비/나가기 버튼.png` | `index.html` #btn-leave |
| 코드 복사 버튼 | `02_로비/방 코드 버튼.png` | `index.html` #btn-copy |
| 게임 시작 버튼 | `02_로비/시작하기 버튼.png` | `index.html` #btn-start |

### 1.4 키워드 입력 화면 (screen-prompts)
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 공책 배경 | `03_키워드 적기/공책.png` | `style.css` .note-background |
| 카드 1 | `03_키워드 적기/카드1.png` | `index.html` 첫 번째 keyword-card |
| 카드 2 | `03_키워드 적기/카드2.png` | `index.html` 두 번째 keyword-card |
| 카드 3 | `03_키워드 적기/카드3.png` | `index.html` 세 번째 keyword-card |
| 작성 완료 버튼 | `03_키워드 적기/확인.png` | `index.html` #btn-submit-prompts |
| 생각중 아이콘 | `03_키워드 적기/생각중.png` | `script.js` renderPromptStatus |
| 작성중 아이콘 | `03_키워드 적기/작성중.png` | `script.js` renderPromptStatus |
| 작성완료 아이콘 | `03_키워드 적기/작성완료.png` | `script.js` renderPromptStatus |

### 1.5 스토리 작성 화면 (screen-story)
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 제출 버튼 | `04_스토리 적기/제출.png` | `index.html` #btn-submit-story |
| 생각중 아이콘 | `04_스토리 적기/생각중.png` | `script.js` createSidebarPlayer, updateSidebarPlayerStatus |
| 작성중 아이콘 | `04_스토리 적기/작성중.png` | `script.js` createSidebarPlayer, updateSidebarPlayerStatus |
| 작성완료 아이콘 | `04_스토리 적기/작성완료.png` | `script.js` createSidebarPlayer, updateSidebarPlayerStatus |

### 1.6 결과 화면 (screen-results)
| 항목 | 파일 | 적용 위치 |
|------|------|----------|
| 이전 스토리 버튼 | `05_엔딩/이전 이야기로.png` | `index.html` #btn-prev |
| 다음 스토리 버튼 | `05_엔딩/다음 이야기로.png` | `index.html` #btn-next-story |
| 저장 버튼 | `05_엔딩/저장하기.png` | `index.html` #btn-screenshot |
| 다시하기 버튼 | `05_엔딩/다시하기.png` | `index.html` #btn-restart |

---

## 2. 미적용 이미지 (수동 적용 필요)

### 2.1 메인 화면 장식 요소
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `01_메인화면/공책.png` | 메인 화면 공책 배경 | CSS에서 .entry-container 배경으로 사용 가능 |
| `01_메인화면/공책속지_투명.png` | 공책 내부 속지 | 공책 위에 오버레이 |
| `01_메인화면/볼펜.png` | 장식 요소 | 화면에 absolute 배치 |
| `01_메인화면/클립.png` | 장식 요소 | 화면에 absolute 배치 |
| `01_메인화면/형광펜.png` | 장식 요소 | 화면에 absolute 배치 |
| `01_메인화면/아바타 선택창.png` | 아바타 선택 영역 배경 | .avatar-selection 배경으로 사용 |
| `01_메인화면/작은견출지.png` | 닉네임 입력 필드 배경 | .nickname-section 배경으로 사용 |

### 2.2 로비 화면 추가 요소
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `02_로비/공책.png` | 로비 배경 | .card.wide 배경으로 사용 |
| `02_로비/공책속지_투명.png` | 공책 내부 속지 | 공책 위에 오버레이 |
| `02_로비/대기실.png` | 대기실 타이틀 이미지 | h2 "대기실" 대체 |
| `02_로비/방장왕관.png` | 방장 표시 아이콘 | renderPlayers 함수에서 방장 이름 옆에 표시 |
| `02_로비/아바타_빈 참가자.png` | 빈 슬롯 표시 | 빈 플레이어 카드 배경 |
| `02_로비/아바타_참가자.png` | 참가자 카드 배경 | .player-card 배경으로 사용 |
| `02_로비/참가자목록 구분선.png` | 구분선 장식 | 플레이어 목록 사이에 배치 |
| `02_로비/나가기 버튼_활성화.png` | 나가기 버튼 호버 상태 | CSS :hover에서 이미지 교체 |
| `02_로비/시작하기 버튼_활성화.png` | 시작 버튼 호버 상태 | CSS :hover에서 이미지 교체 |
| `02_로비/방 코드_호버 시_복사하기 버튼.png` | 복사 버튼 호버 상태 | CSS :hover에서 이미지 교체 |

### 2.3 키워드 입력 화면 추가 요소
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `03_키워드 적기/밑줄_3가지의 키워드 카드를 만들어주세요.png` | 안내 텍스트 이미지 | h2 아래에 이미지로 추가 |
| `03_키워드 적기/확인_완료.png` | 제출 완료 후 버튼 상태 | 버튼 disabled 시 이미지 교체 |
| `03_키워드 적기/아바타.png` | 아바타 예시 (참고용) | - |

### 2.4 스토리 작성 화면 추가 요소
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `04_스토리 적기/공책.png` | 스토리 영역 배경 | .story-main 배경으로 사용 |
| `04_스토리 적기/입력란.png` | 텍스트 입력 영역 배경 | textarea 배경으로 사용 |
| `04_스토리 적기/아바타.png` | 사이드바 아바타 스타일 (참고용) | - |

### 2.5 결과 화면 추가 요소
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `05_엔딩/공책.png` | 결과 화면 배경 | .results-container 배경으로 사용 |
| `05_엔딩/사생활 데코.png` | 장식 요소 | 화면에 absolute 배치 |
| `05_엔딩/좌측아바타.png` | 좌측 아바타 장식 | 화면 좌측에 배치 |
| `05_엔딩/우측아바타.png` | 우측 아바타 장식 | 화면 우측에 배치 |
| `05_엔딩/이모티콘_창.png` | 이모티콘 선택 창 배경 | .result-emoji-section 배경으로 사용 |

### 2.6 배경 음악
| 파일 | 용도 | 적용 방법 |
|------|------|----------|
| `00_전체/Multi Game OST.mp3` | 배경 음악 | HTML에 audio 태그 추가 또는 script.js에서 Audio 객체로 재생 |

---

## 3. 이미지 폴더 구조

```
client/image/
├── 00_전체/
│   ├── Multi Game OST.mp3     (배경 음악)
│   ├── 로고.png               [적용됨]
│   └── 배경.png               [적용됨]
│
├── 01_메인화면/
│   ├── 게임입장하기버튼.png    [적용됨]
│   ├── 게임호스트버튼.png      [적용됨]
│   ├── 공책.png               (미적용)
│   ├── 공책속지_투명.png       (미적용)
│   ├── 볼펜.png               (미적용)
│   ├── 아바타 선택창.png       (미적용)
│   ├── 아바타.png             (참고용)
│   ├── 작은견출지.png          (미적용)
│   ├── 클립.png               (미적용)
│   └── 형광펜.png             (미적용)
│
├── 02_로비/
│   ├── 공책.png               (미적용)
│   ├── 공책속지_투명.png       (미적용)
│   ├── 나가기 버튼.png         [적용됨]
│   ├── 나가기 버튼_활성화.png   (호버 상태 미적용)
│   ├── 대기실.png             (미적용)
│   ├── 방 코드 버튼.png        [적용됨]
│   ├── 방 코드_호버 시_복사하기 버튼.png (호버 상태 미적용)
│   ├── 방장왕관.png            (미적용)
│   ├── 시작하기 버튼.png        [적용됨]
│   ├── 시작하기 버튼_활성화.png  (호버 상태 미적용)
│   ├── 아바타_빈 참가자.png     (미적용)
│   ├── 아바타_참가자.png        (미적용)
│   └── 참가자목록 구분선.png    (미적용)
│
├── 03_키워드 적기/
│   ├── 공책.png               [적용됨]
│   ├── 밑줄_3가지의 키워드 카드를 만들어주세요.png (미적용)
│   ├── 생각중.png             [적용됨]
│   ├── 아바타.png             (참고용)
│   ├── 작성완료.png            [적용됨]
│   ├── 작성중.png             [적용됨]
│   ├── 카드1.png              [적용됨]
│   ├── 카드2.png              [적용됨]
│   ├── 카드3.png              [적용됨]
│   ├── 확인.png               [적용됨]
│   └── 확인_완료.png           (제출 후 상태 미적용)
│
├── 04_스토리 적기/
│   ├── 공책.png               (미적용)
│   ├── 생각중.png             [적용됨]
│   ├── 아바타.png             (참고용)
│   ├── 입력란.png             (미적용)
│   ├── 작성완료.png            [적용됨]
│   ├── 작성중.png             [적용됨]
│   └── 제출.png               [적용됨]
│
├── 05_엔딩/
│   ├── 공책.png               (미적용)
│   ├── 다시하기.png            [적용됨]
│   ├── 다음 이야기로.png       [적용됨]
│   ├── 사생활 데코.png         (미적용)
│   ├── 우측아바타.png          (미적용)
│   ├── 이모티콘_창.png         (미적용)
│   ├── 이전 이야기로.png       [적용됨]
│   ├── 저장하기.png            [적용됨]
│   └── 좌측아바타.png          (미적용)
│
└── (기존 파일들 - 더 이상 사용하지 않음)
    ├── bg.png
    ├── card1.png
    ├── card2.png
    ├── card3.png
    ├── note.png
    └── submit.png
```

---

## 4. 수정된 파일 목록

### 4.1 style.css
- **16번째 줄:** 배경 이미지 경로 변경 (`bg.png` → `00_전체/배경.png`)
- **251번째 줄:** 노트 배경 이미지 경로 변경 (`note.png` → `03_키워드 적기/공책.png`)
- **파일 끝:** 이미지 버튼 스타일 추가 (`.image-btn`, `.title-logo`, `.status-icon-img`, `.sidebar-status-icon`)

### 4.2 index.html
- **14번째 줄:** h1 타이틀 → 로고 이미지
- **36~38번째 줄:** 방 만들기/들어가기 버튼 → 이미지 버튼
- **64~70번째 줄:** 로비 버튼들 → 이미지 버튼
- **89~99번째 줄:** 키워드 카드 이미지 경로 변경
- **105번째 줄:** 작성 완료 버튼 → 이미지 버튼
- **149번째 줄:** 스토리 제출 버튼 → 이미지 버튼
- **184~191번째 줄:** 결과 화면 버튼들 → 이미지 버튼

### 4.3 script.js
- **renderPromptStatus 함수 (204~234번째 줄):** 상태 아이콘 텍스트 → 이미지
- **createSidebarPlayer 함수 (326~332번째 줄):** 사이드바 상태 아이콘 → 이미지
- **updateSidebarPlayerStatus 함수 (443~451번째 줄):** 사이드바 상태 업데이트 시 이미지 사용

---

## 5. 추가 적용 방법 예시

### 5.1 버튼 호버 상태 이미지 적용
```css
/* style.css에 추가 */
#btn-start:hover img {
  content: url('./image/02_로비/시작하기 버튼_활성화.png');
}

#btn-leave:hover img {
  content: url('./image/02_로비/나가기 버튼_활성화.png');
}
```

### 5.2 배경 음악 추가
```html
<!-- index.html body 끝에 추가 -->
<audio id="bgm" loop>
  <source src="/image/00_전체/Multi Game OST.mp3" type="audio/mpeg">
</audio>
```

```javascript
// script.js에 추가
const bgm = document.getElementById("bgm");
bgm.volume = 0.3;

// 첫 상호작용 후 재생
document.addEventListener("click", () => {
  if (bgm.paused) {
    bgm.play().catch(() => {});
  }
}, { once: true });
```

### 5.3 장식 요소 추가 예시
```html
<!-- 결과 화면에 장식 추가 -->
<img src="/image/05_엔딩/좌측아바타.png" class="deco-left" alt="">
<img src="/image/05_엔딩/우측아바타.png" class="deco-right" alt="">
```

```css
.deco-left {
  position: fixed;
  left: 20px;
  bottom: 20px;
  width: 150px;
  z-index: -1;
}

.deco-right {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 150px;
  z-index: -1;
}
```

---

## 6. 아바타/이모티콘 관련

현재 아바타와 이모티콘은 **기본 이모지**를 사용하고 있습니다.

### 6.1 커스텀 아바타 이미지 추가 방법
아바타 이미지 파일이 준비되면 `script.js`의 `AVATAR_LIST`를 수정:

```javascript
const AVATAR_LIST = [
  { id: "avatar1", type: "image", content: "/image/avatar/avatar1.png" },
  { id: "avatar2", type: "image", content: "/image/avatar/avatar2.png" },
  // ...
];
```

### 6.2 커스텀 이모티콘 이미지 추가 방법
이모티콘 이미지 파일이 준비되면 `script.js`의 `EMOJI_LIST`를 수정:

```javascript
const EMOJI_LIST = [
  { id: "laugh", type: "image", content: "/image/emoji/laugh.png" },
  { id: "heart", type: "image", content: "/image/emoji/heart.png" },
  // ...
];
```

---

## 체크리스트

### 적용 완료
- [x] 전체 배경 이미지 (00_전체/배경.png)
- [x] 로고 이미지 (00_전체/로고.png)
- [x] 입장 화면 버튼 (방 만들기, 방 들어가기)
- [x] 로비 화면 버튼 (나가기, 코드 복사, 게임 시작)
- [x] 키워드 입력 화면 (공책 배경, 카드 1/2/3, 작성 완료 버튼)
- [x] 키워드 상태 아이콘 (생각중, 작성중, 작성완료)
- [x] 스토리 제출 버튼
- [x] 스토리 사이드바 상태 아이콘
- [x] 결과 화면 버튼 (이전, 다음, 저장, 다시하기)

### 미적용 (선택 사항)
- [ ] 입장 화면 장식 요소 (공책, 볼펜, 클립, 형광펜)
- [ ] 로비 화면 장식 요소 (대기실 타이틀, 방장왕관, 구분선)
- [ ] 버튼 호버 상태 이미지
- [ ] 결과 화면 장식 요소 (좌/우측 아바타, 사생활 데코)
- [ ] 이모티콘 창 배경
- [ ] 배경 음악 (BGM)
- [ ] 커스텀 아바타 이미지
- [ ] 커스텀 이모티콘 이미지
