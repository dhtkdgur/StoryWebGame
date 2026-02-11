// @ts-check
const { test, expect } = require("@playwright/test");

/**
 * TTS 테스트: speakText가 문장을 끝까지 읽는지 확인
 *
 * Web Speech API를 모킹하여 각 utterance의 onend가 정상 호출되고,
 * 모든 문장이 빠짐없이 완전하게 읽히는지 검증합니다.
 */

const SERVER_URL = "http://localhost:3000";

test.describe("TTS - 문장 끝까지 읽기 테스트", () => {
  test.beforeEach(async ({ page }) => {
    // SpeechSynthesis API 모킹 (페이지 로드 전에 주입)
    await page.addInitScript(() => {
      // 발화 기록 저장소
      window.__ttsLog = [];
      window.__ttsCompleted = [];
      window.__ttsCancelled = [];
      window.__ttsErrors = [];

      // Mock SpeechSynthesisUtterance (네이티브 클래스도 대체)
      class MockUtterance {
        constructor(text) {
          this.text = text;
          this.lang = "";
          this.rate = 1;
          this.pitch = 1;
          this.volume = 1;
          this.voice = null;
          this.onend = null;
          this.onerror = null;
          this.onstart = null;
        }
      }
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: MockUtterance,
        writable: true,
        configurable: true,
      });

      // Mock speechSynthesis (Object.defineProperty로 네이티브 API 완전 대체)
      let currentUtterance = null;
      let speakTimer = null;
      let isSpeaking = false;

      const mockSynth = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,

        getVoices() {
          return [
            { name: "Korean", lang: "ko-KR", localService: true, default: true, voiceURI: "Korean" },
          ];
        },

        speak(utterance) {
          currentUtterance = utterance;
          this.speaking = true;
          this.pending = false;
          isSpeaking = true;

          window.__ttsLog.push(utterance.text);
          console.log("[TTS Mock] speak:", utterance.text);

          // 글자 수에 비례한 지연 시간 (실제 TTS 시뮬레이션)
          const duration = Math.max(100, utterance.text.length * 20);
          speakTimer = setTimeout(() => {
            this.speaking = false;
            isSpeaking = false;
            window.__ttsCompleted.push(utterance.text);
            console.log("[TTS Mock] onend:", utterance.text);
            if (utterance.onend) utterance.onend();
          }, duration);
        },

        cancel() {
          if (currentUtterance && isSpeaking) {
            window.__ttsCancelled.push(currentUtterance.text);
            console.log("[TTS Mock] cancel:", currentUtterance.text);
          }
          clearTimeout(speakTimer);
          this.speaking = false;
          this.pending = false;
          this.paused = false;
          isSpeaking = false;
          currentUtterance = null;
        },

        pause() {
          this.paused = true;
        },

        resume() {
          this.paused = false;
        },
      };

      // 네이티브 speechSynthesis를 완전히 대체
      Object.defineProperty(window, "speechSynthesis", {
        value: mockSynth,
        writable: true,
        configurable: true,
      });

      // onvoiceschanged 트리거
      setTimeout(() => {
        if (mockSynth.onvoiceschanged) {
          mockSynth.onvoiceschanged();
        }
      }, 50);
    });

    // 페이지 로드
    await page.goto(SERVER_URL, { waitUntil: "domcontentloaded" });

    // ttsEnabled = true 확인
    await page.evaluate(() => {
      window.ttsEnabled = true;
    });
  });

  test("짧은 문장을 끝까지 읽는다", async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.__ttsLog = [];
        window.__ttsCompleted = [];
        window.__ttsCancelled = [];

        speakText("안녕하세요. 반갑습니다.", () => {
          resolve({
            log: [...window.__ttsLog],
            completed: [...window.__ttsCompleted],
            cancelled: [...window.__ttsCancelled],
          });
        });
      });
    });

    console.log("짧은 문장 결과:", JSON.stringify(result, null, 2));

    // 모든 발화된 문장이 완료되어야 함
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    // log와 completed가 동일해야 함 (모두 끝까지 읽힘)
    expect(result.log).toEqual(result.completed);
  });

  test("긴 문장(여러 문장)을 끝까지 읽는다", async ({ page }) => {
    const longText =
      "옛날 옛적에 한 마을에 용감한 소년이 살았습니다. " +
      "소년은 매일 산에 올라가 나무를 베었습니다. " +
      "어느 날 소년은 산 정상에서 신비로운 동굴을 발견했습니다. " +
      "동굴 안에는 빛나는 보석이 가득했습니다! " +
      "소년은 보석을 마을로 가져와 모두를 행복하게 만들었습니다.";

    const result = await page.evaluate((text) => {
      return new Promise((resolve) => {
        window.__ttsLog = [];
        window.__ttsCompleted = [];
        window.__ttsCancelled = [];

        speakText(text, () => {
          resolve({
            log: [...window.__ttsLog],
            completed: [...window.__ttsCompleted],
            cancelled: [...window.__ttsCancelled],
          });
        });
      });
    }, longText);

    console.log("긴 문장 결과:", JSON.stringify(result, null, 2));

    // 발화된 모든 문장이 완료되어야 함
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);

    // 원본 텍스트의 모든 내용이 포함되어야 함
    const allSpoken = result.completed.join(" ");
    expect(allSpoken).toContain("용감한 소년");
    expect(allSpoken).toContain("행복하게 만들었습니다");
  });

  test("speakText 연속 호출 시 이전 문장이 취소되고 새 문장이 완주된다", async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.__ttsLog = [];
        window.__ttsCompleted = [];
        window.__ttsCancelled = [];

        // 첫 번째 호출 (이건 cancel됨)
        speakText("첫 번째 문장입니다.");

        // 약간의 딜레이 후 두 번째 호출 (이것이 끝까지 읽혀야 함)
        setTimeout(() => {
          speakText("두 번째 문장입니다. 이것이 끝까지 읽혀야 합니다.", () => {
            resolve({
              log: [...window.__ttsLog],
              completed: [...window.__ttsCompleted],
              cancelled: [...window.__ttsCancelled],
            });
          });
        }, 50);
      });
    });

    console.log("연속 호출 결과:", JSON.stringify(result, null, 2));

    // 두 번째 호출의 문장이 완료되어야 함
    const completedText = result.completed.join(" ");
    expect(completedText).toContain("두 번째 문장");
    expect(completedText).toContain("끝까지 읽혀야 합니다");
  });

  test("콜백 없이 호출해도 끝까지 읽는다", async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.__ttsLog = [];
        window.__ttsCompleted = [];
        window.__ttsCancelled = [];

        speakText("콜백 없는 문장입니다. 끝까지 읽어야 합니다.");

        // 충분한 시간 후 결과 확인
        setTimeout(() => {
          resolve({
            log: [...window.__ttsLog],
            completed: [...window.__ttsCompleted],
            cancelled: [...window.__ttsCancelled],
          });
        }, 5000);
      });
    });

    console.log("콜백 없는 호출 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);
  });

  test("onend가 발생하지 않아도 watchdog이 강제 진행한다", async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.__ttsLog = [];
        window.__ttsCompleted = [];
        window.__ttsCancelled = [];

        // speak 모킹 변경: onend를 호출하지 않는 버그 시뮬레이션
        const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        let callCount = 0;
        window.speechSynthesis.speak = function (utterance) {
          callCount++;
          window.__ttsLog.push(utterance.text);
          this.speaking = true;

          if (callCount === 1) {
            // 첫 번째 문장: onend를 호출하지 않음 (Chrome 버그 시뮬레이션)
            // 하지만 speaking을 false로 만들어 watchdog이 감지하도록 함
            setTimeout(() => {
              this.speaking = false;
              this.pending = false;
              // onend 일부러 호출 안 함!
            }, 200);
          } else {
            // 나머지 문장은 정상 동작
            const duration = Math.max(100, utterance.text.length * 20);
            setTimeout(() => {
              this.speaking = false;
              window.__ttsCompleted.push(utterance.text);
              if (utterance.onend) utterance.onend();
            }, duration);
          }
        };

        speakText("첫 문장은 onend 안 됨. 두 번째 문장은 정상입니다.", () => {
          resolve({
            log: [...window.__ttsLog],
            completed: [...window.__ttsCompleted],
            cancelled: [...window.__ttsCancelled],
          });
        });
      });
    });

    console.log("watchdog 테스트 결과:", JSON.stringify(result, null, 2));

    // watchdog 덕분에 첫 문장도 건너뛰고 두 번째 문장까지 도달해야 함
    expect(result.log.length).toBeGreaterThanOrEqual(2);
    // 두 번째 문장은 completed에 포함
    expect(result.completed.some((t) => t.includes("정상입니다"))).toBe(true);
  });

  test("빈 텍스트는 콜백이 즉시 호출된다", async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let callbackCalled = false;
        speakText("", () => {
          callbackCalled = true;
        });
        // 즉시 확인
        setTimeout(() => resolve(callbackCalled), 50);
      });
    });

    expect(result).toBe(true);
  });

  test("TTS 비활성화 시 콜백이 즉시 호출된다", async ({ page }) => {
    // ttsEnabled는 let으로 선언되어 window에 없음 → stopTTS 후 speechSynthesis 제거로 테스트
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        // speechSynthesis를 제거하여 TTS 비활성화 시뮬레이션
        const saved = window.speechSynthesis;
        Object.defineProperty(window, "speechSynthesis", {
          value: undefined,
          writable: true,
          configurable: true,
        });

        let callbackCalled = false;
        speakText("이 문장은 읽히지 않아야 합니다.", () => {
          callbackCalled = true;
        });

        // 복원
        Object.defineProperty(window, "speechSynthesis", {
          value: saved,
          writable: true,
          configurable: true,
        });

        setTimeout(() => resolve(callbackCalled), 50);
      });
    });

    expect(result).toBe(true);
  });
});
