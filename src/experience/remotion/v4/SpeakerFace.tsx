// 話している人の顔タグ（ドキュメンタリー風）。話している間だけ、顔写真＋名前・役割を出す。
//   OPTEX-FA＝赤（左下）、お客様＝青（右下）。設備・図が画面に広がる場面は、字幕の帯の左（Kit の Subtitle）に入れる。字幕（下中央）の上に置き、0.25秒でフェード。ナレーションには出さない
import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import type { FaceCue } from "../../data";
import { C, FONT } from "../../../consulting/theme";

export const BLUE = "#1F5FAF";
const FADE = 0.25;
// 字幕の帯（bottom 64・高さ約90）の上
const BOTTOM = 182;
const SIDE = 64;
// 字幕を出さない書き出しで、設備・図が広がる場面：右上の状態表示（top 92）の下
const TOP = 150;

export const SpeakerFaceOverlay: React.FC<{ cues: FaceCue[]; t: number }> = ({
  cues,
  t,
}) => (
  <>
    {cues.map((c) => {
      if (t < c.audioStart - FADE || t > c.audioEnd + FADE) return null;
      const o = interpolate(
        t,
        [c.audioStart - FADE, c.audioStart, c.audioEnd, c.audioEnd + FADE],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      const accent = c.speakerCategory === "optex" ? C.red : BLUE;
      const left = c.displayPosition === "bottom-left";
      const top = c.displayPosition === "top-right";
      return (
        <div
          key={`${c.speakerId}-${c.audioStart}`}
          data-speaker={c.speakerId}
          style={{
            position: "absolute",
            ...(top ? { top: TOP } : { bottom: BOTTOM }),
            [left ? "left" : "right"]: SIDE,
            display: "flex",
            flexDirection: left ? "row" : "row-reverse",
            alignItems: "stretch",
            opacity: o,
            transform: `translateY(${(1 - o) * 10}px)`,
            fontFamily: FONT,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <Img
            src={staticFile(c.speakerImage)}
            style={{
              width: 150,
              height: 150,
              objectFit: "cover",
              display: "block",
              border: `4px solid ${accent}`,
              background: "#222",
            }}
          />
          <div
            style={{
              background: "rgba(13,14,16,0.86)",
              color: C.white,
              padding: "16px 26px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              borderTop: `4px solid ${accent}`,
              textAlign: left ? "left" : "right",
            }}
          >
            <span
              style={{
                alignSelf: left ? "flex-start" : "flex-end",
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 2,
                background: accent,
                padding: "2px 10px 3px",
              }}
            >
              {c.speakerCategory === "optex" ? "OPTEX-FA" : "お客様｜飲料工場"}
            </span>
            <span
              style={{ fontSize: 38, fontWeight: 900, whiteSpace: "nowrap" }}
            >
              {c.speakerName}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.78)",
                whiteSpace: "nowrap",
              }}
            >
              {c.speakerRole}
            </span>
          </div>
        </div>
      );
    })}
  </>
);

// 字幕の帯に入れる小さな顔タグ（顔＋名前・役割）
export const SubtitleFace: React.FC<{ cue: FaceCue }> = ({ cue }) => {
  const accent = cue.speakerCategory === "optex" ? C.red : BLUE;
  return (
    <div
      data-speaker={cue.speakerId}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        flex: "none",
        marginRight: 26,
      }}
    >
      <Img
        src={staticFile(cue.speakerImage)}
        style={{
          width: 92,
          height: 92,
          objectFit: "cover",
          display: "block",
          border: `3px solid ${accent}`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          lineHeight: 1.15,
        }}
      >
        <span
          style={{
            alignSelf: "flex-start",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 1.5,
            background: accent,
            color: C.white,
            padding: "1px 8px 2px",
          }}
        >
          {cue.speakerCategory === "optex" ? "OPTEX-FA" : "お客様"}
        </span>
        <span style={{ fontSize: 28, fontWeight: 900, whiteSpace: "nowrap" }}>
          {cue.speakerName}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(255,255,255,0.75)",
            whiteSpace: "nowrap",
          }}
        >
          {cue.speakerRole}
        </span>
      </div>
    </div>
  );
};
