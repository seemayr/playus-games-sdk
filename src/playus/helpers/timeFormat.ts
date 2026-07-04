export function formatSecondsAsClock(secondsInput: number): string {
  let seconds = secondsInput;
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remSeconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remSeconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatMillisecondsAsClock(millisecondsInput: number): string {
  let ms = millisecondsInput;
  if (!Number.isFinite(ms) || ms < 0) {
    ms = 0;
  }
  const totalSeconds = Math.floor(ms / 1000);
  return formatSecondsAsClock(totalSeconds);
}
