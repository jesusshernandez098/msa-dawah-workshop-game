import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Presentation, ArrowRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const baseUrl = import.meta.env.BASE_URL;
  const msaLogoUrl = `${baseUrl}assets/msa-logo.png`;
  const clearIslamLogoUrl = `${baseUrl}assets/clear-islam-logo.webp`;

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (cleanCode) {
      navigate(`/play?game=${cleanCode}`);
    } else {
      navigate('/play');
    }
  };

  return (
    <div className="welcome-page-container">
      <div className="welcome-card">
        {/* Prominent & Respectful Logos Panel */}
        <div className="welcome-logos-panel">
          <img
            src={msaLogoUrl}
            alt="Muslim Students Association Logo"
            className="welcome-logo msa-logo-large"
          />
          <div className="welcome-logo-divider" aria-hidden="true" />
          <img
            src={clearIslamLogoUrl}
            alt="Clear Islam Logo"
            className="welcome-logo clear-islam-logo-large"
          />
        </div>

        <div className="welcome-header-text">
          <h1 className="welcome-main-title">MSA Dawah Workshop Game</h1>
          <p className="welcome-subtitle">Choose. Discuss. Respond.</p>
          <p className="welcome-tagline">
            A collaborative role-playing game helping Muslim students learn how to answer common questions about Islam with wisdom, warmth, and sound knowledge.
          </p>
        </div>

        {/* Action Choice Grid */}
        <div className="welcome-actions-grid">
          {/* Join a Game */}
          <div className="welcome-action-box join-box">
            <div className="action-icon-badge">
              <Users size={32} aria-hidden="true" />
            </div>
            <h2 className="action-title">Join as a Team</h2>
            <p className="action-desc">
              Team of 3–4 participants sharing one mobile device.
            </p>

            <form onSubmit={handleJoinSubmit} className="join-form">
              <input
                type="text"
                placeholder="Enter 6-char Game Code"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="game-code-input"
                aria-label="6-character Game Code"
              />
              <button
                type="submit"
                className="btn btn-accent btn-large full-width"
              >
                Join a Game <ArrowRight size={20} />
              </button>
            </form>
          </div>

          {/* Host a Game */}
          <div className="welcome-action-box host-box">
            <div className="action-icon-badge">
              <Presentation size={32} aria-hidden="true" />
            </div>
            <h2 className="action-title">Host Facilitator</h2>
            <p className="action-desc">
              Display questions, guide discussions, and control rounds on the projector screen.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-large full-width"
              onClick={() => navigate('/host')}
            >
              Host a Game <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <div className="welcome-rules-summary">
          <h3>How It Works</h3>
          <ol className="rules-list">
            <li><strong>7 Rounds:</strong> Explore 7 authentic questions asked about Islam.</li>
            <li><strong>Opening Round:</strong> Teams choose from funny and serious cards.</li>
            <li><strong>Written Follow-up:</strong> Teams collaborate on thoughtful 6-minute responses.</li>
            <li><strong>Final Rankings:</strong> Only votes on written follow-up responses count toward victory!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
