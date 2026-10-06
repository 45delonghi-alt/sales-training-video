// 小さな線画アイコン（Scene01 の「商品を紹介する／価格を伝える」カード用）
import React from 'react';
import {C} from '../theme';

export const Icon: React.FC<{name: 'box' | 'price'; size?: number; color?: string}> = ({name, size = 84, color = C.ink}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round">
    {name === 'box' ? (
      <>
        <path d="M24 5 L42 14 L42 34 L24 43 L6 34 L6 14 Z" />
        <path d="M6 14 L24 23 L42 14 M24 23 L24 43" />
      </>
    ) : (
      <>
        <path d="M6 24 L24 6 L42 6 L42 24 L24 42 Z" />
        <circle cx="34" cy="14" r="3" />
        <path d="M17 21 L21 26 L25 21 M21 26 L21 34 M17 28 L25 28 M17 31 L25 31" strokeWidth={2} />
      </>
    )}
  </svg>
);
