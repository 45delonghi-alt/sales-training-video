// 登場人物5名の参照シート（お客様から受領した人物画像を、本編の配色・顔タグにそろえて並べたもの）。
//   npx remotion still src/index.ts CharacterSheet docs/web-experience/character-sheet.png
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT } from "../../consulting/theme";
import { characters } from "../data";
import { BLUE } from "./v4/SpeakerFace";

const ORDER = ["sales", "mori", "nakata", "sato", "takahashi"];
const VOICE: Record<string, string> = {
  sales: "Leo",
  mori: "Reid",
  nakata: "Emma",
  sato: "Roy",
  takahashi: "Tina",
};

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill
    style={{ background: "#F4F5F7", fontFamily: FONT, color: C.ink }}
  >
    <div
      style={{
        height: 120,
        background: "#0D0E10",
        display: "flex",
        alignItems: "center",
        padding: "0 64px",
        gap: 28,
      }}
    >
      <div style={{ width: 10, height: 56, background: C.red }} />
      <div style={{ fontSize: 52, fontWeight: 900, color: C.white }}>
        登場人物（参照シート）
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        顔タグ：OPTEX-FA＝赤／お客様＝青。顔・服装は受領画像のまま
      </div>
    </div>
    <div style={{ display: "flex", gap: 24, padding: "40px 48px 0" }}>
      {ORDER.map((id) => {
        const c = characters.find((x) => x.id === id)!;
        const accent = c.category === "optex" ? C.red : BLUE;
        return (
          <div
            key={id}
            style={{
              flex: 1,
              background: C.white,
              boxShadow: "0 14px 34px rgba(17,18,20,0.08)",
              borderTop: `10px solid ${accent}`,
            }}
          >
            <Img
              src={staticFile(c.image!)}
              style={{
                width: "100%",
                height: 400,
                objectFit: "cover",
                display: "block",
              }}
            />
            <div style={{ padding: "22px 26px 26px" }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: 2,
                  color: C.white,
                  background: accent,
                  padding: "3px 12px",
                }}
              >
                {c.category === "optex" ? "OPTEX-FA" : "お客様｜飲料工場"}
              </span>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  marginTop: 14,
                  whiteSpace: "nowrap",
                }}
              >
                {c.fullName && c.fullName !== c.name
                  ? `${c.fullName}さん`
                  : c.name}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: accent,
                  marginTop: 4,
                }}
              >
                {c.tagRole}
              </div>
              <div
                style={{
                  fontSize: 19,
                  lineHeight: 1.55,
                  marginTop: 14,
                  color: "#3A3F45",
                  height: 118,
                }}
              >
                {c.appearance}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "2px solid #E3E6EA",
                }}
              >
                <Img
                  src={staticFile(c.faceImage!)}
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    border: `3px solid ${accent}`,
                  }}
                />
                <div style={{ fontSize: 18, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 900 }}>
                    声：音読さん Beta「{VOICE[id]}」
                  </div>
                  <div style={{ color: "#6A7179" }}>顔タグ用の切り抜き</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);
