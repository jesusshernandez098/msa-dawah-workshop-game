import React, { useEffect, useState } from 'react';
import { useServerTimeOffset } from '../hooks/useServerTimeOffset';
import { Timer, Pause } from 'lucide-react';

interface TimerDisplayProps {
  timerStatus: 'running' | 'paused' | 'stopped';
  phaseEndsAt?: number | null;
  timerRemainingSeconds?: number;
  onExpire?: () => void;
  size?: 'normal' | 'large';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timerStatus,
  phaseEndsAt,
  timerRemainingSeconds = 360,
  onExpire,
  size = 'normal',
}) => {
  const serverOffset = useServerTimeOffset();
  const isRunning = timerStatus === 'running' && Boolean(phaseEndsAt);
  const [runningSeconds, setRunningSeconds] = useState<number>(timerRemainingSeconds);

  useEffect(() => {
    if (!isRunning || !phaseEndsAt) return;

    const update = () => {
      const nowServer = Date.now() + serverOffset;
      const diffMs = phaseEndsAt - nowServer;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setRunningSeconds(remaining);

      if (remaining <= 0) {
        onExpire?.();
      }
    };

    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [isRunning, phaseEndsAt, serverOffset, onExpire]);

  const secondsLeft = isRunning ? runningSeconds : timerRemainingSeconds;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isUrgent = secondsLeft <= 60 && secondsLeft > 0;
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={`timer-badge timer-${size} ${isUrgent ? 'is-urgent' : ''} ${
        isExpired ? 'is-expired' : ''
      }`}
      aria-live="polite"
      role="timer"
      aria-label={`Time remaining: ${mins} minutes, ${secs} seconds`}
    >
      {timerStatus === 'paused' ? (
        <Pause className="timer-icon" aria-hidden="true" size={size === 'large' ? 28 : 20} />
      ) : (
        <Timer className="timer-icon" aria-hidden="true" size={size === 'large' ? 28 : 20} />
      )}
      <span className="timer-time">{formatted}</span>
      {timerStatus === 'paused' && <span className="timer-status-tag">PAUSED</span>}
    </div>
  );
};
