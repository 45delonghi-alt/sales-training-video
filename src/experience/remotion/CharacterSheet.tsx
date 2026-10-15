// 登場人物5名の参照シート（お客様から受領した人物画像・ワイプ用バッジを、本編の配色で並べたもの）。
//   npx remotion still src/index.ts CharacterSheet docs/web-experience/character-sheet.png
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, FONT} from '../../consulting/theme';
import {characters} from '../data';

const BLUE = '#1F5FAF';
const ORDER = ['sales', 'mori', 'nakata', 'sato', 'takahashi'];
const VOICE: Record<string, string> = {sales: 'Leo', mori: 'Reid', nakata: 'Emma', sato: 'Roy', takahashi: 'Tina'};

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{background: '#F4F5F7', fontFamily: FONT, color: C.ink}}>
    <div style={{height: 120, background: '#0D0E10', display: 'flex', alignItems: 'center', padding: '0 64px', gap: 28}}>
      <div style={{width: 10, height: 56, background: C.red}} />
      <div style={{fontSize: 52, fontWeight: 900, color: C.white}}>登場人物（参照シート）</div>
      <div style={{fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.7)'}}>ワイプ：OPTEX-FA＝画面の左／お客様＝画面の右</div>
    </div>
    <div style={{display: 'flex', gap: 24, padding: '40px 48px 0'}}>
      {ORDER.map((id) => {
        const c = characters.find((x) => x.id === id)!;
        const accent = c.category === 'optex' ? C.red : BLUE;
        return (
          <div key={id} style={{flex: 1, background: C.white, boxShadow: '0 14px 34px rgba(17,18,20,0.08)', borderTop: `10px solid ${accent}`}}>
            <Img src={staticFile(c.image!)} style={{width: '100%', height: 360, objectFit: 'cover', display: 'block'}} />
            <div style={{padding: '20px 26px 24px'}}>
              <span style={{fontSize: 18, fontWeight: 900, letterSpacing: 2, color: C.white, background: accent, padding: '3px 12px'}}>{c.category === 'optex' ? 'OPTEX-FA｜画面の左' : 'お客様｜画面の右'}</span>
              <div style={{fontSize: 38, fontWeight: 900, marginTop: 12, whiteSpace: 'nowrap'}}>{c.fullName && c.fullName !== c.name ? `${c.fullName}さん` : c.name}</div>
              <div style={{fontSize: 24, fontWeight: 800, color: accent, marginTop: 2}}>{c.tagRole}</div>
              <div style={{fontSize: 18, lineHeight: 1.5, marginTop: 10, color: '#3A3F45', height: 108}}>{c.appearance}</div>
              <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 12, borderTop: '2px solid #E3E6EA'}}>
                <Img src={staticFile(c.badgeImage!)} style={{width: 110, height: 122, objectFit: 'contain'}} />
                <div style={{fontSize: 18, lineHeight: 1.5}}>
                  <div style={{fontWeight: 900}}>声：音読さん Beta</div>
                  <div style={{fontWeight: 900}}>「{VOICE[id]}」</div>
                  <div style={{color: '#6A7179'}}>ワイプ（受領画像）</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);
