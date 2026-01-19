# 배포 문제 해결 가이드

## Render 배포 환경에서 발생한 문제 및 해결책

### 1. **이모티콘 기능이 작동하지 않음**

**원인:**
- `renderEmojiList()` 함수가 정의되어 있었지만 페이지 로드 시 호출되지 않아 DOM에 렌더링되지 않음

**해결책:**
- `DOMContentLoaded` 이벤트 리스너에서 `renderEmojiList()` 함수를 자동으로 호출하도록 수정
- 이제 페이지 로드 완료 시 이모티콘 버튼들이 자동으로 생성됨

**수정 파일:**
- `client/script.js` - `renderEmojiList()` 함수 다음에 초기화 코드 추가

---

### 2. **TTS(음성 읽기) 기능이 작동하지 않음**

**원인:**
- `speechSynthesis.getVoices()` 호출이 비동기 작업이지만 동기적으로 실행됨
- 브라우저 환경(특히 Render 환경)에서 한국어 음성이 준비되기 전에 실행되는 race condition 발생
- 에러 핸들링 부족으로 실패 시 조용히 넘어감

**해결책:**
1. **음성 캐싱 구현:**
   - `cachedKoreanVoice` 변수로 한 번 로드한 음성을 캐시하여 매번 검색할 필요 없음

2. **onvoiceschanged 이벤트 활용:**
   - 음성이 준비되면 자동으로 캐시 초기화하여 재로드

3. **에러 핸들링 강화:**
   - `speakText()` 함수에 try-catch 블록 추가
   - 결과 화면에서 메시지 표시 시 TTS 에러 시 조용히 진행하도록 개선

4. **콘솔 로깅:**
   - 디버깅 용이하게 에러 메시지 출력

**수정 파일:**
- `client/script.js` - TTS 함수 개선, 에러 핸들링 추가

---

### 3. **사진 저장 기능이 작동하지 않음**

**원인:**
1. **CDN 로드 실패 가능성:**
   - `html2canvas` 라이브러리가 외부 CDN에서 로드되는데, Render 환경의 네트워크 문제 가능
   - 라이브러리 로드 실패 여부 확인 코드 부재

2. **CORS 이슈:**
   - Render 서버에서 외부 리소스 로드 시 CORS 정책 위반 가능

**해결책:**
1. **라이브러리 로드 확인:**
   - `typeof html2canvas === "undefined"` 체크 추가
   - 로드 실패 시 사용자 친화적 에러 메시지 표시

2. **CORS 헤더 강화:**
   - Express 서버에 CORS 미들웨어 추가
   - Socket.IO CORS 설정에 `credentials: true` 추가

3. **CDN URL 보안 강화:**
   - Subresource Integrity (SRI) 해시 추가로 보안 향상
   - 안정적인 CDN 선택

**수정 파일:**
- `client/index.html` - html2canvas CDN에 SRI 속성 추가
- `client/script.js` - 라이브러리 로드 확인 코드 추가
- `server/server.js` - CORS 미들웨어 추가

---

## 🧪 테스트 항목

배포 전에 로컬에서 다음을 확인하세요:

```bash
# 로컬 서버 실행
node server/server.js

# 브라우저 콘솔에서 확인
# 1. 이모티콘: "이모티콘" 버튼이 보이고 클릭 가능한지 확인
# 2. TTS: 결과 화면에서 문장이 읽혀나가는지 확인 (음소거 모드 주의!)
# 3. 사진 저장: 결과 화면에서 "📸 저장" 버튼 클릭 시 이미지 다운로드되는지 확인
```

---

## 🚀 Render 배포 명령어

```bash
# 깃 커밋 및 푸시
git add .
git commit -m "Fix: emoji, TTS, and screenshot features for Render deployment"
git push origin main

# Render 대시보드에서 수동으로 재배포
# 또는 GitHub와 연동 시 자동으로 배포됨
```

---

## 📝 주의사항

1. **TTS는 브라우저 음소거 모드에서 작동하지 않습니다.**
   - 결과를 들으려면 음소거를 해제해야 합니다.

2. **일부 브라우저는 TTS를 지원하지 않습니다.**
   - Firefox, Chrome, Safari는 지원하지만, 구형 브라우저에서는 작동하지 않을 수 있습니다.

3. **이미지 저장은 브라우저 보안 정책에 따라 다릅니다.**
   - 프라이빗 모드(시크릿 탭)에서 작동하지 않을 수 있습니다.

---

## 🔧 추가 개선 사항

향후 추가 개선이 필요하면:

1. **TTS 플래그 제어:**
   - 결과 화면에서 "음성 끄기" 토글 버튼 추가

2. **대체 스크린샷 라이브러리:**
   - `html2canvas` 대신 `canvas` API 직접 사용
   - 또는 서버 사이드 스크린샷 생성 (headless browser)

3. **캐시 최적화:**
   - Service Worker를 통한 오프라인 지원

---

**마지막 수정:** 2026-01-19
