'use client';

import React from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  leftPercent: number; // Posición horizontal aleatoria
}

interface ReactionsOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ reactions }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {reactions.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-20 text-3xl sm:text-4xl animate-float-reaction select-none"
          style={{
            left: `${item.leftPercent}%`,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};
