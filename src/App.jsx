import React, { useEffect, useMemo, useRef, useState } from "react";
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
const HINT_SHORTCUT_LABEL = "?";

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
      {/* Source: https://www.svgrepo.com/svg/323515/t-rex-skull */}
      <svg
        aria-hidden="true"
        className="wordmark-mark"
        focusable="false"
        viewBox="0 0 512 512"
      >
        <path
          d="M139.5 38.28c-40.73.57-73.1 25.79-105.61 38.33-10.02 24.79-8.26 51.99 9.02 68.09 11.76-10.8 76.19-44.94 95.09-44.6 27 14.8 17.5 76.1 3.7 94.8-6.1 8.1-32.4 7.1-40.7-1.1 6.6-16 13.3-31.9 32.5-45.4-7.4-27-60.6 2.6-83.47 8.9l-1.4 53.1c-70.79 19.7-3.9 91.9 22.05 112.8-.99 33.2 8.19 61.7 69.32 70 66.7 28.1 115.6 71.6 189.6 80.5 50.7 1.2 59.2-18.5 52.8-55.6 11.5-20.2 19.1-41.1 16.1-63.9-10 18.7-29.5 36.5-48.2 48.5-3.4-1.1-6.7-2.4-10-3.7 9.9-17.8 18.1-36.1 18-56.6-13.6 17.5-27.8 33.7-45.3 44.8-8.2-4.1-16-8.5-23.4-13.2 14.1-13.4 19.3-30.3 25.4-46.7-14 12.4-33.4 19.7-54 25.8-4.6-4-9.2-8.2-13.7-12.6l13.1-31.1-24 19.7c-5.8-6.4-11.5-13.3-17.1-20.6l9.5-25.3-18.2 13.7c-10-17.3-24.4-30-29.2-34.1 3.6-21.7 33.5-46.6 33.5-46.6 16.8-3.3 28.4 2.8 42.2 7.8l-4.6 23.2 22.8-16.4c2.9 1 5.9 2.1 8.9 3.3l-5.4 27.5 24.9-20.3c9.2 3.4 18.5 6.7 27.7 9.8-4.6 13.9-14.2 26.7-23 39.6 18.6-8.8 38.5-16.2 51.2-31 9.1 2.5 18.2 4.7 27.2 6.4-3.8 17.8-11 34.5-20.8 50.4 23-12.8 41.2-27.5 48.4-46.6 6.4.5 12.7.7 18.9.6 3.3 21-1 42-7 63 19.6-20.5 40-40.8 43.8-67.6 3.4-.8 6.8-1.7 10.2-2.9 2.3-23.3-.6-20.9 14.6-36 .8-41.2-30.6-68.6-78-89.2l-125.3-28.2c-18-17.67-29.4-38.97-84.4-47.33-20.2-13.45-46.1-24.31-67.7-23.99zm73.1 64.12c9.5 22.5-10.4 71-11.5 72.3-21.2-3.2-3-58.3-19.8-72.3 5.5-13.83 28.4-9.68 31.3 0zm31.6 14.2c41.9 7.9 77.7 32.5 81.4 52.4 2.2 11.6 1.5 20.8-6.3 25.8-3.7-8-10.7-11.9-22.3-10.3-6.7-23.4-46.5-7.6-60.6-3.6-4.1-26.5 1-39 7.8-64.3zM361 161.2c6.5-.3 12.3 2.9 13.6 10.3.8 24.9-33.1 32.6-31.9 6.3 1.1-10.3 10.2-16.3 18.3-16.6zm53.2 1.2s38 5.8 51.1 18.3c8.4 7.9 13.4 31.9 13.4 31.9-2.9-10.7-60.1-48.9-64.5-50.2zm-283.7 52.5c18.9-.2 37.6.9 54.2 3.2L154 248.8c-26.9-2.1-60.19-18.4-79.63-30 17.91-2.5 37.23-3.8 56.13-3.9zm-36.28 43.9c8.28-.3 17.08 18.3 8.18 24.3-6.14 3.4-16.46-6.3-16.46-13.3 1.96-7.9 5.11-10.9 8.28-11z"
          fill="currentColor"
        />
      </svg>
      <h1>Dinoguessr</h1>
    </div>
  );
}

function EnterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="enter-icon"
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path
        d="M14 4v5c0 2-1 3-3 3H5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m8 8-4 4 4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="github-icon"
      focusable="false"
      viewBox="0 0 16 16"
    >
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.7 7.7 0 0 1 8 3.89c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GitHubLink() {
  return (
    <a
      aria-label="GitHub repository"
      className="github-link"
      href="https://github.com/soohoonc/dinoguessr"
      rel="noreferrer"
      target="_blank"
    >
      <GitHubIcon />
    </a>
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
  difficulty,
  mode,
  onChangeDifficulty,
  onChangeMode,
  onStart
}) {
  return (
    <main className="app setup-app">
      <GitHubLink />
      <section className="setup-shell" aria-label="Dinoguessr setup">
        <header className="setup-header">
          <Logo />
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

function GuessForm({
  guess,
  hasAnswered,
  inputRef,
  isCorrect,
  onChange,
  onSkip,
  onSubmit
}) {
  const canGuess = !hasAnswered && Boolean(guess.trim());

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
          autoFocus
          disabled={hasAnswered}
          id="guess-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. Iguanodon"
          ref={inputRef}
          spellCheck="false"
          type="text"
          value={guess}
        />
        <button disabled={!canGuess} type="submit">
          Guess
          {canGuess && <EnterIcon />}
        </button>
        <button
          className="skip-button"
          disabled={hasAnswered}
          onClick={onSkip}
          type="button"
        >
          Skip
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
          aria-label="Reveal hint, question mark"
          className="hint-button"
          disabled={revealedHintCount >= hints.length}
          onClick={onRevealHint}
          type="button"
        >
          Hint{" "}
          <span className="shortcut-keys" aria-hidden="true">
            <kbd>{HINT_SHORTCUT_LABEL}</kbd>
          </span>
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

function ResultsScreen({
  activeMode,
  difficulty,
  history,
  onPlayAgain,
  onSetup,
  score
}) {
  const total = history.length;
  const missed = history.filter((entry) => !entry.correct);
  const visibleMisses = missed.slice(0, 10);
  const remainingMisses = missed.length - visibleMisses.length;
  const roundTotal =
    activeMode.roundLimit && total >= activeMode.roundLimit
      ? activeMode.roundLimit
      : total;

  return (
    <main className="app results-app">
      <GitHubLink />
      <section className="results-shell" aria-label="Game results">
        <header className="results-header">
          <Logo />
          <div className="results-score" aria-label="Final score">
            <span>Score</span>
            <strong>
              {score}/{roundTotal}
            </strong>
          </div>
        </header>

        <div className="results-meta">
          <span>
            {DIFFICULTIES.find((option) => option.id === difficulty)?.label}
          </span>
          <span>{activeMode.label}</span>
          <span>{total} rounds</span>
        </div>

        <section className="missed-section" aria-label="Missed dinosaurs">
          <h2>{missed.length ? "Missed" : "Perfect"}</h2>
          {missed.length ? (
            <ol className="missed-list">
              {visibleMisses.map((entry) => (
                <li className="missed-card" key={`${entry.id}-${entry.round}`}>
                  <img src={entry.imageUrl} alt="" />
                  <div>
                    <strong>{entry.name}</strong>
                    <span>
                      {entry.skipped ? "Skipped" : `Guessed ${entry.guess}`}
                    </span>
                  </div>
                </li>
              ))}
              {remainingMisses > 0 && (
                <li className="missed-card more-misses">
                  <div>
                    <strong>+{remainingMisses} more</strong>
                    <span>Missed in Zen</span>
                  </div>
                </li>
              )}
            </ol>
          ) : (
            <p className="perfect-copy">No misses.</p>
          )}
        </section>

        <div className="results-actions">
          <button className="start-button" onClick={onPlayAgain} type="button">
            Play again
          </button>
          <button className="secondary-button" onClick={onSetup} type="button">
            Change mode
          </button>
        </div>
      </section>
    </main>
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
  const [answerResult, setAnswerResult] = useState(null);
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [usedAnswerIds, setUsedAnswerIds] = useState([]);
  const [roundHistory, setRoundHistory] = useState([]);
  const guessInputRef = useRef(null);

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

  useEffect(() => {
    if (screen !== "playing" || !question || answerResult) return;
    guessInputRef.current?.focus();
  }, [answerResult, question, screen]);

  function clearAnswerState() {
    setGuess("");
    setAnswerResult(null);
    setRevealedHintCount(0);
  }

  function resetScore() {
    setScore(0);
    setStreak(0);
    setRound(0);
    setUsedAnswerIds([]);
    setRoundHistory([]);
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

  function showResults() {
    setScreen("results");
    setQuestion(null);
    clearAnswerState();
  }

  function endGame() {
    if (roundHistory.length > 0) {
      showResults();
      return;
    }

    returnToSetup();
  }

  function revealHint() {
    setRevealedHintCount((value) => Math.min(value + 1, currentHints.length));
  }

  function recordAnswer({ correct, guess: recordedGuess = "", skipped }) {
    if (!question) return;

    const answer = question.answer;
    const entry = {
      correct,
      guess: recordedGuess,
      id: answer.id,
      imageUrl: answer.imageUrl,
      name: answer.name,
      round: round + 1,
      skipped
    };

    setUsedAnswerIds((ids) =>
      ids.includes(answer.id) ? ids : [...ids, answer.id]
    );
    setRound((value) => value + 1);
    setScore((value) => value + (correct ? 1 : 0));
    setStreak((value) => (correct ? value + 1 : 0));
    setRoundHistory((history) => [...history, entry]);
  }

  function submitGuess(event) {
    event.preventDefault();
    if (!question || answerResult) return;

    const cleanGuess = guess.trim();
    if (!cleanGuess) return;

    const correct = isCorrectGuess(cleanGuess, question.answer);
    setAnswerResult({ correct, guess: cleanGuess, skipped: false });
    recordAnswer({ correct, guess: cleanGuess, skipped: false });
  }

  function skipQuestion() {
    if (!question || answerResult) return;

    setGuess("");
    setAnswerResult({ correct: false, guess: "", skipped: true });
    recordAnswer({ correct: false, skipped: true });
  }

  function nextQuestion() {
    if (activeMode.roundLimit && round >= activeMode.roundLimit) {
      showResults();
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
      const shouldLetFocusedControlHandleEnter =
        tagName === "a" ||
        tagName === "summary" ||
        (tagName === "button" && !target.disabled);
      const isHintShortcut =
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key === HINT_SHORTCUT_LABEL;

      if (event.key === "Enter") {
        if (
          !answerResult ||
          isTyping ||
          shouldLetFocusedControlHandleEnter ||
          event.repeat
        ) {
          return;
        }
        event.preventDefault();
        nextQuestion();
        return;
      }

      if (!isHintShortcut) return;
      event.preventDefault();
      revealHint();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentHints.length, question, screen, answerResult]);

  if (error) {
    return (
      <main className="app">
        <GitHubLink />
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
        <GitHubLink />
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
        difficulty={difficulty}
        mode={mode}
        onChangeDifficulty={setDifficulty}
        onChangeMode={setMode}
        onStart={startGame}
      />
    );
  }

  if (screen === "results") {
    return (
      <ResultsScreen
        activeMode={activeMode}
        difficulty={difficulty}
        history={roundHistory}
        onPlayAgain={startGame}
        onSetup={returnToSetup}
        score={score}
      />
    );
  }

  if (!question) return null;

  const hasAnswered = Boolean(answerResult);
  const isCorrect = Boolean(answerResult?.correct);
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
      <GitHubLink />
      <section className="game-shell" aria-label="Dinoguessr game">
        <header className="topbar">
          <Logo />
          <div className="stats" aria-label="Game stats">
            <span>
              Score: <strong>{score}</strong>
            </span>
            <span>
              Round: <strong>{roundLabel}</strong>
            </span>
            <button
              className="end-game-button"
              onClick={endGame}
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
                inputRef={guessInputRef}
                isCorrect={isCorrect}
                onChange={setGuess}
                onSkip={skipQuestion}
                onSubmit={submitGuess}
              />

              <div className="result-row" aria-live="polite">
                <p className={hasAnswered ? "result visible" : "result"}>
                  {hasAnswered
                    ? isCorrect
                      ? "Correct."
                      : answerResult?.skipped
                        ? `Skipped. It was ${question.answer.name}.`
                      : `It was ${question.answer.name}.`
                    : " "}
                </p>
                <button
                  className="next-button"
                  disabled={!hasAnswered}
                  onClick={nextQuestion}
                  type="button"
                >
                  {isModeComplete ? "Results" : "Next"}
                  {hasAnswered && <EnterIcon />}
                </button>
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
