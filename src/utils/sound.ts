let isPlaying = false;
const ALERT_SOUND_URL = chrome.runtime.getURL("sounds/ping.mp3");

export function playPingSound() {
  if (isPlaying) return;

  const audio = new Audio(ALERT_SOUND_URL);
  isPlaying = true;

  audio
    .play()
    .then(() => {
      audio.onended = () => {
        isPlaying = false;
      };
    })
    .catch((err) => {
      isPlaying = false;
    });

  setTimeout(() => {
    isPlaying = false;
  }, 2000);
}