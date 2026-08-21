import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/* ── Focus Reader ─────────────────────────────────────────────────────────
 *
 * RSVP: one word at a time, held in place so the eye never has to move.
 *
 * The single thing that makes RSVP work rather than just look busy is that
 * the *recognition point* of each word stays on one fixed column of the
 * screen. Centring the whole word instead (which is what the previous build
 * of this app did) moves that point a few characters left or right on every
 * frame, which reintroduces exactly the micro-saccade the technique exists
 * to remove. Everything below - the grid, the pivot ticks, the per-word
 * timing - is in service of that one property.
 */

// ── Tokenising ────────────────────────────────────────────────────────────

interface Word {
  text: string;
  /** Index of the pivot character: the letter pinned to the centre column. */
  orp: number;
  endsSentence: boolean;
  endsParagraph: boolean;
}

/* Trailing "." that does not end a sentence. Not exhaustive and cannot be:
 * the goal is only to stop the reader taking a full stop-length beat in the
 * middle of "Dr. Mishra", which is noticeable at 400wpm. Anything missed
 * costs one slightly long pause, so the list is worth having and not worth
 * growing indefinitely. */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "eg", "ie",
  "fig", "no", "vol", "pp", "al", "inc", "ltd", "co", "approx", "dept", "est",
]);

/* Where the eye lands. These bands are the standard RSVP result: the
 * recognition point sits just left of the middle of the word and grows much
 * more slowly than the word does. A naive floor(len / 2) drifts right on
 * long words and reads visibly worse. */
function pivotIndex(length: number): number {
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
}

function tokenise(raw: string): Word[] {
  const normalised = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalised) return [];

  const words: Word[] = [];
  const paragraphs = normalised.split(/\n{2,}/);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const chunks = paragraph.split(/\s+/).filter(Boolean);
    const lastParagraph = paragraphIndex === paragraphs.length - 1;

    chunks.forEach((text, chunkIndex) => {
      // Closing quotes and brackets sit after the terminator, so the test has
      // to look through them: 'end."' and 'end.)' both end a sentence.
      const terminal = /[.!?]["'”’)\]]*$/.test(text);
      const stem = text.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
      const isAbbreviation = text.endsWith(".") && ABBREVIATIONS.has(stem);
      // A lone initial ("J." in "J. Smith") is an abbreviation too.
      const isInitial = /^\p{Lu}\.$/u.test(text);

      words.push({
        text,
        orp: pivotIndex(text.length),
        endsSentence: terminal && !isAbbreviation && !isInitial,
        endsParagraph: chunkIndex === chunks.length - 1 && !lastParagraph,
      });
    });
  });

  return words;
}

/* Per-word dwell time. A flat 60000/wpm interval is what makes most speed
 * readers feel like being shouted at: every word gets the same beat, so
 * punctuation vanishes and long words arrive and leave before they resolve.
 * The multipliers below are what a reader's own eye does anyway. */
function dwellFor(word: Word, wpm: number): number {
  const base = 60000 / wpm;
  const letters = word.text.replace(/[^\p{L}\p{N}]/gu, "").length;
  let factor = 1;

  if (letters <= 2) factor *= 0.86;
  else if (letters > 7) factor *= 1 + (letters - 7) * 0.045;

  if (/\d/.test(word.text)) factor *= 1.25; // digits do not read as a shape
  if (/[,;:]["'”’)\]]*$/.test(word.text)) factor *= 1.45;
  if (word.endsSentence) factor *= 1.9;
  if (word.endsParagraph) factor *= 2.5;

  return base * factor;
}

/* Starting cold on a full-speed word loses the first two or three every
 * time, so a resumed run eases in over its first few words. */
const RESUME_RAMP = [1.75, 1.4, 1.18];

function sentenceStarts(words: Word[]): number[] {
  const starts = [0];
  for (let i = 0; i < words.length - 1; i += 1) {
    if (words[i].endsSentence || words[i].endsParagraph) starts.push(i + 1);
  }
  return starts;
}

// ── Text extraction ───────────────────────────────────────────────────────

async function extractPdf(file: File, onProgress: (msg: string) => void) {
  onProgress("loading pdf engine");
  // Dynamic: pdf.js is several hundred kilobytes and most visitors paste
  // text rather than open a document. It has no business in the first load.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];

  for (let n = 1; n <= doc.numPages; n += 1) {
    onProgress(`reading page ${n} of ${doc.numPages}`);
    const content = await (await doc.getPage(n)).getTextContent();

    /* A PDF has no paragraphs. It has glyphs at coordinates, and the only
     * trace of a paragraph left in the file is that the gap to the next
     * baseline is bigger than a normal line's. Ignoring that (joining every
     * line with a space, which is the usual one-liner) hands back one
     * undifferentiated block, and the reader then loses every paragraph
     * pause in a document. So: rebuild lines, then read the gaps. */
    const lines: { y: number; text: string }[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const y = item.transform[5] as number;
      const last = lines[lines.length - 1];
      // Same baseline within a point: still the same line, just a new run
      // (a font change, a ligature, a superscript).
      if (last && Math.abs(last.y - y) < 1.5) {
        last.text += last.text.endsWith(" ") || item.str.startsWith(" ") ? item.str : ` ${item.str}`;
      } else {
        lines.push({ y, text: item.str });
      }
    }

    // The median gap is the body leading. Anything meaningfully larger is a
    // paragraph, a heading, or a section break. Median rather than mean so
    // one big gap on the page cannot drag the threshold past itself.
    const gaps = lines
      .slice(1)
      .map((line, i) => Math.abs(lines[i].y - line.y))
      .filter((g) => g > 0.5)
      .sort((a, z) => a - z);
    const leading = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

    let page = "";
    lines.forEach((line, i) => {
      if (i > 0) {
        const gap = Math.abs(lines[i - 1].y - line.y);
        page += leading > 0 && gap > leading * 1.45 ? "\n\n" : "\n";
      }
      page += line.text.trim();
    });
    pages.push(page);
  }

  await doc.destroy();

  return (
    pages
      .join("\n\n")
      // Words broken across a line by a typesetter's hyphen are one word.
      .replace(/(\p{Ll})-\n(?!\n)(\p{Ll})/gu, "$1$2")
      // Every remaining single newline is a line wrap, not a paragraph.
      .replace(/([^\n])\n(?!\n)/g, "$1 ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
  );
}

async function readFile(file: File, onProgress: (msg: string) => void) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file, onProgress);
  }
  if (/\.(txt|md|markdown|rtf|csv|json|log)$/.test(name) || file.type.startsWith("text/")) {
    return file.text();
  }
  throw new Error(`${file.name} is not a text or PDF file.`);
}

// ── Persistence ───────────────────────────────────────────────────────────

const STORE_KEY = "focus-reader:v1";
/* A pasted book is a few megabytes and localStorage is a ~5MB budget shared
 * with the whole origin. Above this the position is still worth keeping;
 * the text is not, and trying costs a thrown quota error. */
const STORE_LIMIT = 400_000;

interface Saved {
  text: string;
  index: number;
  wpm: number;
}

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (typeof parsed?.text !== "string" || !parsed.text.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────

/* The sample is the manual. It explains the technique while demonstrating
 * it, which is the only form of instructions anyone reads. */
const SAMPLE = `Your eyes are not reading this line smoothly. They are jumping along it in short hops, stopping four or five times a second, and most of the work is the jumping rather than the reading.

Rapid serial visual presentation removes the jumping. One word appears where the last one was, so there is nothing to hop to. The coloured letter is the pivot: it stays on the same column of the screen no matter how long or short the word is, which is what lets you sit still and let the text move instead.

Try the speed control. Most people start somewhere near 300 words a minute and find that 450 is still comfortable after a page or two. Push it until you lose the thread, then come back down a notch, and stay there.

Punctuation is timed rather than shown. A comma holds a little longer, a full stop longer again, and a paragraph break longest of all, so the shape of the writing survives even though you are only ever seeing one word.

Press space to pause. When you do, the sentence you are inside fades in underneath, so you can find your place before starting again.`;

// ── Formatting ────────────────────────────────────────────────────────────

function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const NUMBER = new Intl.NumberFormat("en-US");

// ── Component ─────────────────────────────────────────────────────────────

type Stage = "compose" | "read";

export default function FocusReader() {
  const [stage, setStage] = useState<Stage>("compose");
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState("");
  const [index, setIndex] = useState(0);
  const [wpm, setWpm] = useState(320);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resume, setResume] = useState<Saved | null>(null);
  const [elapsed, setElapsed] = useState(0);
  /* Words actually shown while playing, which is not the same as the index:
     scrubbing to word 900 and reading three of them is a three-word session,
     and reporting it as 900 would make the finish stats a flattering lie. */
  const [advanced, setAdvanced] = useState(0);

  const words = useMemo(() => tokenise(source), [source]);
  const starts = useMemo(() => sentenceStarts(words), [words]);
  const draftCount = useMemo(
    () => draft.trim().split(/\s+/).filter(Boolean).length,
    [draft],
  );

  const finished = words.length > 0 && index >= words.length - 1 && !playing;
  const current = words[Math.min(index, Math.max(0, words.length - 1))];

  const fileInput = useRef<HTMLInputElement>(null);
  const rampRef = useRef(0);
  const tickRef = useRef(0);

  // ── Restore ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSaved();
    if (saved && saved.text.trim()) {
      setResume(saved);
      setWpm(saved.wpm ?? 320);
    }
  }, []);

  const persist = useCallback(
    (text: string, at: number, speed: number) => {
      if (!text || text.length > STORE_LIMIT) return;
      try {
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ text, index: at, wpm: speed } satisfies Saved),
        );
      } catch {
        /* Quota, private mode, or storage disabled. Losing the bookmark is
           not worth interrupting the read over. */
      }
    },
    [],
  );

  useEffect(() => {
    if (stage !== "read" || !source) return;
    persist(source, index, wpm);
  }, [stage, source, index, wpm, persist]);

  // ── The word loop ───────────────────────────────────────────────────────
  //
  // A self-scheduling timeout rather than one interval: every word has its
  // own dwell time, so there is no single interval to set.
  useEffect(() => {
    if (!playing || words.length === 0) return;

    if (index >= words.length - 1) {
      const hold = window.setTimeout(() => setPlaying(false), dwellFor(words[index], wpm));
      return () => window.clearTimeout(hold);
    }

    const ramp = RESUME_RAMP[rampRef.current] ?? 1;
    const delay = dwellFor(words[index], wpm) * ramp;
    rampRef.current += 1;

    const id = window.setTimeout(() => {
      setIndex((i) => i + 1);
      setAdvanced((a) => a + 1);
    }, delay);
    return () => window.clearTimeout(id);
  }, [playing, index, wpm, words]);

  // Elapsed clock. Separate from the word loop so a pause stops the timer
  // without disturbing word scheduling.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // The delta has to be resolved here, not inside the updater. React
      // runs an updater lazily during the next render, by which point the
      // line below has already moved `last` to `now` and every tick
      // measures itself as zero. That is what froze this clock at 0:00.
      const delta = now - last;
      last = now;
      setElapsed((e) => e + delta);
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  // ── Transport ───────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (words.length === 0) return;
    rampRef.current = 0;
    setIndex((i) => (i >= words.length - 1 ? 0 : i));
    setPlaying(true);
  }, [words.length]);

  const restart = useCallback(() => {
    setElapsed(0);
    setAdvanced(0);
    rampRef.current = 0;
    setIndex(0);
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  const seek = useCallback(
    (to: number) => {
      rampRef.current = 0;
      setIndex(Math.max(0, Math.min(words.length - 1, to)));
    },
    [words.length],
  );

  const seekSentence = useCallback(
    (direction: -1 | 1) => {
      if (starts.length === 0) return;
      if (direction === 1) {
        const next = starts.find((s) => s > index);
        seek(next ?? words.length - 1);
        return;
      }
      // Back goes to the start of the current sentence first, which is what
      // "again" means when you have lost the thread mid-sentence, and only
      // to the previous one if you are already there.
      let start = 0;
      for (const s of starts) {
        if (s >= index) break;
        start = s;
      }
      if (start === index) {
        const before = [...starts].reverse().find((s) => s < index);
        start = before ?? 0;
      }
      seek(start);
    },
    [starts, index, words.length, seek],
  );

  const adjustSpeed = useCallback((delta: number) => {
    setWpm((w) => Math.max(100, Math.min(900, Math.round((w + delta) / 10) * 10)));
    setStatus(null);
  }, []);

  const begin = useCallback(
    (text: string, at = 0) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("There is nothing to read yet. Paste some text or open a file.");
        return;
      }
      setError(null);
      setSource(trimmed);
      setIndex(at);
      setElapsed(0);
      setAdvanced(0);
      setStage("read");
      rampRef.current = 0;
      // One beat on the first word before it starts moving, so the reader
      // sees where the pivot is before anything happens there.
      tickRef.current = window.setTimeout(() => setPlaying(true), 550);
    },
    [],
  );

  useEffect(() => () => window.clearTimeout(tickRef.current), []);

  const compose = useCallback(() => {
    setPlaying(false);
    setStage("compose");
    setDraft(source);
    setStatus(null);
  }, [source]);

  // ── Files ───────────────────────────────────────────────────────────────

  const ingest = useCallback(async (file: File) => {
    setError(null);
    setStatus(`opening ${file.name}`);
    try {
      const text = await readFile(file, setStatus);
      if (!text.trim()) {
        throw new Error("That file has no extractable text. Scanned PDFs are images, not words.");
      }
      setDraft(text.trim());
      setStatus(`${NUMBER.format(text.trim().split(/\s+/).length)} words from ${file.name}`);
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : "That file could not be read.");
    }
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== "read") return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Sliders are keyboard-operable in their own right; do not steal their
      // arrows out from under them while they are focused.
      if (target?.matches("input, textarea, select")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          toggle();
          break;
        case "ArrowLeft":
          event.preventDefault();
          event.shiftKey ? seekSentence(-1) : seek(index - 1);
          break;
        case "ArrowRight":
          event.preventDefault();
          event.shiftKey ? seekSentence(1) : seek(index + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          adjustSpeed(25);
          break;
        case "ArrowDown":
          event.preventDefault();
          adjustSpeed(-25);
          break;
        case "r":
        case "R":
          seek(0);
          break;
        case "Escape":
          compose();
          break;
        default:
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, index, toggle, seek, seekSentence, adjustSpeed, compose]);

  // ── Derived readouts ────────────────────────────────────────────────────

  const remaining = words.length ? Math.max(0, words.length - index - 1) : 0;
  const progress = words.length > 1 ? index / (words.length - 1) : 0;
  const etaMs = (remaining / wpm) * 60000;
  // The first word is shown without a transition, so a session that
  // advanced n times has put n + 1 words on screen.
  const wordsRead = advanced > 0 ? advanced + 1 : 0;
  const effectiveWpm =
    elapsed > 2000 && wordsRead > 4 ? Math.round((wordsRead / elapsed) * 60000) : null;

  // The sentence around the current word, revealed on pause. Held out of the
  // reading view on purpose: something to read beside the word is something
  // for the eye to jump to, which is the habit this is trying to break.
  const contextWords = useMemo(() => {
    if (!words.length) return [];
    let from = 0;
    for (const s of starts) {
      if (s > index) break;
      from = s;
    }
    let to = words.length;
    for (let i = index; i < words.length; i += 1) {
      if (words[i].endsSentence || words[i].endsParagraph) {
        to = i + 1;
        break;
      }
    }
    return words.slice(from, to).map((w, i) => ({ text: w.text, at: from + i }));
  }, [words, starts, index]);

  // ── Compose ─────────────────────────────────────────────────────────────

  if (stage === "compose") {
    return (
      <div className="fr-compose">
        <header className="fr-intro">
          <p className="fr-kicker">Focus Reader</p>
          <h1 className="fr-title">Read at the speed you think.</h1>
          <p className="fr-lede">
            One word at a time, pinned so your eyes never have to move. Paste something,
            drop in a PDF, or take the sample for a run.
          </p>
        </header>

        {resume ? (
          <div className="fr-resume">
            <div>
              <p className="fr-resume-label">Where you left off</p>
              <p className="fr-resume-snippet">
                {resume.text.slice(0, 96).trim()}
                {resume.text.length > 96 ? "..." : ""}
              </p>
            </div>
            <button
              type="button"
              className="fr-button fr-button-quiet"
              onClick={() => begin(resume.text, resume.index)}
            >
              Resume
            </button>
          </div>
        ) : null}

        <div
          className={`fr-drop${dragging ? " is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void ingest(file);
          }}
        >
          <textarea
            className="fr-textarea"
            value={draft}
            spellCheck={false}
            onChange={(e) => {
              setDraft(e.target.value);
              setStatus(null);
              setError(null);
            }}
            placeholder="Paste text here, or drop a .txt, .md or .pdf anywhere on this panel."
            aria-label="Text to read"
          />
          <div className="fr-drop-veil" aria-hidden="true">
            <span>Drop to open</span>
          </div>
        </div>

        <div className="fr-compose-bar">
          <div className="fr-compose-actions">
            <button
              type="button"
              className="fr-button fr-button-quiet"
              onClick={() => fileInput.current?.click()}
            >
              Open a file
            </button>
            <button
              type="button"
              className="fr-button fr-button-quiet"
              onClick={() => {
                setDraft(SAMPLE);
                setStatus(null);
                setError(null);
              }}
            >
              Use the sample
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.markdown,.csv,.json,.log,.pdf,text/plain,application/pdf"
              className="fr-file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void ingest(file);
                e.target.value = "";
              }}
            />
          </div>

          <p className="fr-meter" role="status">
            {error ? (
              <span className="fr-meter-error">{error}</span>
            ) : status ? (
              <span className="fr-meter-status">{status}</span>
            ) : draftCount > 0 ? (
              <>
                {NUMBER.format(draftCount)} words
                <span className="fr-meter-sep">/</span>
                about {Math.max(1, Math.round(draftCount / wpm))} min at {wpm} wpm
              </>
            ) : (
              <span className="fr-meter-idle">waiting for text</span>
            )}
          </p>
        </div>

        <button
          type="button"
          className="fr-button fr-button-primary"
          onClick={() => begin(draft)}
          disabled={draftCount === 0}
        >
          Start reading
        </button>
      </div>
    );
  }

  // ── Read ────────────────────────────────────────────────────────────────

  const before = current.text.slice(0, current.orp);
  const pivot = current.text.charAt(current.orp);
  const after = current.text.slice(current.orp + 1);

  return (
    <div className="fr-read">
      <div className="fr-hud" role="group" aria-label="Reading status">
        <span className="fr-chip">
          <span className="fr-chip-label">word</span>
          <span className="fr-chip-value">
            {NUMBER.format(index + 1)}/{NUMBER.format(words.length)}
          </span>
        </span>
        <span className="fr-chip">
          <span className="fr-chip-label">left</span>
          <span className="fr-chip-value">{clock(etaMs)}</span>
        </span>
        <span className="fr-chip">
          <span className="fr-chip-label">elapsed</span>
          <span className="fr-chip-value">{clock(elapsed)}</span>
        </span>
        {effectiveWpm ? (
          <span className="fr-chip">
            <span className="fr-chip-label">actual</span>
            <span className="fr-chip-value">{effectiveWpm} wpm</span>
          </span>
        ) : null}
      </div>

      {/* The word display is decorative to a screen reader: firing a live
          region five times a second is unusable. The full text is exposed
          once, below, and the transport is properly labelled. */}
      <div
        className="fr-stage"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause reading" : "Start reading"}
        onKeyDown={(e) => {
          if (e.key === "Enter") toggle();
        }}
      >
        {/* The ticks live in the same box as the word so they bracket it
            exactly. Hung off the stage instead, they drifted with whatever
            was below and ended up printed through the context line. */}
        <div className="fr-word-row">
          <span className="fr-tick fr-tick-top" aria-hidden="true" />
          <p
            className="fr-word"
            aria-hidden="true"
            data-long={current.text.length > 13 ? "" : undefined}
            data-longer={current.text.length > 20 ? "" : undefined}
          >
            <span className="fr-word-pre">{before}</span>
            <span className="fr-word-pivot">{pivot}</span>
            <span className="fr-word-post">{after}</span>
          </p>
          <span className="fr-tick fr-tick-bottom" aria-hidden="true" />
        </div>

        <div className={`fr-context${playing ? "" : " is-shown"}`} aria-hidden="true">
          {contextWords.map((w) => (
            <span key={w.at} className={w.at === index ? "is-current" : undefined}>
              {w.text}{" "}
            </span>
          ))}
        </div>
      </div>

      {finished ? (
        <div className="fr-done">
          <p className="fr-done-title">Finished</p>
          <p className="fr-done-stats">
            {NUMBER.format(wordsRead)} words in {clock(elapsed)}
            {effectiveWpm ? ` at ${effectiveWpm} wpm` : ""}
          </p>
          <div className="fr-done-actions">
            <button type="button" className="fr-button fr-button-quiet" onClick={restart}>
              Read again
            </button>
            <button type="button" className="fr-button fr-button-quiet" onClick={compose}>
              New text
            </button>
          </div>
        </div>
      ) : null}

      <div className="fr-transport">
        <input
          className="fr-scrub"
          type="range"
          min={0}
          max={Math.max(0, words.length - 1)}
          value={index}
          style={{ "--fr-fill": `${progress * 100}%` } as React.CSSProperties}
          onChange={(e) => {
            pause();
            seek(Number(e.target.value));
          }}
          aria-label="Position in text"
          aria-valuetext={`word ${index + 1} of ${words.length}`}
        />

        <div className="fr-controls">
          <div className="fr-buttons">
            <button
              type="button"
              className="fr-icon"
              onClick={() => seekSentence(-1)}
              aria-label="Previous sentence"
            >
              <Glyph d="M6 4v12M17 4l-8 6 8 6z" />
            </button>
            <button
              type="button"
              className="fr-icon"
              onClick={() => { pause(); seek(index - 1); }}
              aria-label="Previous word"
            >
              <Glyph d="M13 4l-8 6 8 6z" />
            </button>
            <button
              type="button"
              className="fr-icon fr-icon-main"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Glyph d="M6 4h3v12H6zM11 4h3v12h-3z" fill /> : <Glyph d="M6 3l11 7-11 7z" fill />}
            </button>
            <button
              type="button"
              className="fr-icon"
              onClick={() => { pause(); seek(index + 1); }}
              aria-label="Next word"
            >
              <Glyph d="M7 4l8 6-8 6z" />
            </button>
            <button
              type="button"
              className="fr-icon"
              onClick={() => seekSentence(1)}
              aria-label="Next sentence"
            >
              <Glyph d="M14 4v12M3 4l8 6-8 6z" />
            </button>
          </div>

          <label className="fr-speed">
            <span className="fr-speed-label">speed</span>
            <input
              type="range"
              min={100}
              max={900}
              step={10}
              value={wpm}
              style={{ "--fr-fill": `${((wpm - 100) / 800) * 100}%` } as React.CSSProperties}
              onChange={(e) => setWpm(Number(e.target.value))}
              aria-label="Words per minute"
            />
            <span className="fr-speed-value">{wpm}<i>wpm</i></span>
          </label>

          <button type="button" className="fr-button fr-button-quiet fr-exit" onClick={compose}>
            New text
          </button>
        </div>

        <p className="fr-keys" aria-hidden="true">
          <span><kbd>space</kbd> play</span>
          <span><kbd>←</kbd><kbd>→</kbd> word</span>
          <span><kbd>shift</kbd> + <kbd>←</kbd><kbd>→</kbd> sentence</span>
          <span><kbd>↑</kbd><kbd>↓</kbd> speed</span>
          <span><kbd>R</kbd> restart</span>
          <span><kbd>esc</kbd> back</span>
        </p>
      </div>

      <p className="fr-sr-text">{source}</p>
    </div>
  );
}

function Glyph({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d={d}
        fill={fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={fill ? 0 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
