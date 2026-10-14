import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface DiscussionPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundNumber: number;
  followupQuestion: string;
  discussionPoints: string;
}

export const DiscussionPointsModal: React.FC<DiscussionPointsModalProps> = ({
  isOpen,
  onClose,
  roundNumber,
  followupQuestion,
  discussionPoints,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discussion-modal-title"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon">
            <BookOpen size={24} aria-hidden="true" />
            <h2 id="discussion-modal-title" className="modal-title">
              Facilitator Discussion Points • Round {roundNumber}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close discussion points"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="discussion-note">
            <strong>Facilitator Guide:</strong> This reflection guide is host-facing to support a
            thoughtful group debrief. It is not presented as the only acceptable answer, but as key
            Islamic principles to compare against the teams&apos; responses.
          </div>

          <div className="discussion-section">
            <h3 className="discussion-section-title">Follow-up Question:</h3>
            <p className="discussion-question-quote">“{followupQuestion}”</p>
          </div>

          <div className="discussion-section">
            <h3 className="discussion-section-title">Key Talking Points:</h3>
            <div className="discussion-points-content">
              <p>{discussionPoints}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Done with Discussion
          </button>
        </div>
      </div>
    </div>
  );
};
