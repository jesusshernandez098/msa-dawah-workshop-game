import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Grid, Maximize2, X } from 'lucide-react';

export interface ReviewItem {
  id: string;
  teamUid: string;
  teamName: string;
  content: string;
  votesCount?: number;
}

interface ReviewSlideshowProps {
  items: ReviewItem[];
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  renderItemExtra?: (item: ReviewItem) => React.ReactNode;
}

export const ReviewSlideshow: React.FC<ReviewSlideshowProps> = ({
  items,
  title,
  subtitle,
  emptyMessage = 'No submissions received yet.',
  renderItemExtra,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div className="review-empty-box">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const currentItem = items[currentIndex] || items[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handleCardClick = (idx: number) => {
    setCurrentIndex(idx);
    setViewMode('slideshow');
  };

  return (
    <div className="review-container">
      <div className="review-toolbar">
        <div>
          <h2 className="review-title">{title}</h2>
          {subtitle && <p className="review-subtitle">{subtitle}</p>}
        </div>

        <div className="review-view-toggles">
          <button
            type="button"
            className={`btn btn-secondary ${viewMode === 'grid' ? 'is-active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="View as grid"
          >
            <Grid size={18} /> Grid View
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${viewMode === 'slideshow' ? 'is-active' : ''}`}
            onClick={() => setViewMode('slideshow')}
            aria-label="View as slideshow"
          >
            <Maximize2 size={18} /> Slideshow ({currentIndex + 1}/{items.length})
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="review-grid">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="review-grid-card"
              onClick={() => handleCardClick(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(idx);
                }
              }}
              aria-label={`Open submission from ${item.teamName}`}
            >
              <div className="card-team-header">
                <span className="team-badge">{item.teamName}</span>
                <span className="click-to-enlarge-hint">Click to enlarge</span>
              </div>
              <p className="card-review-text">{item.content}</p>
              {renderItemExtra && renderItemExtra(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="slideshow-box">
          <div className="slideshow-header">
            <span className="slideshow-counter">
              Submission {currentIndex + 1} of {items.length}
            </span>
            <span className="slideshow-team-name">{currentItem.teamName}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setViewMode('grid')}
              aria-label="Back to grid"
            >
              <X size={18} /> Exit Slideshow
            </button>
          </div>

          <div className="slideshow-content-card">
            <p className="slideshow-text">{currentItem.content}</p>
            {renderItemExtra && renderItemExtra(currentItem)}
          </div>

          <div className="slideshow-controls">
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handlePrev}
              aria-label="Previous submission"
            >
              <ChevronLeft size={24} /> Previous
            </button>
            <span className="slideshow-step-indicator">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleNext}
              aria-label="Next submission"
            >
              Next <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
