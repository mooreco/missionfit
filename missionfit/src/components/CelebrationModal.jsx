import { useEffect, useState } from "react";
import "../styles/medals.css";

/**
 * Full-screen celebration overlay shown when new medals are unlocked.
 * Shows each medal one at a time with a confetti-like animation.
 *
 * @param {{ medals: Array, onDismiss: () => void }} props
 */
export default function CelebrationModal({ medals, onDismiss }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(true);

  const medal = medals[currentIndex];

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (!medal) return null;

  function handleNext() {
    if (currentIndex < medals.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onDismiss();
    }
  }

  const isLast = currentIndex >= medals.length - 1;
  const isCapstone = medal.id === "w100";

  return (
    <div className="celebration-overlay" onClick={handleNext}>
      {/* Confetti particles */}
      <div className="confetti-container">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="confetti-dot"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.8}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              backgroundColor: [
                "#FFD166", "#EF476F", "#06D6A0", "#1D406A",
                "#FFD166", "#EF476F", "#06D6A0", "#1D406A",
              ][i % 8],
            }}
          />
        ))}
      </div>

      <div className={`celebration-card ${animating ? "pop-in" : ""} ${isCapstone ? "capstone" : ""}`}>
        <div className="celebration-emoji">{medal.emoji}</div>
        <h2 className="celebration-title">{medal.label}</h2>
        <p className="celebration-desc">{medal.description}</p>
        <div className="celebration-category">
          {medal.category === "weight" ? "Weight Milestone" : "Streak Milestone"}
        </div>
        <button className="celebration-btn" onClick={handleNext}>
          {isLast ? "Let's Go!" : "Next Medal →"}
        </button>
        {medals.length > 1 && (
          <span className="celebration-counter">
            {currentIndex + 1} of {medals.length}
          </span>
        )}
      </div>
    </div>
  );
}
