import { useEffect, useRef, useState } from "react";

// One fractional action clock drives drawing, labels, pause and arbitrary seek.
// No clock advances while its explanation is outside the viewport.
export function useActionPlayback(length, secondsPerAction = .5) {
  const host = useRef(null);
  const visible = useRef(false);
  const reduced = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [progress, setProgress] = useState(reduced.current ? length : 0);
  const [playing, setPlaying] = useState(!reduced.current);
  const clock = useRef({ value: reduced.current ? length : 0, hold: 0 });
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    }, { threshold: .12 });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    clock.current = { value: reduced.current ? length : 0, hold: 0 };
    setProgress(clock.current.value);
  }, [length]);
  useEffect(() => {
    if (!playing) return;
    let request, previous = performance.now(), lastReport = 0;
    function tick(now) {
      const delta = Math.min((now - previous) / 1000, .08);
      previous = now;
      if (visible.current && !document.hidden) {
        const state = clock.current;
        if (state.value >= length) {
          state.hold += delta;
          if (state.hold > 1.8) { state.value = 0; state.hold = 0; }
        } else state.value = Math.min(length, state.value + delta / secondsPerAction);
        if (now - lastReport > 32) { setProgress(state.value); lastReport = now; }
      }
      request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, length, secondsPerAction]);
  function seek(value) {
    clock.current = {value: Math.max(0, Math.min(length, value)), hold: 0};
    setProgress(clock.current.value);
    setPlaying(false);
  }
  return {host, progress, step: Math.floor(progress), playing, seek,
    toggle: () => setPlaying(value => !value)};
}
