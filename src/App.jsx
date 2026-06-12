import React, { useEffect, useMemo, useState } from "react";
import { answerHint, isCorrectGuess, pickQuestion } from "./game.js";

const DATA_URL = "/data/dinosaurs.json";
const MASKED_IMAGE_PATTERN =
  /cladogram|comparison|diagram|drawing|illustration|plate|reconstruction|restoration|scale|skeletal/i;
const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" }
];
const GAME_MODES = [
  { id: "normal", label: "Normal", meta: "10 questions", roundLimit: 10 },
  { id: "zen", label: "Zen", meta: "Endless", roundLimit: null }
];
const TOTAL_HINTS = 3;

function shouldMaskImage(dinosaur) {
  return MASKED_IMAGE_PATTERN.test(
    [dinosaur.imageTitle, dinosaur.imageDescription].filter(Boolean).join(" ")
  );
}

function dinosaursForDifficulty(dinosaurs, difficulty) {
  const filtered = dinosaurs.filter(
    (dinosaur) => dinosaur.popularity?.tier === difficulty
  );

  return filtered.length ? filtered : dinosaurs;
}

function Logo() {
  return (
    <div className="wordmark" aria-label="Dinoguessr">
      <svg
        aria-hidden="true"
        className="wordmark-mark"
        focusable="false"
        viewBox="0 0 64 64"
      >
        <path
          d="M10 37c2-12 14-23 31-24 7-.4 12 2 14 7 1.6 4-.3 8-5 10l-9 4 5 7-7 4-9-8-9 4c-5 2-9 1-11-4Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <path
          d="M42 18h.1M49 23l-8 2M27 30l-8 5M35 37l-2 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </svg>
      <h1>Dinoguessr</h1>
    </div>
  );
}

function ImageCredits({ dinosaur }) {
  const source = dinosaur.source ?? {};

  return (
    <details className="image-credits">
      <summary>Credits</summary>
      <div className="credits-links" aria-label="Source attribution">
        {source.imageSourceUrl && (
          <a href={source.imageSourceUrl} target="_blank" rel="noreferrer">
            Image source
          </a>
        )}
        {source.wikipediaUrl && (
          <a href={source.wikipediaUrl} target="_blank" rel="noreferrer">
            Facts
          </a>
        )}
        {source.textLicenseUrl && (
          <a href={source.textLicenseUrl} target="_blank" rel="noreferrer">
            License
          </a>
        )}
      </div>
    </details>
  );
}

function DifficultySelector({ difficulty, onChange }) {
  return (
    <div className="difficulty-control" aria-label="Difficulty">
      {DIFFICULTIES.map((mode) => (
        <button
          aria-pressed={difficulty === mode.id}
          className={difficulty === mode.id ? "active" : ""}
          data-difficulty={mode.id}
          key={mode.id}
          onClick={() => onChange(mode.id)}
          type="button"
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function ModeSelector({ mode, onChange }) {
  return (
    <div className="mode-grid" aria-label="Mode">
      {GAME_MODES.map((option) => (
        <button
          aria-label={`${option.label}, ${option.meta}`}
          aria-pressed={mode === option.id}
          className={mode === option.id ? "active" : ""}
          data-mode={option.id}
          key={option.id}
          onClick={() => onChange(option.id)}
          type="button"
        >
          <strong>{option.label}</strong>
          <span>{option.meta}</span>
        </button>
      ))}
    </div>
  );
}

function StartScreen({
  countLabel,
  difficulty,
  mode,
  onChangeDifficulty,
  onChangeMode,
  onStart
}) {
  return (
    <main className="app setup-app">
      <section className="setup-shell" aria-label="Dinoguessr setup">
        <header className="setup-header">
          <Logo />
          <p>{countLabel} dinosaurs</p>
        </header>

        <div className="setup-section">
          <h2>Difficulty</h2>
          <DifficultySelector
            difficulty={difficulty}
            onChange={onChangeDifficulty}
          />
        </div>

        <div className="setup-section">
          <h2>Mode</h2>
          <ModeSelector mode={mode} onChange={onChangeMode} />
        </div>

        <button
          className="start-button"
          data-action="start"
          onClick={onStart}
          type="button"
        >
          Start
        </button>
      </section>
    </main>
  );
}

function GuessForm({ guess, hasAnswered, isCorrect, onChange, onSubmit }) {
  return (
    <form
      className={`guess-form ${
        hasAnswered ? (isCorrect ? "correct" : "wrong") : ""
      }`}
      onSubmit={onSubmit}
    >
      <label htmlFor="guess-input">Type the dinosaur name</label>
      <div className="guess-control">
        <input
          autoComplete="off"
          disabled={hasAnswered}
          id="guess-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. Iguanodon"
          spellCheck="false"
          type="text"
          value={guess}
        />
        <button disabled={hasAnswered || !guess.trim()} type="submit">
          Guess
        </button>
      </div>
    </form>
  );
}

function hintItems(dinosaur) {
  const lived =
    (dinosaur.facts ?? []).find((fact) => /^Lived:/i.test(fact)) ??
    "Lived: Unknown";
  const family = dinosaur.taxonomy?.family?.trim() || "Unclassified";

  return [lived, `Family: ${family}`, `Name: ${answerHint(dinosaur)}`].slice(
    0,
    TOTAL_HINTS
  );
}

function HintPanel({ hints, revealedHintCount, onRevealHint }) {
  return (
    <section className="hint-panel" aria-label="Hints">
      <div className="hint-panel-header">
        <h2>Hints</h2>
        <button
          className="hint-button"
          disabled={revealedHintCount >= hints.length}
          onClick={onRevealHint}
          type="button"
        >
          Hint <span>H</span>
        </button>
      </div>
      <ol className="hint-list">
        {hints.map((hint, index) => (
          <li
            className={index < revealedHintCount ? "visible" : ""}
            key={`${hint}-${index}`}
          >
            {index < revealedHintCount ? hint : "Hidden"}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function App() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("setup");
  const [question, setQuestion] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [mode, setMode] = useState("normal");
  const [guess, setGuess] = useState("");
  const [submittedGuess, setSubmittedGuess] = useState("");
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [usedAnswerIds, setUsedAnswerIds] = useState([]);

  useEffect(() => {
    let active = true;

    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Dataset could not be loaded.");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setPayload(data);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const dinosaurs = payload?.dinosaurs ?? [];
  const countLabel = useMemo(
    () => (payload?.meta?.count ? payload.meta.count.toLocaleString() : ""),
    [payload]
  );
  const activeMode = useMemo(
    () => GAME_MODES.find((option) => option.id === mode) ?? GAME_MODES[0],
    [mode]
  );
  const questionPool = useMemo(
    () => dinosaursForDifficulty(dinosaurs, difficulty),
    [dinosaurs, difficulty]
  );
  const currentHints = useMemo(
    () => (question ? hintItems(question.answer) : []),
    [question]
  );

  function clearAnswerState() {
    setGuess("");
    setSubmittedGuess("");
    setRevealedHintCount(0);
  }

  function resetScore() {
    setScore(0);
    setStreak(0);
    setRound(0);
    setUsedAnswerIds([]);
    clearAnswerState();
  }

  function startGame() {
    if (!questionPool.length) return;

    resetScore();
    setQuestion(pickQuestion(questionPool));
    setScreen("playing");
  }

  function returnToSetup() {
    setScreen("setup");
    setQuestion(null);
    clearAnswerState();
  }

  function revealHint() {
    setRevealedHintCount((value) => Math.min(value + 1, currentHints.length));
  }

  function recordAnswer(correct) {
    if (question) {
      setUsedAnswerIds((ids) =>
        ids.includes(question.answer.id) ? ids : [...ids, question.answer.id]
      );
    }
    setRound((value) => value + 1);
    setScore((value) => value + (correct ? 1 : 0));
    setStreak((value) => (correct ? value + 1 : 0));
  }

  function submitGuess(event) {
    event.preventDefault();
    if (!question || submittedGuess) return;

    const cleanGuess = guess.trim();
    if (!cleanGuess) return;

    const correct = isCorrectGuess(cleanGuess, question.answer);
    setSubmittedGuess(cleanGuess);
    recordAnswer(correct);
  }

  function nextQuestion() {
    if (activeMode.roundLimit && round >= activeMode.roundLimit) {
      returnToSetup();
      return;
    }

    const usedIds =
      question && !usedAnswerIds.includes(question.answer.id)
        ? [...usedAnswerIds, question.answer.id]
        : usedAnswerIds;
    const pool = activeMode.roundLimit
      ? questionPool.filter((dinosaur) => !usedIds.includes(dinosaur.id))
      : questionPool;

    setQuestion(
      pickQuestion(pool.length ? pool : questionPool, question?.answer.id)
    );
    clearAnswerState();
  }

  useEffect(() => {
    if (screen !== "playing" || !question) return undefined;

    function handleKeyDown(event) {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable;

      if (isTyping || event.key.toLowerCase() !== "h") return;
      event.preventDefault();
      revealHint();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentHints.length, question, screen]);

  if (error) {
    return (
      <main className="app">
        <section className="empty-state">
          <h1>Dinoguessr</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="app">
        <section className="empty-state">
          <h1>Dinoguessr</h1>
          <p>Loading dinosaur records.</p>
        </section>
      </main>
    );
  }

  if (screen === "setup") {
    return (
      <StartScreen
        countLabel={countLabel}
        difficulty={difficulty}
        mode={mode}
        onChangeDifficulty={setDifficulty}
        onChangeMode={setMode}
        onStart={startGame}
      />
    );
  }

  if (!question) return null;

  const hasAnswered = submittedGuess !== "";
  const isCorrect =
    hasAnswered && isCorrectGuess(submittedGuess, question.answer);
  const isModeComplete =
    hasAnswered &&
    Boolean(activeMode.roundLimit) &&
    round >= activeMode.roundLimit;
  const currentRoundNumber = hasAnswered ? round : round + 1;
  const roundLabel = activeMode.roundLimit
    ? `${Math.min(currentRoundNumber, activeMode.roundLimit)}/${activeMode.roundLimit}`
    : `${currentRoundNumber}`;

  return (
    <main className="app playing-app">
      <section className="game-shell" aria-label="Dinoguessr game">
        <header className="topbar">
          <Logo />
          <div className="stats" aria-label="Game stats">
            <span>
              <strong>{score}</strong>
              Score
            </span>
            <span>
              <strong>{roundLabel}</strong>
              Round
            </span>
            <button
              className="end-game-button"
              onClick={returnToSetup}
              type="button"
            >
              End game
            </button>
          </div>
        </header>

        <div className="game-stage">
          <figure
            className={`photo-panel ${
              !hasAnswered && shouldMaskImage(question.answer) ? "masked" : ""
            }`}
          >
            <img
              src={question.answer.imageUrl}
              alt={
                hasAnswered
                  ? `${question.answer.name} clue image`
                  : "Dinosaur clue image"
              }
            />
            <ImageCredits dinosaur={question.answer} />
          </figure>

          <section className="bottom-panel">
            <HintPanel
              hints={currentHints}
              onRevealHint={revealHint}
              revealedHintCount={revealedHintCount}
            />
            <section className="answer-panel" aria-label="Answer">
              <GuessForm
                guess={guess}
                hasAnswered={hasAnswered}
                isCorrect={isCorrect}
                onChange={setGuess}
                onSubmit={submitGuess}
              />

              <div className="result-row" aria-live="polite">
                <p className={hasAnswered ? "result visible" : "result"}>
                  {hasAnswered
                    ? isCorrect
                      ? "Correct."
                      : `It was ${question.answer.name}.`
                    : " "}
                </p>
                <button
                  className="next-button"
                  disabled={!hasAnswered}
                  onClick={nextQuestion}
                  type="button"
                >
                  {isModeComplete ? "End game" : "Next"}
                </button>
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
