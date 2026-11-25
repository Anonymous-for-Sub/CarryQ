import React from "react";

export default function PlayOverlay({onPlay,live=false}) {
  return <div className={"play-overlay"+(live?" live-play-overlay":"")}>
    <button className="start-demo" onClick={onPlay} aria-label={live?"Start live demonstration":"Start recorded demonstration"}>
      <span className="play-disc"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 7.5 25 16 11 24.5Z"/></svg></span>
      <span className="play-label">Play demo</span>
    </button>
  </div>;
}
