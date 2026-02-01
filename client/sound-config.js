// ====================================================================
// 사운드 효과 관리
// ====================================================================

// 사운드 요소 참조
const soundEffects = {
  click: document.getElementById('sfx-click'),
  enter: document.getElementById('sfx-enter'),
  error: document.getElementById('sfx-error'),
  countdown: document.getElementById('sfx-countdown'),
  nextTurn: document.getElementById('sfx-next-turn'),
  timeUp: document.getElementById('sfx-time-up'),
  beforeTimeout: document.getElementById('sfx-before-timeout'),
};

// 사운드 재생 함수 (음량 고려)
function playSound(soundName) {
  const sound = soundEffects[soundName];
  if (!sound) {
    console.warn(`사운드 "${soundName}"을(를) 찾을 수 없습니다.`);
    return;
  }

  // 마스터 뮤트 상태 확인 (전역 변수)
  if (typeof masterMuted !== 'undefined' && masterMuted) {
    return; // 마스터 뮤트 상태면 재생하지 않음
  }

  // 효과음 볼륨 적용 (sfxVolume은 전역 변수)
  if (typeof sfxVolume !== 'undefined') {
    sound.volume = sfxVolume;
  }

  // 이전 재생이 완료되지 않았으면 중단
  sound.currentTime = 0;
  sound.play().catch((e) => {
    console.warn(`사운드 재생 실패 "${soundName}":`, e);
  });
}

// 별도의 네임스페이스로 내보내기
const SoundManager = {
  play: playSound,
};
