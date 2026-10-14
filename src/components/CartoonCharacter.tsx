import React from 'react';

interface CartoonCharacterProps {
  questionText: string;
  roundNumber: number;
}

export const CartoonCharacter: React.FC<CartoonCharacterProps> = ({
  questionText,
  roundNumber,
}) => {
  return (
    <div className="cartoon-intro-container" role="region" aria-label="Question Introduction">
      {/* Speech bubble */}
      <div className="speech-bubble-wrapper">
        <div className="speech-bubble-badge">
          Round {roundNumber}
        </div>
        <div className="speech-bubble">
          <p className="speech-question-text">{questionText}</p>
        </div>
        <div className="speech-tail" aria-hidden="true" />
      </div>

      {/* Neutral, friendly cartoon character illustration */}
      <div className="cartoon-figure-wrapper" aria-hidden="true">
        <svg
          viewBox="0 0 160 180"
          className="cartoon-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow */}
          <ellipse cx="80" cy="172" rx="46" ry="7" fill="#173454" fillOpacity="0.12" />

          {/* Torso / Sweater */}
          <path
            d="M44 140 C44 116 54 104 80 104 C106 104 116 116 116 140 L118 170 L42 170 Z"
            fill="#2E5E8C"
          />
          {/* Collar */}
          <path
            d="M68 104 L80 120 L92 104 Z"
            fill="#FFF7EB"
          />

          {/* Neck */}
          <rect x="73" y="90" width="14" height="18" rx="4" fill="#F3CF7A" />

          {/* Head */}
          <circle cx="80" cy="62" r="34" fill="#F3CF7A" />

          {/* Hair - modern neutral short curls */}
          <path
            d="M48 60 C46 36 60 26 80 26 C100 26 114 36 112 60 C110 42 100 34 80 34 C60 34 50 42 48 60 Z"
            fill="#173454"
          />
          <circle cx="56" cy="36" r="10" fill="#173454" />
          <circle cx="72" cy="30" r="11" fill="#173454" />
          <circle cx="88" cy="30" r="11" fill="#173454" />
          <circle cx="104" cy="36" r="10" fill="#173454" />

          {/* Glasses frame */}
          <rect
            x="58"
            y="52"
            width="18"
            height="14"
            rx="4"
            stroke="#173454"
            strokeWidth="3.5"
            fill="#FFF7EB"
            fillOpacity="0.85"
          />
          <rect
            x="84"
            y="52"
            width="18"
            height="14"
            rx="4"
            stroke="#173454"
            strokeWidth="3.5"
            fill="#FFF7EB"
            fillOpacity="0.85"
          />
          {/* Glasses bridge */}
          <line x1="76" y1="58" x2="84" y2="58" stroke="#173454" strokeWidth="3.5" />

          {/* Eyes (happy dots inside glasses) */}
          <circle cx="67" cy="59" r="2.5" fill="#173454" />
          <circle cx="93" cy="59" r="2.5" fill="#173454" />

          {/* Cheerful blush */}
          <circle cx="55" cy="68" r="5" fill="#D47A50" fillOpacity="0.35" />
          <circle cx="105" cy="68" r="5" fill="#D47A50" fillOpacity="0.35" />

          {/* Open mouth / speaking expression */}
          <path
            d="M74 76 Q80 84 86 76 Z"
            fill="#D47A50"
            stroke="#173454"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
};
