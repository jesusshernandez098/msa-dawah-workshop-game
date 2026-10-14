import React from 'react';

interface CardViewProps {
  text: string;
  subTitle?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  badge?: string;
  size?: 'normal' | 'large' | 'compact';
  ariaLabel?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  text,
  subTitle,
  selected = false,
  disabled = false,
  onClick,
  badge,
  size = 'normal',
  ariaLabel,
}) => {
  const isInteractive = Boolean(onClick) && !disabled;

  return (
    <div
      role={isInteractive ? 'button' : 'article'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? selected : undefined}
      aria-label={ariaLabel || text}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`game-card card-${size} ${selected ? 'is-selected' : ''} ${
        isInteractive ? 'is-interactive' : ''
      } ${disabled ? 'is-disabled' : ''}`}
    >
      {badge && <span className="card-badge">{badge}</span>}
      <div className="card-body">
        <p className="card-text">{text}</p>
      </div>
      {subTitle && (
        <div className="card-footer">
          <span className="card-subtitle">{subTitle}</span>
        </div>
      )}
    </div>
  );
};
