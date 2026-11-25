import React from "react";
import { SENSOR_KEYS, SENSOR_LABELS } from "./cameraRig.js";

export default function CameraFeedLabels({onSelect}) {
  return <div className="sensor-feed-labels" aria-label="Synchronized camera views">
    {SENSOR_KEYS.map((key,index)=><button key={key} onClick={()=>onSelect(key)}>{SENSOR_LABELS[index]}</button>)}
  </div>;
}
