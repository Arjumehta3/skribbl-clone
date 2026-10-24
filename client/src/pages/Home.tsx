import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import DoodleAvatar from "../components/DoodleAvatar";
import { AVATAR_COLORS } from "../utils/avatar";
import { useGame } from "../context/GameContext";

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
  const { leaveRoom } = useGame();

  // Home par aaye to kisi purane room se bahar nikal jao
  useEffect(() => {
    leaveRoom();
  }, [leaveRoom]);

  const [playerName, setPlayerName] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [language, setLanguage] = useState("English");

  const changeAvatar = (direction: number) => {
    setAvatarIndex(
      (previous) =>
        (previous + direction + AVATAR_COLORS.length) % AVATAR_COLORS.length
    );
  };

  const randomAvatar = () => {
    setAvatarIndex((previous) => {
      let next = previous;

      while (next === previous) {
        next = Math.floor(Math.random() * AVATAR_COLORS.length);
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

    navigate("/join-room");
  };

  const handleCreateRoom = () => {
    const finalPlayerName =
      playerName.trim() ||
      `Player${Math.floor(1000 + Math.random() * 9000)}`;

    sessionStorage.setItem("playerName", finalPlayerName);
    sessionStorage.setItem("playerAvatar", String(avatarIndex));
    sessionStorage.setItem("selectedLanguage", language);
    navigate("/create-room");
  };

  const handleJoinRoom = () => {
    const finalPlayerName =
      playerName.trim() ||
      `Player${Math.floor(1000 + Math.random() * 9000)}`;

    sessionStorage.setItem("playerName", finalPlayerName);
    sessionStorage.setItem("playerAvatar", String(avatarIndex));
    sessionStorage.setItem("selectedLanguage", language);
    navigate("/join-room");
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
          {AVATAR_COLORS.map((_, index) => (
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

            <button
              type="button"
              className="join-room-button"
              onClick={handleJoinRoom}
            >
              ↗ Join with Room Code
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