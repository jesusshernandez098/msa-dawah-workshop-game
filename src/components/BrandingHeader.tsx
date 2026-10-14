import React from 'react';
import { Link } from 'react-router-dom';

interface BrandingHeaderProps {
  gameCode?: string;
  isHost?: boolean;
  subtitle?: string;
}

export const BrandingHeader: React.FC<BrandingHeaderProps> = ({
  gameCode,
  isHost = false,
  subtitle,
}) => {
  const baseUrl = import.meta.env.BASE_URL;
  const msaLogoUrl = `${baseUrl}assets/msa-logo.png`;
  const clearIslamLogoUrl = `${baseUrl}assets/clear-islam-logo.webp`;

  return (
    <header className="app-header" role="banner">
      <div className="header-inner">
        <Link to="/" className="header-branding" aria-label="MSA Dawah Workshop Home">
          {/* Logo container on clean warm-cream panel preserving aspect ratios */}
          <div className="logos-panel">
            <img
              src={msaLogoUrl}
              alt="MSA Logo"
              className="logo-img msa-logo"
            />
            <div className="logo-divider" aria-hidden="true" />
            <img
              src={clearIslamLogoUrl}
              alt="Clear Islam Logo"
              className="logo-img clear-islam-logo"
            />
          </div>

          <div className="header-titles">
            <h1 className="header-title">MSA Dawah Workshop</h1>
            <p className="header-subtitle">{subtitle || 'Choose. Discuss. Respond.'}</p>
          </div>
        </Link>

        {gameCode && (
          <div className="header-meta">
            <div className="room-badge">
              <span className="room-label">CODE</span>
              <span className="room-code">{gameCode}</span>
            </div>
            {isHost && <span className="host-pill">HOST</span>}
          </div>
        )}
      </div>
    </header>
  );
};
