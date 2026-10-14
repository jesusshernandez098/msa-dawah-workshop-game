import React, { useEffect, useState, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ensureAnonymousAuth,
  rtdb,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  type User,
} from '../lib/firebase';
import type {
  GamePhase,
  OpeningResult,
  FollowupResult,
  SessionData,
  OpeningSubmission,
  FollowupSubmission,
} from '../types/game';
import { generateGameCode } from '../utils/gameCode';
import { dealCardsForRound } from '../utils/cardDealer';
import {
  calculateLeaderboard,
  calculateRoundVotes,
} from '../utils/scoreCalculator';
import { ROUNDS_DATA } from '../data/gameData';
import { BrandingHeader } from '../components/BrandingHeader';
import { CartoonCharacter } from '../components/CartoonCharacter';
import { TimerDisplay } from '../components/TimerDisplay';
import { DiscussionPointsModal } from '../components/DiscussionPointsModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ReviewSlideshow } from '../components/ReviewSlideshow';
import { LeaderboardTable } from '../components/LeaderboardTable';
import {
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  BookOpen,
  Trophy,
  ArrowRight,
  Maximize,
  Clock,
  Vote,
  Sparkles,
} from 'lucide-react';

const LOCAL_STORAGE_HOST_CODE = 'msa_host_game_code';

export const HostPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [introSecondsLeft, setIntroSecondsLeft] = useState<number>(5);

  // Modals & Dialogs
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState<{ uid: string; name: string } | null>(null);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Prevent double action executions
  const actionLockRef = useRef(false);

  // 1. Authenticate anonymously
  useEffect(() => {
    ensureAnonymousAuth()
      .then((currUser) => {
        setUser(currUser);
        const storedCode = localStorage.getItem(LOCAL_STORAGE_HOST_CODE);
        if (storedCode) {
          setGameCode(storedCode);
        }
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error('Anonymous auth failed:', err);
        setAuthLoading(false);
      });
  }, []);

  // 2. Realtime subscription to session
  useEffect(() => {
    if (!gameCode) return;

    const sessionRef = ref(rtdb, `sessions/${gameCode}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as SessionData;
        setSession(data);
      } else {
        setSession(null);
      }
    });

    return () => unsubscribe();
  }, [gameCode]);

  // Ref to hold the advance callback without capturing stale closures or triggering linter cycles
  const handleAdvanceRef = useRef<() => void>(() => {});

  // 3. Intro 5-second countdown timer
  useEffect(() => {
    if (session?.game?.currentPhase === 'intro') {
      const interval = setInterval(() => {
        setIntroSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAdvanceRef.current();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session?.game?.currentPhase, session?.game?.currentRound]);

  const currentRoundIndex = session?.game?.currentRound ?? 0;
  const currentRoundData = ROUNDS_DATA[currentRoundIndex] || ROUNDS_DATA[0];
  const teamsList = useMemo(() => Object.values(session?.teams || {}), [session?.teams]);

  // Cumulative Leaderboard
  const leaderboard = useMemo(() => {
    return calculateLeaderboard(session?.teams, session?.followupVotes);
  }, [session?.teams, session?.followupVotes]);

  // Helper to execute safe atomic phase transitions
  const executeHostAction = async (action: () => Promise<void>) => {
    if (actionLockRef.current || isPending) return;
    actionLockRef.current = true;
    setIsPending(true);
    try {
      await action();
    } catch (err) {
      console.error('Host action failed:', err);
    } finally {
      actionLockRef.current = false;
      setIsPending(false);
    }
  };

  // Create New Game
  const handleCreateGame = async () => {
    if (!user) return;
    executeHostAction(async () => {
      let code = generateGameCode();
      // Ensure code is unique
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 5) {
        const snap = await get(ref(rtdb, `sessions/${code}`));
        if (!snap.exists()) {
          exists = false;
        } else {
          code = generateGameCode();
          attempts++;
        }
      }

      const initialSession: SessionData = {
        hostUid: user.uid,
        createdAt: Date.now(),
        lobbyLocked: false,
        game: {
          currentRound: 0,
          currentPhase: 'lobby',
          phaseStartedAt: Date.now(),
          phaseEndsAt: null,
          timerStatus: 'stopped',
          timerRemainingSeconds: 360,
          submissionsOpen: false,
          votingOpen: false,
        },
      };

      await set(ref(rtdb, `sessions/${code}`), initialSession);
      localStorage.setItem(LOCAL_STORAGE_HOST_CODE, code);
      setGameCode(code);
    });
  };

  // Start Game from Lobby
  const handleStartGame = () => {
    if (!gameCode || teamsList.length < 2) return;
    executeHostAction(async () => {
      const teamIds = teamsList.map((t) => t.id);
      const deals = dealCardsForRound(0, teamIds);

      await update(ref(rtdb, `sessions/${gameCode}`), {
        lobbyLocked: true,
        'deals/0': deals,
        'game/currentRound': 0,
        'game/currentPhase': 'intro',
        'game/phaseStartedAt': Date.now(),
        'game/phaseEndsAt': Date.now() + 5000,
        'game/submissionsOpen': false,
        'game/votingOpen': false,
      });
    });
  };

  // Advance from Intro to opening_select
  const handleAdvanceFromIntro = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'opening_select',
        phaseStartedAt: Date.now(),
        submissionsOpen: true,
        votingOpen: false,
      });
    });
  };

  useEffect(() => {
    handleAdvanceRef.current = handleAdvanceFromIntro;
  });

  // Replay 5-second intro
  const handleReplayIntro = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'intro',
        phaseStartedAt: Date.now(),
        phaseEndsAt: Date.now() + 5000,
        submissionsOpen: false,
        votingOpen: false,
      });
    });
  };

  // Opening Submissions Controls
  const handleToggleSubmissions = (isOpen: boolean) => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        submissionsOpen: isOpen,
      });
    });
  };

  const handleBeginOpeningReview = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'opening_review',
        submissionsOpen: false,
      });
    });
  };

  const handleBeginOpeningVoting = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'opening_vote',
        submissionsOpen: false,
        votingOpen: true,
      });
    });
  };

  // Close Opening Voting and handle Winner / Tie
  const handleCloseOpeningVoting = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      const submissions = session?.openingSubmissions?.[currentRoundIndex] || {};
      const votes = session?.openingVotes?.[currentRoundIndex] || {};
      const candidateUids = Object.keys(submissions);

      const totals = calculateRoundVotes(votes, candidateUids);

      if (totals.isTie && totals.topUids.length > 1) {
        // Need host tiebreak
        const pendingResult: OpeningResult = {
          winningTeamUid: '',
          winningTeamName: '',
          winningCardText: '',
          winningCardId: '',
          voteCounts: totals.counts,
          tiedUids: totals.topUids,
          isTieResolved: false,
        };
        await update(ref(rtdb, `sessions/${gameCode}`), {
          [`openingResults/${currentRoundIndex}`]: pendingResult,
          'game/currentPhase': 'opening_result',
          'game/votingOpen': false,
        });
      } else {
        const winnerUid = totals.topUids[0] || candidateUids[0];
        const winnerSub = submissions[winnerUid];
        const result: OpeningResult = {
          winningTeamUid: winnerUid,
          winningTeamName: winnerSub?.teamName || 'Unknown Team',
          winningCardText: winnerSub?.cardText || '',
          winningCardId: winnerSub?.cardId || '',
          voteCounts: totals.counts,
          isTieResolved: true,
        };
        await update(ref(rtdb, `sessions/${gameCode}`), {
          [`openingResults/${currentRoundIndex}`]: result,
          'game/currentPhase': 'opening_result',
          'game/votingOpen': false,
        });
      }
    });
  };

  const handleSelectOpeningTieWinner = (winnerUid: string) => {
    if (!gameCode) return;
    executeHostAction(async () => {
      const submissions = session?.openingSubmissions?.[currentRoundIndex] || {};
      const winnerSub = submissions[winnerUid];
      const existingResult = session?.openingResults?.[currentRoundIndex];

      const resolvedResult: OpeningResult = {
        winningTeamUid: winnerUid,
        winningTeamName: winnerSub?.teamName || 'Unknown Team',
        winningCardText: winnerSub?.cardText || '',
        winningCardId: winnerSub?.cardId || '',
        voteCounts: existingResult?.voteCounts || {},
        isTieResolved: true,
      };

      await set(ref(rtdb, `sessions/${gameCode}/openingResults/${currentRoundIndex}`), resolvedResult);
    });
  };

  // Follow-up Phase Transitions
  const handleRevealFollowup = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'followup_prompt',
      });
    });
  };

  const handleStartFollowupWork = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      const now = Date.now();
      const sixMinutesMs = 6 * 60 * 1000;
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'followup_work',
        phaseStartedAt: now,
        phaseEndsAt: now + sixMinutesMs,
        timerStatus: 'running',
        timerRemainingSeconds: 360,
        submissionsOpen: true,
      });
    });
  };

  // Timer Controls
  const handlePauseTimer = () => {
    if (!gameCode || !session?.game?.phaseEndsAt) return;
    executeHostAction(async () => {
      const remaining = Math.max(
        0,
        Math.ceil((session.game.phaseEndsAt! - Date.now()) / 1000)
      );
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        timerStatus: 'paused',
        timerRemainingSeconds: remaining,
        phaseEndsAt: null,
      });
    });
  };

  const handleResumeTimer = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      const remainingSecs = session?.game?.timerRemainingSeconds ?? 360;
      const now = Date.now();
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        timerStatus: 'running',
        phaseEndsAt: now + remainingSecs * 1000,
      });
    });
  };

  const handleAddOneMinute = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      if (session?.game?.timerStatus === 'running' && session?.game?.phaseEndsAt) {
        await update(ref(rtdb, `sessions/${gameCode}/game`), {
          phaseEndsAt: session.game.phaseEndsAt + 60 * 1000,
        });
      } else {
        const curr = session?.game?.timerRemainingSeconds ?? 0;
        await update(ref(rtdb, `sessions/${gameCode}/game`), {
          timerRemainingSeconds: curr + 60,
        });
      }
    });
  };

  const handleCloseFollowupSubmissions = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        submissionsOpen: false,
        timerStatus: 'stopped',
      });
    });
  };

  const handleBeginFollowupReview = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'followup_review',
        submissionsOpen: false,
        timerStatus: 'stopped',
      });
    });
  };

  const handleBeginFollowupVoting = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/game`), {
        currentPhase: 'followup_vote',
        submissionsOpen: false,
        votingOpen: true,
      });
    });
  };

  const handleCloseFollowupVoting = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      const submissions = session?.followupSubmissions?.[currentRoundIndex] || {};
      const votes = session?.followupVotes?.[currentRoundIndex] || {};
      const candidateUids = Object.keys(submissions);

      const totals = calculateRoundVotes(votes, candidateUids);

      const result: FollowupResult = {
        voteCounts: totals.counts,
        roundWinnerUids: totals.topUids,
        isTieResolved: !totals.isTie,
      };

      await update(ref(rtdb, `sessions/${gameCode}`), {
        [`followupResults/${currentRoundIndex}`]: result,
        'game/currentPhase': 'followup_result',
        'game/votingOpen': false,
      });
    });
  };

  const handleAcknowledgeDiscussionWinner = (winnerUid: string) => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await update(ref(rtdb, `sessions/${gameCode}/followupResults/${currentRoundIndex}`), {
        discussionWinnerUid: winnerUid,
        isTieResolved: true,
      });
    });
  };

  // Advance to Next Round or Final Results
  const handleAdvanceNextRound = () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      if (currentRoundIndex < 6) {
        const nextRound = currentRoundIndex + 1;
        const teamIds = teamsList.map((t) => t.id);
        const deals = dealCardsForRound(nextRound, teamIds);

        await update(ref(rtdb, `sessions/${gameCode}`), {
          [`deals/${nextRound}`]: deals,
          'game/currentRound': nextRound,
          'game/currentPhase': 'intro',
          'game/phaseStartedAt': Date.now(),
          'game/phaseEndsAt': Date.now() + 5000,
          'game/submissionsOpen': false,
          'game/votingOpen': false,
        });
      } else {
        await update(ref(rtdb, `sessions/${gameCode}/game`), {
          currentPhase: 'final_results',
        });
      }
    });
  };

  // Remove a Team
  const handleRemoveTeam = (teamUid: string) => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await remove(ref(rtdb, `sessions/${gameCode}/teams/${teamUid}`));
      setTeamToRemove(null);
    });
  };

  // End and Delete Session
  const handleDeleteSession = async () => {
    if (!gameCode) return;
    executeHostAction(async () => {
      await remove(ref(rtdb, `sessions/${gameCode}`));
      localStorage.removeItem(LOCAL_STORAGE_HOST_CODE);
      setGameCode(null);
      setSession(null);
      setIsResetConfirmOpen(false);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (authLoading) {
    return (
      <div className="host-loading-screen">
        <p>Connecting facilitator credentials...</p>
      </div>
    );
  }

  // Not in a game session yet
  if (!gameCode || !session) {
    return (
      <div className="app-container">
        <BrandingHeader isHost subtitle="Facilitator Control Panel" />
        <main className="main-content">
          <div className="host-setup-card">
            <h2>Facilitator Game Setup</h2>
            <p className="host-setup-text">
              Create a new multiplayer session to project on the main screen. You can control rounds, display questions, review team cards, and synchronize the 6-minute writing timer.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleCreateGame}
              disabled={isPending}
            >
              <Sparkles size={22} /> Create New Game Session
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Check if current user is indeed host
  if (user && session.hostUid !== user.uid) {
    return (
      <div className="app-container">
        <BrandingHeader isHost />
        <main className="main-content">
          <div className="host-setup-card">
            <h2>Session Access Denied</h2>
            <p>You are not the designated facilitator for session {gameCode}.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem(LOCAL_STORAGE_HOST_CODE);
                setGameCode(null);
                setSession(null);
              }}
            >
              Start New Host Session
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currentPhase: GamePhase = session.game.currentPhase;
  const openingSubmissions = session.openingSubmissions?.[currentRoundIndex] || {};
  const openingVotes = session.openingVotes?.[currentRoundIndex] || {};
  const openingResult = session.openingResults?.[currentRoundIndex];
  const followupSubmissions = session.followupSubmissions?.[currentRoundIndex] || {};
  const followupVotes = session.followupVotes?.[currentRoundIndex] || {};
  const followupResult = session.followupResults?.[currentRoundIndex];

  const openingSubmittedCount = Object.keys(openingSubmissions).length;
  const openingVotedCount = Object.keys(openingVotes).length;
  const followupSubmittedCount = Object.keys(followupSubmissions).length;
  const followupVotedCount = Object.keys(followupVotes).length;

  const joinUrl = `${window.location.origin}${window.location.pathname}#/play?game=${gameCode}`;

  return (
    <div className={`app-container ${isFullscreen ? 'projector-fullscreen' : ''}`}>
      <BrandingHeader gameCode={gameCode} isHost subtitle={`Round ${currentRoundIndex + 1} of 7`} />

      {/* Host Global Top Bar */}
      <div className="host-action-bar">
        <div className="host-status-badges">
          <span className="badge-round">Round {currentRoundIndex + 1} of 7</span>
          <span className="badge-phase">Phase: {currentPhase.replace('_', ' ').toUpperCase()}</span>
          <span className="badge-teams">
            <Users size={16} /> {teamsList.length} Teams
          </span>
        </div>

        <div className="host-quick-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowLeaderboardModal(true)}
          >
            <Trophy size={16} /> Current Standings
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleFullscreen}
            aria-label="Toggle Projector Fullscreen"
          >
            <Maximize size={16} /> {isFullscreen ? 'Exit Fullscreen' : 'Projector Mode'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            <RotateCcw size={16} /> Reset / Delete
          </button>
        </div>
      </div>

      <main className="main-content host-main-view">
        {/* PHASE 1: LOBBY */}
        {currentPhase === 'lobby' && (
          <div className="host-lobby-screen">
            <div className="lobby-top-hero">
              <div className="lobby-code-display">
                <span className="lobby-code-eyebrow">JOIN GAME AT</span>
                <span className="lobby-game-code">{gameCode}</span>
                <p className="lobby-join-url">{joinUrl}</p>
              </div>

              <div className="lobby-qr-container">
                <QRCodeSVG
                  value={joinUrl}
                  size={200}
                  level="M"
                  includeMargin
                  className="lobby-qr-code"
                />
                <span className="qr-hint">Scan with mobile camera</span>
              </div>
            </div>

            <div className="lobby-teams-panel">
              <div className="lobby-teams-header">
                <h2>Joined Teams ({teamsList.length})</h2>
                <p className="lobby-teams-instruction">
                  Require at least 2 teams. All teams must mark themselves &quot;Ready&quot; to begin.
                </p>
              </div>

              {teamsList.length === 0 ? (
                <div className="empty-teams-box">
                  <p>Waiting for participants to scan the QR code and join...</p>
                </div>
              ) : (
                <div className="lobby-teams-grid">
                  {teamsList.map((t) => (
                    <div key={t.id} className="lobby-team-pill">
                      <div className="team-pill-name">
                        <strong>{t.name}</strong>
                      </div>
                      <div className="team-pill-status">
                        {t.isReady ? (
                          <span className="status-ready">
                            <CheckCircle2 size={16} /> Ready
                          </span>
                        ) : (
                          <span className="status-waiting">Reading instructions...</span>
                        )}
                        <button
                          type="button"
                          className="btn-remove-team"
                          onClick={() => setTeamToRemove({ uid: t.id, name: t.name })}
                          title={`Remove ${t.name}`}
                          aria-label={`Remove team ${t.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="lobby-start-action">
                {(() => {
                  const hasEnough = teamsList.length >= 2;
                  const allReady = teamsList.length > 0 && teamsList.every((t) => t.isReady);
                  const canStart = hasEnough && allReady;

                  return (
                    <div className="start-button-group">
                      <button
                        type="button"
                        className="btn btn-accent btn-large"
                        disabled={!canStart || isPending}
                        onClick={handleStartGame}
                      >
                        <Play size={24} /> Start Game (Round 1)
                      </button>
                      {!hasEnough && (
                        <p className="lobby-status-note">Need at least 2 teams to begin.</p>
                      )}
                      {hasEnough && !allReady && (
                        <p className="lobby-status-note">Waiting for all teams to click &quot;We&apos;re Ready&quot;.</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: 5-SECOND INTRO */}
        {currentPhase === 'intro' && (
          <div className="host-intro-view">
            <div className="intro-timer-banner">
              <span className="intro-countdown-pill">Card selection starts in {introSecondsLeft}s</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAdvanceFromIntro}
              >
                Skip to Cards <ArrowRight size={16} />
              </button>
            </div>

            <CartoonCharacter
              roundNumber={currentRoundIndex + 1}
              questionText={currentRoundData.openingQuestion}
            />
          </div>
        )}

        {/* PHASE 3: OPENING SELECT */}
        {currentPhase === 'opening_select' && (
          <div className="host-opening-select-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Opening Question</span>
              <h2 className="round-question-text">{currentRoundData.openingQuestion}</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm replay-intro-btn"
                onClick={handleReplayIntro}
              >
                <RotateCcw size={16} /> Replay Intro
              </button>
            </div>

            <div className="submissions-status-card">
              <div className="progress-info">
                <h3>Submissions: {openingSubmittedCount} of {teamsList.length} Teams</h3>
                <p>Teams are reading their 3 cards and submitting one answer.</p>
              </div>

              <div className="host-phase-controls">
                {session.game.submissionsOpen ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleSubmissions(false)}
                  >
                    Close Submissions
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleSubmissions(true)}
                  >
                    Reopen Submissions
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBeginOpeningReview}
                  disabled={openingSubmittedCount === 0}
                >
                  Review Submitted Cards <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={handleBeginOpeningVoting}
                  disabled={openingSubmittedCount === 0}
                >
                  <Vote size={18} /> Start Voting
                </button>
              </div>
            </div>

            <ReviewSlideshow
              title="Submitted Cards"
              subtitle="Incoming answers appear in real time"
              emptyMessage="Waiting for teams to submit cards..."
              items={Object.values(openingSubmissions).map((sub: OpeningSubmission) => ({
                id: sub.teamUid,
                teamUid: sub.teamUid,
                teamName: sub.teamName,
                content: sub.cardText,
              }))}
            />
          </div>
        )}

        {/* PHASE 4: OPENING REVIEW */}
        {currentPhase === 'opening_review' && (
          <div className="host-opening-review-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Opening Question</span>
              <h2 className="round-question-text">{currentRoundData.openingQuestion}</h2>
            </div>

            <div className="review-action-bar">
              <span>{openingSubmittedCount} of {teamsList.length} teams submitted</span>
              <button
                type="button"
                className="btn btn-accent btn-large"
                onClick={handleBeginOpeningVoting}
              >
                <Vote size={20} /> Begin Opening Voting
              </button>
            </div>

            <ReviewSlideshow
              title="Reviewing Opening Cards"
              subtitle="Display cards to classroom before voting begins"
              items={Object.values(openingSubmissions).map((sub: OpeningSubmission) => ({
                id: sub.teamUid,
                teamUid: sub.teamUid,
                teamName: sub.teamName,
                content: sub.cardText,
              }))}
            />
          </div>
        )}

        {/* PHASE 5: OPENING VOTE */}
        {currentPhase === 'opening_vote' && (
          <div className="host-opening-vote-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Opening Voting</span>
              <h2 className="round-question-text">{currentRoundData.openingQuestion}</h2>
              <p className="opening-rule-reminder">
                Remember: Opening votes do not count toward the final leaderboard! Vote for your favorite answer.
              </p>
            </div>

            <div className="voting-progress-box">
              <div className="voting-progress-info">
                <h3>Votes Cast: {openingVotedCount} of {teamsList.length} Teams</h3>
                <p>Votes are kept hidden to prevent bandwagoning until voting is closed.</p>
              </div>
              <button
                type="button"
                className="btn btn-accent btn-large"
                onClick={handleCloseOpeningVoting}
                disabled={isPending}
              >
                Close Voting & Reveal Winner
              </button>
            </div>

            <div className="candidate-cards-grid">
              {Object.values(openingSubmissions).map((sub: OpeningSubmission) => (
                <div key={sub.teamUid} className="candidate-preview-card">
                  <span className="team-badge">{sub.teamName}</span>
                  <p className="card-text">{sub.cardText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 6: OPENING RESULT */}
        {currentPhase === 'opening_result' && (
          <div className="host-opening-result-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Opening Winner</span>
              <h2 className="round-question-text">{currentRoundData.openingQuestion}</h2>
              <div className="vote-exclusion-pill">
                Opening votes do not count toward the final rankings.
              </div>
            </div>

            {/* Tie resolution if needed */}
            {!openingResult?.isTieResolved && openingResult?.tiedUids && openingResult.tiedUids.length > 1 ? (
              <div className="tiebreak-panel">
                <h3 className="tiebreak-title">We have a tie! Select the round winner:</h3>
                <p className="tiebreak-instruction">Choose which card will set the scenario for the written follow-up:</p>
                <div className="tied-cards-grid">
                  {openingResult.tiedUids.map((uid) => {
                    const sub = openingSubmissions[uid];
                    return (
                      <div
                        key={uid}
                        className="tied-card-choice"
                        onClick={() => handleSelectOpeningTieWinner(uid)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSelectOpeningTieWinner(uid);
                        }}
                      >
                        <span className="team-badge">{sub?.teamName}</span>
                        <p className="card-text">{sub?.cardText}</p>
                        <button type="button" className="btn btn-accent btn-sm">
                          Select as Winner
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="winner-announcement-card">
                <span className="winner-label">
                  <Trophy size={20} /> Winning Opening Card
                </span>
                <h3 className="winner-team-name">{openingResult?.winningTeamName}</h3>
                <p className="winner-card-text">“{openingResult?.winningCardText}”</p>
                <div className="winner-action-bar">
                  <button
                    type="button"
                    className="btn btn-accent btn-large"
                    onClick={handleRevealFollowup}
                  >
                    Proceed to Follow-up Scenario <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE 7: FOLLOW-UP PROMPT */}
        {currentPhase === 'followup_prompt' && (
          <div className="host-followup-prompt-view">
            <div className="scenario-context-card">
              <span className="scenario-eyebrow">Round {currentRoundIndex + 1} • The Setup</span>
              <div className="context-item">
                <span className="context-label">Original Question:</span>
                <p className="context-quote">“{currentRoundData.openingQuestion}”</p>
              </div>
              <div className="context-item">
                <span className="context-label">Your Initial Opening ({openingResult?.winningTeamName}):</span>
                <p className="context-quote">“{openingResult?.winningCardText}”</p>
              </div>
            </div>

            <div className="followup-question-card">
              <span className="followup-badge">The Follow-up Question</span>
              <h2 className="followup-question-title">{currentRoundData.followupQuestion}</h2>
              <p className="followup-instruction">
                Now the questioner pushes further! Teams have <strong>6 minutes</strong> to collaborate and write a thoughtful, articulate response.
              </p>
              <div className="followup-start-btn">
                <button
                  type="button"
                  className="btn btn-accent btn-large"
                  onClick={handleStartFollowupWork}
                >
                  <Clock size={22} /> Start 6-Minute Writing Timer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 8: FOLLOW-UP WORK (6-MIN TIMER) */}
        {currentPhase === 'followup_work' && (
          <div className="host-followup-work-view">
            <div className="followup-work-header">
              <div>
                <span className="round-eyebrow">Round {currentRoundIndex + 1} • Collaboration in Progress</span>
                <h2 className="followup-prompt-h2">{currentRoundData.followupQuestion}</h2>
              </div>
              <TimerDisplay
                timerStatus={session.game.timerStatus}
                phaseEndsAt={session.game.phaseEndsAt}
                timerRemainingSeconds={session.game.timerRemainingSeconds}
                size="large"
              />
            </div>

            {/* Timer controls */}
            <div className="timer-controls-card">
              <div className="timer-controls-group">
                {session.game.timerStatus === 'running' ? (
                  <button type="button" className="btn btn-secondary" onClick={handlePauseTimer}>
                    Pause Timer
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={handleResumeTimer}>
                    Resume Timer
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={handleAddOneMinute}>
                  +1 Minute
                </button>
                {session.game.submissionsOpen ? (
                  <button type="button" className="btn btn-secondary" onClick={handleCloseFollowupSubmissions}>
                    Close Submissions Early
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleToggleSubmissions(true)}
                  >
                    Reopen Submissions
                  </button>
                )}
              </div>

              <div className="work-progress-count">
                <span>{followupSubmittedCount} of {teamsList.length} Written Responses Received</span>
              </div>

              <div className="timer-next-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBeginFollowupReview}
                  disabled={followupSubmittedCount === 0}
                >
                  Review Written Answers <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={handleBeginFollowupVoting}
                  disabled={followupSubmittedCount === 0}
                >
                  <Vote size={18} /> Start Voting
                </button>
              </div>
            </div>

            <ReviewSlideshow
              title="Live Written Responses"
              subtitle="Responses update as teams edit and submit"
              emptyMessage="Teams are actively writing their responses..."
              items={Object.values(followupSubmissions).map((sub: FollowupSubmission) => ({
                id: sub.teamUid,
                teamUid: sub.teamUid,
                teamName: sub.teamName,
                content: sub.text,
              }))}
            />
          </div>
        )}

        {/* PHASE 9: FOLLOW-UP REVIEW */}
        {currentPhase === 'followup_review' && (
          <div className="host-followup-review-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Reviewing Written Answers</span>
              <h2 className="round-question-text">{currentRoundData.followupQuestion}</h2>
            </div>

            <div className="review-action-bar">
              <span>{followupSubmittedCount} of {teamsList.length} responses ready</span>
              <button
                type="button"
                className="btn btn-accent btn-large"
                onClick={handleBeginFollowupVoting}
              >
                <Vote size={20} /> Begin Follow-up Voting
              </button>
            </div>

            <ReviewSlideshow
              title="Written Responses Slideshow"
              subtitle="Display each team's full written answer to the classroom"
              items={Object.values(followupSubmissions).map((sub: FollowupSubmission) => ({
                id: sub.teamUid,
                teamUid: sub.teamUid,
                teamName: sub.teamName,
                content: sub.text,
              }))}
            />
          </div>
        )}

        {/* PHASE 10: FOLLOW-UP VOTE */}
        {currentPhase === 'followup_vote' && (
          <div className="host-followup-vote-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} • Follow-up Voting</span>
              <h2 className="round-question-text">{currentRoundData.followupQuestion}</h2>
              <div className="vote-official-banner">
                Follow-up votes count directly toward the final workshop leaderboard!
              </div>
            </div>

            <div className="voting-progress-box">
              <div className="voting-progress-info">
                <h3>Votes Cast: {followupVotedCount} of {teamsList.length} Teams</h3>
                <p>Teams are reading and voting for the most thoughtful response.</p>
              </div>
              <button
                type="button"
                className="btn btn-accent btn-large"
                onClick={handleCloseFollowupVoting}
                disabled={isPending}
              >
                Close Voting & Reveal Results
              </button>
            </div>

            <div className="candidate-cards-grid">
              {Object.values(followupSubmissions).map((sub: FollowupSubmission) => (
                <div key={sub.teamUid} className="candidate-preview-card">
                  <span className="team-badge">{sub.teamName}</span>
                  <p className="card-text">{sub.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE 11: FOLLOW-UP RESULT */}
        {currentPhase === 'followup_result' && (
          <div className="host-followup-result-view">
            <div className="round-header-box">
              <span className="round-eyebrow">Round {currentRoundIndex + 1} Results</span>
              <h2 className="round-question-text">{currentRoundData.followupQuestion}</h2>
            </div>

            <div className="results-breakdown-card">
              <div className="results-card-header">
                <h3>Votes Received This Round</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDiscussionOpen(true)}
                >
                  <BookOpen size={18} /> Possible Discussion Points
                </button>
              </div>

              <div className="results-votes-list">
                {Object.entries(followupSubmissions).map(([uid, sub]: [string, FollowupSubmission]) => {
                  const votes = followupResult?.voteCounts?.[uid] || 0;
                  const isTop = followupResult?.roundWinnerUids?.includes(uid);
                  return (
                    <div key={uid} className={`result-vote-row ${isTop ? 'is-winner' : ''}`}>
                      <div className="result-row-info">
                        <span className="team-name">{sub.teamName}</span>
                        <p className="result-snippet">“{sub.text}”</p>
                      </div>
                      <div className="result-row-votes">
                        <span className="vote-badge">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                        {isTop && <span className="winner-tag">Round Leader</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tie discussion acknowledgement */}
              {followupResult?.roundWinnerUids && followupResult.roundWinnerUids.length > 1 && (
                <div className="tie-acknowledgement-box">
                  <p>
                    <strong>Tied Round:</strong> Multiple teams earned equal top votes this round. You can acknowledge one as the discussion highlight or proceed with shared honors (no artificial votes are invented).
                  </p>
                  <div className="tie-ack-options">
                    {followupResult.roundWinnerUids.map((uid) => (
                      <button
                        key={uid}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAcknowledgeDiscussionWinner(uid)}
                      >
                        Acknowledge {followupSubmissions[uid]?.teamName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="advance-round-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowLeaderboardModal(true)}
              >
                <Trophy size={18} /> View Cumulative Leaderboard
              </button>
              <button
                type="button"
                className="btn btn-accent btn-large"
                onClick={handleAdvanceNextRound}
                disabled={isPending}
              >
                {currentRoundIndex < 6 ? (
                  <>Advance to Round {currentRoundIndex + 2} <ArrowRight size={20} /></>
                ) : (
                  <>View Final Results & Podium <Trophy size={20} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PHASE 12: FINAL RESULTS */}
        {currentPhase === 'final_results' && (
          <div className="host-final-results-view">
            <div className="final-celebration-hero">
              <Trophy size={48} className="trophy-hero-icon" />
              <h1 className="final-title">Workshop Complete!</h1>
              <p className="final-subtitle">
                Official standings based on total written follow-up votes across all 7 rounds.
              </p>
            </div>

            {/* Podium (1st, 2nd, 3rd) */}
            <div className="podium-grid">
              {leaderboard[1] && (
                <div className="podium-step step-2">
                  <div className="podium-medal">2nd</div>
                  <h3 className="podium-team">{leaderboard[1].teamName}</h3>
                  <span className="podium-votes">{leaderboard[1].totalVotes} votes</span>
                </div>
              )}

              {leaderboard[0] && (
                <div className="podium-step step-1">
                  <div className="podium-medal">1st</div>
                  <h3 className="podium-team">{leaderboard[0].teamName}</h3>
                  <span className="podium-votes">{leaderboard[0].totalVotes} votes</span>
                </div>
              )}

              {leaderboard[2] && (
                <div className="podium-step step-3">
                  <div className="podium-medal">3rd</div>
                  <h3 className="podium-team">{leaderboard[2].teamName}</h3>
                  <span className="podium-votes">{leaderboard[2].totalVotes} votes</span>
                </div>
              )}
            </div>

            <LeaderboardTable entries={leaderboard} />

            <div className="final-actions-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={toggleFullscreen}
              >
                <Maximize size={18} /> {isFullscreen ? 'Exit Fullscreen' : 'Projector Fullscreen'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setIsResetConfirmOpen(true)}
              >
                <Trash2 size={18} /> End & Delete Session
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Facilitator Discussion Points Modal */}
      <DiscussionPointsModal
        isOpen={isDiscussionOpen}
        onClose={() => setIsDiscussionOpen(false)}
        roundNumber={currentRoundIndex + 1}
        followupQuestion={currentRoundData.followupQuestion}
        discussionPoints={currentRoundData.discussionPoints}
      />

      {/* Reset / Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Delete Game Session?"
        message="This will immediately remove the session from Firebase and end the game for all connected teams. This action cannot be undone."
        confirmLabel="Yes, Delete Session"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleDeleteSession}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Remove Team Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teamToRemove)}
        title="Remove Team?"
        message={`Are you sure you want to remove team "${teamToRemove?.name}" from this session?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => teamToRemove && handleRemoveTeam(teamToRemove.uid)}
        onCancel={() => setTeamToRemove(null)}
      />

      {/* Mid-Game Leaderboard Modal */}
      {showLeaderboardModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowLeaderboardModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <Trophy size={24} />
                <h2 className="modal-title">Cumulative Leaderboard</h2>
              </div>
              <button
                type="button"
                className="modal-close-button"
                onClick={() => setShowLeaderboardModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <LeaderboardTable entries={leaderboard} />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowLeaderboardModal(false)}
              >
                Close Standings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
