// 社名マーク：社内テンプレートと同じ「赤い斜線＋OPTEX FA」
import React from 'react';
import {C} from '../theme';

export const BrandMark: React.FC<{size: number; color?: string}> = ({size, color = '#5A5D63'}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.32}}>
    <svg width={size * 0.62} height={size * 1.1} viewBox="0 0 31 55" style={{flex: 'none'}}>
      <path d="M 18 0 L 31 0 L 13 55 L 0 55 Z" fill={C.red} />
    </svg>
    <div
      style={{
        fontFamily: '"Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
        fontSize: size,
        fontWeight: 400,
        letterSpacing: size * 0.02,
        color,
        lineHeight: 1,
      }}
    >
      OPTEX FA
    </div>
  </div>
);
