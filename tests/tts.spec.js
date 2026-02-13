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

    // ttsEnabled = true 설정 (module-scoped 변수이므로 setter 사용)
    await page.evaluate(() => {
      setTtsEnabled(true);
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

test.describe("TTS - 극단적인 케이스 및 순서 검증", () => {
  test.beforeEach(async ({ page }) => {
    // SpeechSynthesis API 모킹 (페이지 로드 전에 주입)
    await page.addInitScript(() => {
      // 발화 기록 저장소
      window.__ttsLog = [];
      window.__ttsCompleted = [];
      window.__ttsCancelled = [];
      window.__ttsErrors = [];

      // Mock SpeechSynthesisUtterance
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

      // Mock speechSynthesis
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

          // 글자 수에 비례한 지연 시간
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

    await page.goto(SERVER_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      setTtsEnabled(true);
    });
  });

  test("극단적으로 긴 문장 (500자 이상)을 건너뛰지 않고 모두 읽는다", async ({ page }) => {
    // 500자가 넘는 긴 텍스트 생성 (타임아웃 방지)
    const longText = "안녕하세요. 이것은 매우 매우 긴 문장입니다. ".repeat(15) +
      "중간에 중요한 내용이 있습니다. " +
      "마지막 부분까지 모두 읽어야 합니다. ".repeat(10);

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
            originalLength: text.length,
          });
        });
      });
    }, longText);

    console.log("극단적으로 긴 문장 결과 (길이:", result.originalLength, "자)");
    console.log("문장 수:", result.completed.length);

    // 모든 문장이 완료되어야 함
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);

    // 원본 텍스트의 중요 부분이 포함되어야 함
    const allSpoken = result.completed.join(" ");
    expect(allSpoken).toContain("중요한 내용");
    expect(allSpoken).toContain("마지막 부분");
  });

  test("특수문자가 많은 문장을 건너뛰지 않고 읽는다", async ({ page }) => {
    const specialText = "안녕하세요!!! 정말로??? 대단하네요... " +
      "이것은 \"특수\" 문자가 (많이) 포함된 [문장]입니다. " +
      "100% 완벽하게! 읽어야 #합니다 @사용자님.";

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
    }, specialText);

    console.log("특수문자 문장 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);
  });

  test("숫자와 한글이 섞인 문장을 건너뛰지 않고 읽는다", async ({ page }) => {
    const mixedText = "2024년 1월 15일에 시작했습니다. " +
      "총 123개의 아이템이 있고, 45.6%가 완료되었습니다. " +
      "전화번호는 010-1234-5678입니다. " +
      "가격은 1,234,567원입니다.";

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
    }, mixedText);

    console.log("숫자 혼합 문장 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);

    const allSpoken = result.completed.join(" ");
    expect(allSpoken).toContain("2024");
    expect(allSpoken).toContain("1,234,567");
  });

  test("영어와 한글이 섞인 문장을 건너뛰지 않고 읽는다", async ({ page }) => {
    const mixedLangText = "Hello, 안녕하세요! This is a test입니다. " +
      "JavaScript를 사용하여 coding을 합니다. " +
      "React와 Vue는 popular한 framework입니다.";

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
    }, mixedLangText);

    console.log("언어 혼합 문장 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);

    const allSpoken = result.completed.join(" ");
    expect(allSpoken).toContain("Hello");
    expect(allSpoken).toContain("framework");
  });

  test("연속된 공백과 줄바꿈이 있는 문장을 정상적으로 읽는다", async ({ page }) => {
    const whitespaceText = "첫 번째 줄입니다.\n\n\n두 번째    줄입니다.    " +
      "   세 번째 줄입니다.\n네 번째 줄입니다.";

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
    }, whitespaceText);

    console.log("공백/줄바꿈 문장 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);
  });

  test("문장이 정확한 순서로 읽히고 건너뛰지 않는다", async ({ page }) => {
    const orderedText = "첫번째 문장입니다. " +
      "두번째 문장입니다. " +
      "세번째 문장입니다. " +
      "네번째 문장입니다. " +
      "다섯번째 문장입니다.";

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
    }, orderedText);

    console.log("순서 검증 결과:", JSON.stringify(result, null, 2));

    // 모든 문장이 완료되어야 함
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);

    // 순서대로 읽혔는지 확인
    const allSpoken = result.completed.join(" ");
    const firstIdx = allSpoken.indexOf("첫번째");
    const secondIdx = allSpoken.indexOf("두번째");
    const thirdIdx = allSpoken.indexOf("세번째");
    const fourthIdx = allSpoken.indexOf("네번째");
    const fifthIdx = allSpoken.indexOf("다섯번째");

    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(thirdIdx).toBeGreaterThan(secondIdx);
    expect(fourthIdx).toBeGreaterThan(thirdIdx);
    expect(fifthIdx).toBeGreaterThan(fourthIdx);
  });

  test("같은 문장이 두 번 읽히지 않는다 (중복 재생 방지)", async ({ page }) => {
    const text = "유니크한 첫 번째 테스트 문장입니다. " +
      "유니크한 두 번째 테스트 문장입니다.";

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
    }, text);

    console.log("중복 방지 결과:", JSON.stringify(result, null, 2));

    // 각 문장이 정확히 한 번씩만 읽혀야 함
    const completedText = result.completed.join(" ");

    // 각 고유 문장이 정확히 한 번만 나타나는지 확인
    const firstMatch = completedText.match(/유니크한 첫 번째 테스트 문장입니다/g);
    const secondMatch = completedText.match(/유니크한 두 번째 테스트 문장입니다/g);

    expect(firstMatch).toBeTruthy();
    expect(firstMatch.length).toBe(1); // 정확히 한 번만
    expect(secondMatch).toBeTruthy();
    expect(secondMatch.length).toBe(1); // 정확히 한 번만

    // log와 completed가 동일해야 함 (중복 없이)
    expect(result.log).toEqual(result.completed);
  });

  test("연속된 구두점이 있는 문장을 정상 처리한다", async ({ page }) => {
    const punctuationText = "정말요?!?! 믿을 수 없어요!!! " +
      "아... 그렇군요... " +
      "좋습니다!!!";

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
    }, punctuationText);

    console.log("연속 구두점 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);
  });

  test("단일 문자와 짧은 단어들도 건너뛰지 않고 읽는다", async ({ page }) => {
    const shortText = "A. B. C. 가. 나. 다. 1. 2. 3.";

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
    }, shortText);

    console.log("짧은 문자 결과:", JSON.stringify(result, null, 2));

    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);
  });

  test("복잡한 시나리오: 긴 문장 + 특수문자 + 숫자 혼합", async ({ page }) => {
    const complexText = "2024년 1월 1일, 새해가 밝았습니다!!! " +
      "올해 목표는 다음과 같습니다: " +
      "1) JavaScript 완벽 마스터하기 (100% 달성), " +
      "2) React & Vue.js 프로젝트 3개 완성하기, " +
      "3) AI/ML 기초 공부하기... " +
      "과연 모든 목표를 달성할 수 있을까요?!?! " +
      "노력하면 반드시 성공할 것입니다! ".repeat(5) +
      "화이팅!!!";

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
    }, complexText);

    console.log("복잡한 시나리오 결과:", JSON.stringify(result, null, 2));

    // 모든 문장이 완료되어야 함
    expect(result.completed.length).toBeGreaterThan(0);
    expect(result.cancelled.length).toBe(0);
    expect(result.log).toEqual(result.completed);

    // 중요 내용이 모두 포함되어야 함
    const allSpoken = result.completed.join(" ");
    expect(allSpoken).toContain("2024년");
    expect(allSpoken).toContain("JavaScript");
    expect(allSpoken).toContain("화이팅");
  });
});
