"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { CornerDownLeft, Terminal, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useHud } from "@/context/HudContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { PROJECTS_REGISTRY } from "@/data/projects.registry";
import { getHudDrawerTransition } from "@/lib/hud-motion";
import {
  getWorldlineReadout,
  getAutocomplete,
  getCommandEcho,
  getHistoryCommand,
  isSensitiveCommand,
  runCliCommand,
  type CliLine,
} from "@/lib/cli-commands";
import { TerminalOutput, type TerminalEntry } from "./TerminalOutput";
import "./terminal.css";

const BOOT_ENTRY: TerminalEntry = {
  id: 0,
  prompt: "",
  lines: [
    { text: "MIC-SP // SYSTEMS CONSOLE", tone: "accent" },
    {
      text: "Local interface online. Type help, or choose a command below.",
      tone: "muted",
    },
  ],
};

export function DropDownTerminal() {
  const { isTerminalOpen, worldlineRequestId } = useHud();
  const reducedMotion = useMotionPreference();
  const [entries, setEntries] = useState<TerminalEntry[]>([BOOT_ENTRY]);
  const [history, setHistory] = useState<string[]>([]);
  const sequence = useRef(0);
  const lastWorldlineRequest = useRef(0);
  useEffect(() => {
    if (
      !worldlineRequestId ||
      worldlineRequestId === lastWorldlineRequest.current
    )
      return;
    const frame = requestAnimationFrame(() => {
      if (worldlineRequestId === lastWorldlineRequest.current) return;
      lastWorldlineRequest.current = worldlineRequestId;
      const entry: TerminalEntry = {
        id: ++sequence.current,
        prompt: "",
        lines: getWorldlineReadout().lines,
      };
      setEntries((current) => [...current.slice(-99), entry]);
    });
    return () => cancelAnimationFrame(frame);
  }, [worldlineRequestId]);

  function addEntry(prompt: string) {
    const id = ++sequence.current;
    setEntries((current) => [...current.slice(-99), { id, prompt, lines: [] }]);
    return id;
  }
  function updateEntry(id: number, lines: CliLine[]) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, lines } : entry)),
    );
  }
  function remember(command: string) {
    const safe = getHistoryCommand(command);
    if (safe)
      setHistory((current) =>
        current.at(-1) === safe ? current : [...current.slice(-99), safe],
      );
  }
  function clear() {
    setEntries([]);
    setHistory([]);
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false}>
        {isTerminalOpen && (
          <motion.aside
            key="developer-console"
            id="developer-console"
            className="drop-down-terminal"
            role="dialog"
            aria-modal="false"
            aria-label="Developer console"
            initial={{ y: reducedMotion ? 0 : "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reducedMotion ? 0 : "-100%", opacity: 0 }}
            transition={getHudDrawerTransition(reducedMotion)}
          >
            <TerminalPanel
              entries={entries}
              history={history}
              addEntry={addEntry}
              updateEntry={updateEntry}
              remember={remember}
              clear={clear}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

interface PanelProps {
  entries: TerminalEntry[];
  history: string[];
  addEntry: (prompt: string) => number;
  updateEntry: (id: number, lines: CliLine[]) => void;
  remember: (command: string) => void;
  clear: () => void;
}

function TerminalPanel({
  entries,
  history,
  addEntry,
  updateEntry,
  remember,
  clear,
}: PanelProps) {
  const hud = useHud();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const cursor = useRef<number | null>(null);
  const draft = useRef("");

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    );
    return () => {
      cancelAnimationFrame(frame);
      request.current?.abort();
      const target =
        previous?.isConnected && previous !== document.body
          ? previous
          : document.querySelector<HTMLElement>("[data-terminal-trigger]");
      target?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }, [entries, busy]);

  async function submit(value: string) {
    if (!value.trim() || !hud.isTerminalOpen) return;
    const isClear = /^\s*clear\s*$/i.test(value);
    if (isClear) {
      request.current?.abort();
      locked.current = false;
      setBusy(false);
      clear();
      setInput("");
      setSuggestions([]);
      cursor.current = null;
      draft.current = "";
      return;
    }
    if (locked.current) return;
    locked.current = true;
    const controller = new AbortController();
    request.current = controller;
    const id = addEntry(getCommandEcho(value));
    remember(value);
    setInput("");
    setSuggestions([]);
    cursor.current = null;
    draft.current = "";
    setBusy(true);
    inputRef.current?.focus({ preventScroll: true });
    try {
      const output = await runCliCommand(value, {
        projects: hud.projects,
        registry: PROJECTS_REGISTRY,
        godMode: hud.godMode,
        selectProject: hud.selectProject,
        setViewMode: hud.setViewMode,
        setGodMode: hud.setGodMode,
        closeTerminal: hud.closeTerminal,
        openLink: (href) => {
          window.open(href, "_blank", "noopener,noreferrer");
        },
        signal: controller.signal,
        onProgress: (lines) => {
          if (!controller.signal.aborted) updateEntry(id, lines);
        },
      });
      if (controller.signal.aborted) return;
      if (output.action === "clear") clear();
      else if (output.action !== "close") updateEntry(id, output.lines);
    } finally {
      if (!controller.signal.aborted) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hud.closeTerminal();
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      if (!input.trim()) return;
      const completion = getAutocomplete(input, PROJECTS_REGISTRY);
      if (completion.value !== input || completion.suggestions.length) {
        event.preventDefault();
        setInput(completion.value);
        setSuggestions(completion.suggestions);
      }
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    setSuggestions([]);
    if (!history.length) return;
    if (event.key === "ArrowUp") {
      if (cursor.current === null) {
        draft.current = isSensitiveCommand(input) ? "" : input;
        cursor.current = history.length;
      }
      cursor.current = Math.max(0, cursor.current - 1);
      setInput(history[cursor.current]);
    } else if (cursor.current !== null) {
      cursor.current++;
      if (cursor.current >= history.length) {
        cursor.current = null;
        setInput(draft.current);
      } else setInput(history[cursor.current]);
    }
  }

  const first = hud.projects[0];
  const quickCommands = [
    "help",
    "ls",
    "whois",
    "stack",
    "contact",
    "msg",
    "thm",
    ...(first ? [`inspect ${first.id}`] : []),
    "entropy correct-horse-battery-staple",
    "iddqd",
  ];

  return (
    <div className="terminal-panel">
      <div className="terminal-titlebar">
        <div>
          <Terminal size={14} aria-hidden="true" />
          <h2>SYSTEMS CONSOLE</h2>
          <span>LOCAL SESSION</span>
        </div>
        <button
          type="button"
          onClick={hud.closeTerminal}
          aria-label="Close developer console"
        >
          <span>ESC / ~</span>
          <X size={16} />
        </button>
      </div>
      <nav className="terminal-quick-commands" aria-label="Quick commands">
        {quickCommands.map((command) => (
          <button
            type="button"
            key={command}
            disabled={busy}
            onClick={() => {
              void submit(command);
            }}
          >
            {command}
          </button>
        ))}
      </nav>
      <div
        ref={scrollRef}
        className="terminal-scrollback"
        role="log"
        aria-label="Console output"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
      >
        <TerminalOutput
          entries={entries}
          onAction={(action) => {
            if (action.kind === "contact") hud.openDossier("contact");
            else {
              setInput(action.value);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
        {busy && (
          <p className="terminal-busy" role="status">
            PROCESSING // awaiting command response…
          </p>
        )}
      </div>
      {suggestions.length > 0 && (
        <p className="terminal-completions" role="status">
          {suggestions.join("   ")}
        </p>
      )}
      <form
        className="terminal-command-form"
        onSubmit={onSubmit}
        autoComplete="off"
      >
        <label htmlFor="terminal-command" className="terminal-prompt">
          <span>guest@mic-sp</span>
          <span>:~$</span>
        </label>
        <input
          ref={inputRef}
          id="terminal-command"
          name="console-command"
          type="text"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setSuggestions([]);
            cursor.current = null;
          }}
          onKeyDown={onKeyDown}
          aria-label="Console command"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={4096}
          placeholder={
            busy
              ? "Query running… type clear to cancel"
              : "help — explore commands"
          }
        />
        <button
          type="submit"
          aria-label="Run command"
          disabled={busy && input.trim().toLowerCase() !== "clear"}
        >
          <CornerDownLeft size={15} aria-hidden="true" />
        </button>
      </form>
      <div className="terminal-status-rail">
        <span>
          <i />
          {hud.activeProject?.id ?? "NO ACTIVE NODE"}
          <span className="terminal-rail-divider">{" // "}</span>
          {hud.viewMode.toUpperCase()}
        </span>
        <span className={hud.godMode ? "terminal-god-active" : ""}>
          {hud.godMode ? "GODMODE // ON" : "GODMODE // OFF"}
        </span>
        <button
          type="button"
          onClick={() => {
            request.current?.abort();
            locked.current = false;
            setBusy(false);
            clear();
            inputRef.current?.focus();
          }}
        >
          CLEAR
        </button>
        <span className="terminal-history-hint">↑↓ HISTORY / TAB COMPLETE</span>
      </div>
    </div>
  );
}
