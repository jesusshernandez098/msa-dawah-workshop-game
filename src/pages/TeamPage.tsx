import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ensureAnonymousAuth,
  rtdb,
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  type User,
} from '../lib/firebase';
import type {
  Card,
  GamePhase,
  OpeningSubmission,
  FollowupSubmission,
  SessionData,
  OpeningVote,
  FollowupVote,
} from '../types/game';
import { validateTeamName, validateWrittenResponse } from '../utils/validation';
import { calculateLeaderboard } from '../utils/scoreCalculator';
import { ROUNDS_DATA } from '../data/gameData';
import { BrandingHeader } from '../components/BrandingHeader';
import { CardView } from '../components/CardView';
import { TimerDisplay } from '../components/TimerDisplay';
import { CartoonCharacter } from '../components/CartoonCharacter';
import { LeaderboardTable } from '../components/LeaderboardTable';
import {
  CheckCircle2,
  Clock,
  Send,
  Trophy,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const LOCAL_STORAGE_TEAM_CODE = 'msa_team_game_code';
const LOCAL_STORAGE_TEAM_NAME = 'msa_team_name';

export const TeamPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Connection & Game State
  const [gameCode, setGameCode] = useState<string>('');
  const [session, setSession] = useState<SessionData | null>(null);
  const [hasReceivedSession, setHasReceivedSession] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Team Registration
  const [teamNameInput, setTeamNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // In-Game Team State
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedVoteUid, setSelectedVoteUid] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionLockRef = useRef(false);

  // 1. Authenticate anonymously
  useEffect(() => {
    ensureAnonymousAuth()
      .then((currUser) => {
        setUser(currUser);
        const codeParam = searchParams.get('game')?.toUpperCase().trim() || localStorage.getItem(LOCAL_STORAGE_TEAM_CODE) || '';
        if (codeParam) {
          setGameCode(codeParam);
        }
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error('Anonymous auth failed:', err);
        setAuthLoading(false);
      });
  }, [searchParams]);

  // 2. Realtime subscription to session
  useEffect(() => {
    if (!gameCode) return;

    const sessionRef = ref(rtdb, `sessions/${gameCode}`);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      setHasReceivedSession(true);
      if (snapshot.exists()) {
        const data = snapshot.val() as SessionData;
        setSession(data);
        setJoinError(null);
      } else {
        setSession(null);
        setJoinError(`Game code "${gameCode}" was not found. Please check with your facilitator.`);
      }
    });

    return () => unsubscribe();
  }, [gameCode]);

  // 3. Setup onDisconnect connection tracking
  useEffect(() => {
    if (!gameCode || !user) return;

    const connectedRef = ref(rtdb, '.info/connected');
    const teamStatusRef = ref(rtdb, `sessions/${gameCode}/teams/${user.uid}/connected`);

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true && session?.teams?.[user.uid]) {
        onDisconnect(teamStatusRef).set(false);
        set(teamStatusRef, true);
      }
    });

    return () => unsubscribe();
  }, [gameCode, user, session?.teams]);

  const currentRoundIndex = session?.game?.currentRound ?? 0;
  const currentRoundData = ROUNDS_DATA[currentRoundIndex] || ROUNDS_DATA[0];
  const currentPhase: GamePhase = session?.game?.currentPhase ?? 'lobby';

  // Current team object if registered
  const myTeam = useMemo(() => {
    if (!user || !session?.teams) return null;
    return session.teams[user.uid] || null;
  }, [user, session]);

  // Cards dealt to this team for this round
  const myHand: Card[] = useMemo(() => {
    if (!user || !session?.deals?.[currentRoundIndex]) return [];
    return session.deals[currentRoundIndex][user.uid] || [];
  }, [user, session, currentRoundIndex]);

  // My opening submission for this round
  const myOpeningSubmission: OpeningSubmission | undefined = useMemo(() => {
    if (!user || !session?.openingSubmissions?.[currentRoundIndex]) return undefined;
    return session.openingSubmissions[currentRoundIndex][user.uid];
  }, [user, session, currentRoundIndex]);

  // My opening vote for this round
  const myOpeningVote: OpeningVote | undefined = useMemo(() => {
    if (!user || !session?.openingVotes?.[currentRoundIndex]) return undefined;
    return session.openingVotes[currentRoundIndex][user.uid];
  }, [user, session, currentRoundIndex]);

  // My follow-up submission for this round
  const myFollowupSubmission: FollowupSubmission | undefined = useMemo(() => {
    if (!user || !session?.followupSubmissions?.[currentRoundIndex]) return undefined;
    return session.followupSubmissions[currentRoundIndex][user.uid];
  }, [user, session, currentRoundIndex]);

  // Sync userDraft state with existing submission (only if user hasn't typed anything yet)
  useEffect(() => {
    if (myFollowupSubmission?.text) {
      setUserDraft((prev: string | null) => (prev ? prev : myFollowupSubmission!.text));
    }
  }, [myFollowupSubmission?.text]);

  // My follow-up vote for this round
  const myFollowupVote: FollowupVote | undefined = useMemo(() => {
    if (!user || !session?.followupVotes?.[currentRoundIndex]) return undefined;
    return session.followupVotes[currentRoundIndex][user.uid];
  }, [user, session, currentRoundIndex]);

  // Cumulative Leaderboard
  const leaderboard = useMemo(() => {
    return calculateLeaderboard(session?.teams, session?.followupVotes);
  }, [session]);

  // Handle Team Name Submit
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameCode || !session) return;

    if (session.lobbyLocked) {
      setNameError('This game has already started and is no longer accepting new teams.');
      return;
    }

    const existingNames = Object.values(session.teams || {}).map((t) => t.name);
    const validation = validateTeamName(teamNameInput, existingNames);

    if (!validation.valid) {
      setNameError(validation.error || 'Invalid team name');
      return;
    }

    setNameError(null);
    setIsSubmitting(true);

    try {
      const cleanName = validation.sanitized!;
      await set(ref(rtdb, `sessions/${gameCode}/teams/${user.uid}`), {
        id: user.uid,
        name: cleanName,
        joinedAt: Date.now(),
        isReady: false,
        connected: true,
      });

      localStorage.setItem(LOCAL_STORAGE_TEAM_CODE, gameCode);
      localStorage.setItem(LOCAL_STORAGE_TEAM_NAME, cleanName);
    } catch (err) {
      console.error('Failed to register team:', err);
      setNameError('Could not register team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "We're Ready"
  const handleMarkReady = async () => {
    if (!user || !gameCode) return;
    try {
      await update(ref(rtdb, `sessions/${gameCode}/teams/${user.uid}`), {
        isReady: true,
      });
    } catch (err) {
      console.error('Failed to mark ready:', err);
    }
  };

  // Submit Opening Card
  const handleSubmitOpeningCard = async () => {
    if (!user || !gameCode || !selectedCardId || !session?.game?.submissionsOpen) return;
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setIsSubmitting(true);

    try {
      const card = myHand.find((c) => c.id === selectedCardId);
      if (!card) return;

      const submission: OpeningSubmission = {
        teamUid: user.uid,
        teamName: myTeam?.name || 'Anonymous Team',
        cardId: card.id,
        cardText: card.text,
        submittedAt: Date.now(),
      };

      await set(
        ref(rtdb, `sessions/${gameCode}/openingSubmissions/${currentRoundIndex}/${user.uid}`),
        submission
      );
    } catch (err) {
      console.error('Failed to submit opening card:', err);
    } finally {
      actionLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Submit Opening Vote (cannot vote for self)
  const handleSubmitOpeningVote = useCallback(
    async (candidateUid: string) => {
      if (!user || !gameCode || !session?.game?.votingOpen) return;
      if (candidateUid === user.uid) return;

      try {
        const vote: OpeningVote = {
          voterUid: user.uid,
          candidateUid,
          votedAt: Date.now(),
        };

        await set(
          ref(rtdb, `sessions/${gameCode}/openingVotes/${currentRoundIndex}/${user.uid}`),
          vote
        );
        setSelectedVoteUid(candidateUid);
      } catch (err) {
        console.error('Failed to submit opening vote:', err);
      }
    },
    [user, gameCode, session, currentRoundIndex]
  );

  // Submit Written Follow-up Response
  const handleSubmitWrittenResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameCode || !session?.game?.submissionsOpen) return;

    const validation = validateWrittenResponse(userDraft ?? '');
    if (!validation.valid) {
      setResponseError(validation.error || 'Invalid response');
      return;
    }

    setResponseError(null);
    setIsSubmitting(true);

    try {
      const submission: FollowupSubmission = {
        teamUid: user.uid,
        teamName: myTeam?.name || 'Anonymous Team',
        text: validation.sanitized!,
        submittedAt: myFollowupSubmission?.submittedAt || Date.now(),
        updatedAt: Date.now(),
      };

      await set(
        ref(rtdb, `sessions/${gameCode}/followupSubmissions/${currentRoundIndex}/${user.uid}`),
        submission
      );
    } catch (err) {
      console.error('Failed to submit written response:', err);
      setResponseError('Failed to save response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Follow-up Vote (cannot vote for self)
  const handleSubmitFollowupVote = useCallback(
    async (candidateUid: string) => {
      if (!user || !gameCode || !session?.game?.votingOpen) return;
      if (candidateUid === user.uid) return;

      try {
        const vote: FollowupVote = {
          voterUid: user.uid,
          candidateUid,
          votedAt: Date.now(),
        };

        await set(
          ref(rtdb, `sessions/${gameCode}/followupVotes/${currentRoundIndex}/${user.uid}`),
          vote
        );
        setSelectedVoteUid(candidateUid);
      } catch (err) {
        console.error('Failed to submit follow-up vote:', err);
      }
    },
    [user, gameCode, session, currentRoundIndex]
  );

  if (authLoading) {
    return (
      <div className="mobile-loading-screen">
        <p>Connecting team device...</p>
      </div>
    );
  }

  // Not in a game yet: enter code
  if (!gameCode) {
    return (
      <div className="app-container">
        <BrandingHeader subtitle="Mobile Team Screen" />
        <main className="main-content mobile-content">
          <div className="mobile-card">
            <h2>Join MSA Dawah Workshop</h2>
            <p className="mobile-card-desc">
              Enter the 6-character room code displayed on the facilitator&apos;s projector screen.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = teamNameInput.trim().toUpperCase();
                if (code) setGameCode(code);
              }}
              className="join-form"
            >
              <input
                type="text"
                placeholder="ABC123"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="game-code-input"
                aria-label="Room code"
              />
              <button type="submit" className="btn btn-accent btn-large full-width">
                Continue to Team Name
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Loading session
  if (!hasReceivedSession) {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Loading session..." />
        <main className="main-content mobile-content">
          <div className="mobile-card">
            <p>Connecting to room {gameCode}...</p>
          </div>
        </main>
      </div>
    );
  }

  // Session not found
  if (joinError || !session) {
    return (
      <div className="app-container">
        <BrandingHeader subtitle="Join Error" />
        <main className="main-content mobile-content">
          <div className="mobile-card error-card">
            <AlertCircle size={40} className="icon-destructive" />
            <h2>Room Not Found</h2>
            <p>{joinError || `No active game session found for code "${gameCode}".`}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                localStorage.removeItem(LOCAL_STORAGE_TEAM_CODE);
                setGameCode('');
              }}
            >
              Try Another Code
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Step 1: Team Registration (Pick team name)
  if (!myTeam) {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Team Registration" />
        <main className="main-content mobile-content">
          <div className="mobile-card">
            <span className="room-pill">Room: {gameCode}</span>
            <h2 className="team-join-title">Choose Your Team Name</h2>
            <p className="team-join-desc">
              Teams consist of 3 to 4 participants sharing this phone. Pick a fun, creative name (up to 20 characters).
            </p>

            <form onSubmit={handleJoinTeam} className="join-form">
              <input
                type="text"
                placeholder="e.g. Al-Farabi Squad"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                maxLength={20}
                className="team-name-input"
                aria-label="Team Name"
                disabled={isSubmitting}
              />
              <span className="char-counter">{teamNameInput.trim().length} / 20 characters</span>

              {nameError && (
                <div className="form-error-alert" role="alert">
                  <AlertCircle size={16} /> {nameError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-accent btn-large full-width"
                disabled={isSubmitting || !teamNameInput.trim()}
              >
                Join Game Room
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Step 2: How to Play & "We're Ready"
  if (!myTeam.isReady) {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Team ${myTeam.name}`} />
        <main className="main-content mobile-content">
          <div className="mobile-card how-to-play-card">
            <span className="welcome-team-badge">Welcome, {myTeam.name}!</span>
            <h2>How to Play</h2>
            <ol className="instructions-ol">
              <li>
                <strong>Opening Question:</strong> Your team receives three answer cards. Pick one and submit it.
              </li>
              <li>
                <strong>Opening Vote:</strong> Vote for another team&apos;s answer.
              </li>
              <li>
                <strong>Follow-up Scenario:</strong> The winning opening answer becomes the role-playing context.
              </li>
              <li>
                <strong>Written Response:</strong> Collaborate and write a thoughtful response within 6 minutes.
              </li>
              <li>
                <strong>Final Rankings:</strong> Only votes on written follow-up responses count toward the leaderboard!
              </li>
            </ol>

            <button
              type="button"
              className="btn btn-accent btn-large full-width"
              onClick={handleMarkReady}
            >
              <CheckCircle2 size={22} /> We&apos;re Ready!
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Step 3: Waiting in Lobby
  if (currentPhase === 'lobby') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Team ${myTeam.name}`} />
        <main className="main-content mobile-content">
          <div className="mobile-card waiting-card">
            <CheckCircle2 size={48} className="ready-icon" />
            <h2>You&apos;re All Set!</h2>
            <p className="team-name-highlight">{myTeam.name}</p>
            <p className="waiting-text">
              Waiting for the facilitator to start the game on the projector screen...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 4: 5-Second Intro Phase
  if (currentPhase === 'intro') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Round ${currentRoundIndex + 1}`} />
        <main className="main-content mobile-content">
          <CartoonCharacter
            roundNumber={currentRoundIndex + 1}
            questionText={currentRoundData.openingQuestion}
          />
          <div className="mobile-intro-note">
            <Clock size={18} /> Look at the projector screen! Card selection begins in moments.
          </div>
        </main>
      </div>
    );
  }

  // Step 5: Opening Card Selection
  if (currentPhase === 'opening_select') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Round ${currentRoundIndex + 1} • Pick a Card`} />
        <main className="main-content mobile-content">
          <div className="mobile-round-header">
            <span className="mobile-eyebrow">Round {currentRoundIndex + 1} Opening Question</span>
            <h2 className="mobile-question">{currentRoundData.openingQuestion}</h2>
          </div>

          {myOpeningSubmission ? (
            <div className="mobile-card waiting-card">
              <CheckCircle2 size={40} className="ready-icon" />
              <h3>Card Submitted!</h3>
              <div className="submitted-card-preview">
                <p>“{myOpeningSubmission.cardText}”</p>
              </div>
              <p className="waiting-text">
                Waiting for other teams to submit their cards...
              </p>
            </div>
          ) : (
            <div className="card-selection-container">
              <p className="selection-instruction">
                Pick <strong>one</strong> card from your hand of three to submit:
              </p>

              <div className="hand-cards-list">
                {myHand.map((card) => {
                  const isSelected = selectedCardId === card.id;
                  return (
                    <CardView
                      key={card.id}
                      text={card.text}
                      selected={isSelected}
                      onClick={() => setSelectedCardId(card.id)}
                      ariaLabel={`Card: ${card.text}`}
                    />
                  );
                })}
              </div>

              <div className="submit-action-bar">
                <button
                  type="button"
                  className="btn btn-accent btn-large full-width"
                  disabled={!selectedCardId || isSubmitting || !session.game.submissionsOpen}
                  onClick={handleSubmitOpeningCard}
                >
                  <Send size={20} /> Confirm & Submit Answer
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Step 6: Opening Review Phase
  if (currentPhase === 'opening_review') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Reviewing Cards" />
        <main className="main-content mobile-content">
          <div className="mobile-card waiting-card">
            <HelpCircle size={44} className="icon-warning" />
            <h2>Reviewing Answers</h2>
            <p className="waiting-text">
              Look up at the projector screen! The facilitator is sharing the submitted cards. Voting starts in a moment.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 7: Opening Voting (Cannot vote for self)
  if (currentPhase === 'opening_vote') {
    const candidateSubmissions = Object.values(session?.openingSubmissions?.[currentRoundIndex] || {});
    const validCandidates = candidateSubmissions.filter((sub) => sub.teamUid !== user?.uid);

    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Round ${currentRoundIndex + 1} • Vote`} />
        <main className="main-content mobile-content">
          <div className="mobile-round-header">
            <span className="mobile-eyebrow">Round {currentRoundIndex + 1} Opening Vote</span>
            <h2 className="mobile-question">{currentRoundData.openingQuestion}</h2>
            <p className="opening-rule-reminder">
              Opening votes do not count toward the final standings. Vote for your favorite!
            </p>
          </div>

          <p className="selection-instruction">
            Choose the best answer from another team:
          </p>

          <div className="voting-cards-list">
            {validCandidates.map((sub) => {
              const isVoted = (myOpeningVote?.candidateUid || selectedVoteUid) === sub.teamUid;
              return (
                <CardView
                  key={sub.teamUid}
                  text={sub.cardText}
                  subTitle={sub.teamName}
                  selected={isVoted}
                  onClick={() => handleSubmitOpeningVote(sub.teamUid)}
                  badge={isVoted ? 'Your Vote' : undefined}
                />
              );
            })}
          </div>

          {myOpeningVote && (
            <div className="vote-confirmed-pill">
              <CheckCircle2 size={16} /> Vote recorded! You may change your vote until the host closes voting.
            </div>
          )}
        </main>
      </div>
    );
  }

  // Step 8: Opening Result
  if (currentPhase === 'opening_result') {
    const openingResult = session.openingResults?.[currentRoundIndex];
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Opening Result" />
        <main className="main-content mobile-content">
          <div className="mobile-card result-announcement-card">
            <Trophy size={40} className="ready-icon" />
            <span className="result-eyebrow">Winning Opening Answer</span>
            <h3 className="winner-team-title">{openingResult?.winningTeamName}</h3>
            <p className="winner-quote">“{openingResult?.winningCardText}”</p>
            <p className="exclusion-reminder">
              Opening votes do not count toward the final standings.
            </p>
            <p className="waiting-text">
              The facilitator is preparing the follow-up scenario...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 9: Follow-up Prompt
  if (currentPhase === 'followup_prompt') {
    const openingResult = session.openingResults?.[currentRoundIndex];
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Follow-up Scenario" />
        <main className="main-content mobile-content">
          <div className="mobile-card">
            <span className="context-eyebrow">The Situation</span>
            <p className="context-text">
              Your opening answer was: <em>“{openingResult?.winningCardText}”</em>
            </p>
            <h2 className="followup-mobile-h2">The Follow-up Question:</h2>
            <p className="followup-mobile-q">“{currentRoundData.followupQuestion}”</p>
            <p className="waiting-text">
              Waiting for facilitator to start the 6-minute collaboration timer...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 10: Follow-up Work (6-Minute Writing Collaboration)
  if (currentPhase === 'followup_work') {
    const openingResult = session.openingResults?.[currentRoundIndex];
    const isSubmissionsOpen = session.game.submissionsOpen;

    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Round ${currentRoundIndex + 1} • Write Response`} />
        <main className="main-content mobile-content">
          <div className="mobile-work-header">
            <TimerDisplay
              timerStatus={session.game.timerStatus}
              phaseEndsAt={session.game.phaseEndsAt}
              timerRemainingSeconds={session.game.timerRemainingSeconds}
              size="normal"
            />
            <span className="official-vote-badge">This response is voted on for real points!</span>
          </div>

          <div className="roleplay-scenario-box">
            <span className="scenario-label">Role-play context:</span>
            <p className="scenario-quote">“{openingResult?.winningCardText}”</p>
          </div>

          <div className="followup-prompt-box">
            <h3 className="followup-title">Question to Answer:</h3>
            <p className="followup-text">“{currentRoundData.followupQuestion}”</p>
          </div>

          <form onSubmit={handleSubmitWrittenResponse} className="writing-form">
            <label htmlFor="written-response-box" className="writing-label">
              Your Team&apos;s Response (collaborate with your group):
            </label>
            <textarea
              id="written-response-box"
              rows={6}
              value={userDraft ?? ''}
              onChange={(e) => setUserDraft(e.target.value)}
              maxLength={1000}
              placeholder="Write a clear, respectful, and thoughtful Islamic response..."
              className="writing-textarea"
              disabled={!isSubmissionsOpen || isSubmitting}
            />

            <div className="writing-meta">
              <span className="char-counter">{(userDraft ?? '').length} / 1,000 characters</span>
              {myFollowupSubmission && (
                <span className="saved-status">
                  <CheckCircle2 size={14} /> Saved in room
                </span>
              )}
            </div>

            {responseError && (
              <div className="form-error-alert" role="alert">
                <AlertCircle size={16} /> {responseError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-accent btn-large full-width"
              disabled={!isSubmissionsOpen || isSubmitting || !(userDraft ?? '').trim()}
            >
              <Send size={18} /> {myFollowupSubmission ? 'Update Response' : 'Submit Response'}
            </button>
            {!isSubmissionsOpen && (
              <p className="submissions-closed-notice">
                Submissions are currently closed by the facilitator.
              </p>
            )}
          </form>
        </main>
      </div>
    );
  }

  // Step 11: Follow-up Review
  if (currentPhase === 'followup_review') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Reviewing Written Responses" />
        <main className="main-content mobile-content">
          <div className="mobile-card waiting-card">
            <HelpCircle size={44} className="icon-warning" />
            <h2>Reviewing Responses</h2>
            <p className="waiting-text">
              Look up at the projector screen! The facilitator is sharing teams&apos; responses. Voting will begin shortly.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Step 12: Follow-up Voting
  if (currentPhase === 'followup_vote') {
    const candidateSubmissions = Object.values(session?.followupSubmissions?.[currentRoundIndex] || {});
    const validCandidates = candidateSubmissions.filter((sub) => sub.teamUid !== user?.uid);

    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle={`Round ${currentRoundIndex + 1} • Official Vote`} />
        <main className="main-content mobile-content">
          <div className="mobile-round-header">
            <span className="mobile-eyebrow">Round {currentRoundIndex + 1} Follow-up Vote</span>
            <h2 className="mobile-question">{currentRoundData.followupQuestion}</h2>
            <div className="official-vote-badge">
              These votes count directly toward the final workshop leaderboard!
            </div>
          </div>

          <p className="selection-instruction">
            Read other teams&apos; written answers and vote for the most thoughtful:
          </p>

          <div className="voting-cards-list">
            {validCandidates.map((sub) => {
              const isVoted = (myFollowupVote?.candidateUid || selectedVoteUid) === sub.teamUid;
              return (
                <CardView
                  key={sub.teamUid}
                  text={sub.text}
                  subTitle={sub.teamName}
                  selected={isVoted}
                  onClick={() => handleSubmitFollowupVote(sub.teamUid)}
                  badge={isVoted ? 'Your Vote' : undefined}
                />
              );
            })}
          </div>

          {myFollowupVote && (
            <div className="vote-confirmed-pill">
              <CheckCircle2 size={16} /> Vote recorded! You can update your vote until the host closes voting.
            </div>
          )}
        </main>
      </div>
    );
  }

  // Step 13: Follow-up Result
  if (currentPhase === 'followup_result') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Round Results" />
        <main className="main-content mobile-content">
          <div className="mobile-card">
            <Trophy size={40} className="ready-icon" />
            <h2>Round {currentRoundIndex + 1} Complete!</h2>
            <p className="waiting-text">
              The facilitator is leading a debrief of key Islamic concepts and discussion points. Look up at the screen!
            </p>
            <LeaderboardTable entries={leaderboard} highlightTeamUid={user?.uid} />
          </div>
        </main>
      </div>
    );
  }

  // Step 14: Final Results
  if (currentPhase === 'final_results') {
    return (
      <div className="app-container">
        <BrandingHeader gameCode={gameCode} subtitle="Final Standings" />
        <main className="main-content mobile-content">
          <div className="mobile-card final-card">
            <Trophy size={48} className="ready-icon" />
            <h2>Workshop Concluded!</h2>
            <p>Jazakum Allahu Khairan for participating!</p>
            <LeaderboardTable entries={leaderboard} highlightTeamUid={user?.uid} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <BrandingHeader gameCode={gameCode} />
      <main className="main-content mobile-content">
        <p>Loading game state...</p>
      </main>
    </div>
  );
};
