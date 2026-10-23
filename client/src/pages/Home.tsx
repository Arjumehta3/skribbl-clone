import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const colors = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f9ca24",
  "#a55eea",
  "#26de81",
  "#fd9644",
  "#fc5c65",
];

const tutorialSteps = [
  {
    title: "Choose a word!",
    description: "When it's your turn, choose a word you want to draw!",
    icon: "💭",
  },
  {
    title: "Start drawing!",
    description: "Draw the chosen word using colors and your creativity.",
    icon: "🎨",
  },
  {
    title: "Guess the word!",
    description: "Watch the drawing and type your guess before time runs out!",
    icon: "💡",
  },
  {
    title: "Earn points!",
    description: "Guess correctly to score points. Faster guesses earn more!",
    icon: "⭐",
  },
  {
    title: "Win the game!",
    description: "Finish with the highest score to win the game!",
    icon: "🏆",
  },
];

function DoodleAvatar({ index }: { index: number }) {
  const [expression, setExpression] = useState(0);
  const color = colors[index % colors.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpression((previous) => (previous + 1) % 3);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <svg
      className="doodle-svg"
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Doodle avatar ${index + 1}`}
    >
      <path
        d="M27 70 L10 84 M73 70 L90 84"
        stroke="#222"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M29 68 Q50 58 71 68 L76 105 Q50 116 24 105 Z"
        fill={color}
        stroke="#222"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M38 105 L35 115 M62 105 L65 115"
        stroke="#222"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <circle
        cx="50"
        cy="39"
        r="29"
        fill="#ffdfb5"
        stroke="#222"
        strokeWidth="3"
      />

      <path
        d="M22 35 Q18 5 43 10 Q63 0 77 24 L76 34 Q64 20 53 22 Q37 17 22 35"
        fill="#49352c"
        stroke="#222"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {expression === 1 ? (
        <path
          d="M34 37 Q39 32 44 37 M56 37 Q61 32 66 37"
          stroke="#222"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <>
          <ellipse cx="39" cy="37" rx="3.5" ry="5" fill="#222" />
          <ellipse cx="61" cy="37" rx="3.5" ry="5" fill="#222" />
        </>
      )}

      {expression === 2 ? (
        <ellipse
          cx="50"
          cy="52"
          rx="5"
          ry="7"
          fill="#a33"
          stroke="#222"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M40 51 Q50 61 60 51"
          stroke="#222"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}

      <circle cx="30" cy="47" r="4" fill="#ff9b9b" opacity="0.7" />
      <circle cx="70" cy="47" r="4" fill="#ff9b9b" opacity="0.7" />
    </svg>
  );
}

function HowToPlay() {
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = tutorialSteps[activeStep];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((previous) => (previous + 1) % tutorialSteps.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="footer-column how-column">
      <h2>
        <span className="footer-icon">✏️</span>
        How to play
      </h2>

      <div className="tutorial-content" key={activeStep}>
        <div className={`tutorial-art art-step-${activeStep}`}>
          <div className="tutorial-title">{currentStep.title}</div>

          {activeStep === 0 && (
            <div className="word-options">
              <span>〰</span>
              <span className="chosen-word">〰</span>
              <span>〰</span>
              <span className="pointer-hand">👆</span>
            </div>
          )}

          {activeStep === 1 && (
            <div className="drawing-example">
              <span>☀️</span>
              <span>🏠</span>
              <span>🌳</span>
              <span>✏️</span>
            </div>
          )}

          {activeStep === 2 && (
            <div className="guess-example">
              <span className="guess-bubble">What is it?</span>
              <span className="guess-icon">🤔</span>
            </div>
          )}

          {activeStep === 3 && (
            <div className="points-example">
              <span>⭐</span>
              <strong>+100</strong>
              <span>⭐</span>
            </div>
          )}

          {activeStep === 4 && (
            <div className="winner-example">
              <span>🏆</span>
              <strong>WINNER!</strong>
            </div>
          )}
        </div>

        <p className="tutorial-description">
          {currentStep.description}
        </p>
      </div>

      <div className="tutorial-dots">
        {tutorialSteps.map((step, index) => (
          <button
            key={step.title}
            type="button"
            className={`tutorial-dot ${
              activeStep === index ? "active" : ""
            }`}
            onClick={() => setActiveStep(index)}
            aria-label={`Show ${step.title}`}
            aria-current={activeStep === index ? "step" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [playerName, setPlayerName] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [language, setLanguage] = useState("English");

  const changeAvatar = (direction: number) => {
    setAvatarIndex(
      (previous) =>
        (previous + direction + colors.length) % colors.length
    );
  };

  const randomAvatar = () => {
    setAvatarIndex((previous) => {
      let next = previous;

      while (next === previous) {
        next = Math.floor(Math.random() * colors.length);
      }

      return next;
    });
  };

  const handlePlay = () => {
  const finalPlayerName =
    playerName.trim() ||
    `Player${Math.floor(1000 + Math.random() * 9000)}`;

  sessionStorage.setItem("playerName", finalPlayerName);
  sessionStorage.setItem("playerAvatar", String(avatarIndex));

  navigate("/lobby");
};

  const handleCreateRoom = () => {
    const finalPlayerName =
      playerName.trim() ||
      `Player${Math.floor(1000 + Math.random() * 9000)}`;

    sessionStorage.setItem("playerName", finalPlayerName);
    sessionStorage.setItem("playerAvatar", String(avatarIndex));
    navigate("/lobby");
  };

  return (
    <main className="home-page">
      <div className="home-card">
        <header className="home-header">
          <div className="logo">
            {"skribbl.io".split("").map((letter, index) => (
              <span
                className={`logo-letter logo-${index}`}
                key={`${letter}-${index}`}
              >
                {letter}
              </span>
            ))}
          </div>

          <p className="home-subtitle">
            Draw, guess, and have fun with friends!
          </p>
        </header>

        <div className="doodle-strip">
          {colors.map((_, index) => (
            <div className="small-doodle" key={index}>
              <DoodleAvatar index={index} />
            </div>
          ))}
        </div>

        <section className="home-content">
          <div className="avatar-section">
            <h2>Choose your avatar</h2>

            <div className="avatar-picker">
              <button
                type="button"
                className="avatar-arrow"
                onClick={() => changeAvatar(-1)}
                aria-label="Previous avatar"
              >
                &#9664;
              </button>

              <div className="selected-avatar" key={avatarIndex}>
                <DoodleAvatar index={avatarIndex} />
              </div>

              <button
                type="button"
                className="avatar-arrow"
                onClick={() => changeAvatar(1)}
                aria-label="Next avatar"
              >
                &#9654;
              </button>
            </div>

            <button
              type="button"
              className="random-avatar"
              onClick={randomAvatar}
            >
              🎲 Random Avatar
            </button>
          </div>

          <div className="player-form">
            <label htmlFor="player-name">Your name</label>

            <input
              id="player-name"
              type="text"
              placeholder="Enter your name..."
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              maxLength={20}
            />

            <label htmlFor="language">Language</label>

            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
            </select>

            <button
              type="button"
              className="play-button"
              onClick={handlePlay}
            >
              ▶ Play!
            </button>

            <button
              type="button"
              className="create-room-button"
              onClick={handleCreateRoom}
            >
              + Create Private Room
            </button>
          </div>
        </section>

        <footer className="site-footer">
          <section className="footer-column about-column">
            <h2>
              <span className="footer-icon">❔</span>
              About
            </h2>

            <p>
              <strong>skribbl.io</strong> is a free online multiplayer
              drawing and guessing game.
            </p>

            <p>
              A normal game consists of a few rounds. In every round,
              one player draws a chosen word while the others try to guess it.
            </p>

            <p>
              The player with the most points at the end of the game wins!
              Have fun!
            </p>
          </section>

          <section className="footer-column news-column">
            <h2>
              <span className="footer-icon">📰</span>
              News
            </h2>

            <div className="news-scroll">
              <div className="news-heading">
                <strong>Fresh paint</strong>
                <small>Latest updates</small>
              </div>

              <p>Hello, players!</p>

              <ul>
                <li>Welcome to our drawing game</li>
                <li>Choose your favorite avatar</li>
                <li>Enjoy the animated tutorial</li>
                <li>More features coming soon</li>
              </ul>

              <div className="news-heading">
                <strong>Coming soon</strong>
              </div>

              <ul>
                <li>Multiplayer rooms</li>
                <li>Live drawing and guessing</li>
                <li>Scores and leaderboard</li>
              </ul>
            </div>
          </section>

          <HowToPlay />

          <div className="footer-bottom">
            <div className="footer-links">
              <a href="#about">About</a>
              <a href="#terms">Terms of Service</a>
              <a href="#credits">Credits</a>
              <a href="#privacy">Privacy</a>
              <a href="#settings">Settings</a>
            </div>

            <p>
              Have fun drawing and guessing with friends!
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}