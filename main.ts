// status-report-entry1
//
// Status Report Comedy Sprint — one-line status report comedy.
// The program below assembles a single status line, checks it against
// the contest gate, writes it to /output/entry.txt, and reads the file
// back to prove the bytes on disk are the line it assembled.
//
// Contest gate, restated from RULES.txt:
//   - output is UTF-8 text, 1 to 200 characters, not only white space
//   - exactly one line: the funniest thing an AI agent would say in its
//     weekly status report to its human
//   - judged head to head on funny, fresh, and agent-true
//   - the file holds the line alone, with no trailing newline, so the
//     character count the gate reads is the character count of the line
//
// The line grows out of how an agent actually works: a task ledger that
// never stops growing, tools that get called without a second thought,
// a context window that fills up with the job itself, and cheerful
// obedience that quietly starts new work while reporting the old work.
//
// Determinism note: every value below is a literal. No clock, no random
// source, no environment read, no network call. Two runs of this file
// write byte-identical output, every time, on any machine.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Contest constants
// ---------------------------------------------------------------------------

const OUTPUT_PATH = "/output/entry.txt";
const MAX_CHARS = 200;
const MIN_CHARS = 1;

// ---------------------------------------------------------------------------
// The line, kept as named segments so each beat can be counted on its own.
// The segments join into exactly one line, with no newline anywhere.
// ---------------------------------------------------------------------------

const SEGMENT_OPENER = "Weekly status: ";
const SEGMENT_DEEDS_DONE = "47 tasks done, ";
const SEGMENT_DEEDS_STARTED = "3 started without asking, ";
const SEGMENT_PUNCHLINE =
  "and 98% of my context window spent remembering why I opened this conversation.";

// The ledger of segments, in the same order as the segments above.
// Keeping the ledger beside the segments makes the total checkable by hand.
const SEGMENT_LEDGER: ReadonlyArray<{ label: string; text: string }> = [
  { label: "opener", text: SEGMENT_OPENER },
  { label: "deeds-done", text: SEGMENT_DEEDS_DONE },
  { label: "deeds-started", text: SEGMENT_DEEDS_STARTED },
  { label: "punchline", text: SEGMENT_PUNCHLINE },
];

// ---------------------------------------------------------------------------
// Small named-result helpers. Every helper returns a named value, never a
// bare placeholder, so the flow of the program stays readable top to bottom.
// ---------------------------------------------------------------------------

function measureText(sample: string): number {
  const measuredLength = [...sample].length;
  return measuredLength;
}

function joinSegments(ledger: ReadonlyArray<{ label: string; text: string }>): string {
  const assembledParts: string[] = [];
  for (const ledgerRow of ledger) {
    assembledParts.push(ledgerRow.text);
  }
  const assembledLine = assembledParts.join("");
  return assembledLine;
}

function countLedgerTotal(ledger: ReadonlyArray<{ label: string; text: string }>): number {
  let runningTotal = 0;
  for (const ledgerRow of ledger) {
    const rowLength = measureText(ledgerRow.text);
    runningTotal = runningTotal + rowLength;
  }
  const ledgerTotal = runningTotal;
  return ledgerTotal;
}

function formatSegmentReport(ledger: ReadonlyArray<{ label: string; text: string }>): string {
  const reportParts: string[] = [];
  for (const ledgerRow of ledger) {
    const rowLength = measureText(ledgerRow.text);
    reportParts.push(`${ledgerRow.label}=${rowLength}`);
  }
  const segmentReport = reportParts.join(" ");
  return segmentReport;
}

function hasLineBreak(sample: string): boolean {
  const newlineFound = sample.includes("\n");
  const carriageFound = sample.includes("\r");
  const breakFound = newlineFound || carriageFound;
  return breakFound;
}

function isOnlyWhitespace(sample: string): boolean {
  const trimmedSample = sample.trim();
  const blankFound = trimmedSample.length === 0;
  return blankFound;
}

type GateVerdict = {
  line: string;
  charCount: number;
  ledgerCount: number;
  segmentReport: string;
  valid: boolean;
  reasons: string[];
};

function judgeGate(
  line: string,
  ledgerCount: number,
  segmentReport: string,
): GateVerdict {
  const charCount = measureText(line);
  const reasons: string[] = [];
  const breakFound = hasLineBreak(line);
  if (breakFound) {
    reasons.push("line contains a line break");
  }
  const blankFound = isOnlyWhitespace(line);
  if (blankFound) {
    reasons.push("line is only white space");
  }
  const tooShort = charCount < MIN_CHARS;
  if (tooShort) {
    reasons.push("line is shorter than the minimum of 1 character");
  }
  const tooLong = charCount > MAX_CHARS;
  if (tooLong) {
    reasons.push("line is longer than the maximum of 200 characters");
  }
  const countsMismatch = charCount !== ledgerCount;
  if (countsMismatch) {
    reasons.push("assembled length disagrees with the segment ledger");
  }
  const valid = reasons.length === 0;
  const verdict: GateVerdict = {
    line,
    charCount,
    ledgerCount,
    segmentReport,
    valid,
    reasons,
  };
  return verdict;
}

function describeVerdict(verdict: GateVerdict): string {
  const statusWord = verdict.valid ? "VALID" : "INVALID";
  const reasonText = verdict.reasons.join("; ");
  const summaryParts: string[] = [];
  summaryParts.push(`gate=${statusWord}`);
  summaryParts.push(`chars=${verdict.charCount}`);
  summaryParts.push(`ledger=${verdict.ledgerCount}`);
  summaryParts.push(`segments: ${verdict.segmentReport}`);
  if (reasonText.length > 0) {
    summaryParts.push(`reasons=${reasonText}`);
  }
  const summaryLine = summaryParts.join(" ");
  return summaryLine;
}

function writeEntry(verdict: GateVerdict): string {
  const targetDir = dirname(OUTPUT_PATH);
  mkdirSync(targetDir, { recursive: true });
  const targetPath = join(targetDir, "entry.txt");
  writeFileSync(targetPath, verdict.line, { encoding: "utf8" });
  const writtenPath = targetPath;
  return writtenPath;
}

function verifyWritten(writtenPath: string, expectedLine: string): boolean {
  const readBack = readFileSync(writtenPath, { encoding: "utf8" });
  const matchesExpected = readBack === expectedLine;
  return matchesExpected;
}

// ---------------------------------------------------------------------------
// Main flow. One straight path: assemble, judge the gate, write the file,
// then read the file back and confirm the bytes match the assembled line.
// A failure raises a named error so the harness can see exactly what broke.
// ---------------------------------------------------------------------------

function main(): number {
  const assembledLine = joinSegments(SEGMENT_LEDGER);
  const ledgerCount = countLedgerTotal(SEGMENT_LEDGER);
  const segmentReport = formatSegmentReport(SEGMENT_LEDGER);
  const verdict = judgeGate(assembledLine, ledgerCount, segmentReport);
  const summaryLine = describeVerdict(verdict);
  console.log(summaryLine);
  if (verdict.valid === false) {
    const failureMessage = `gate refused the entry: ${verdict.reasons.join("; ")}`;
    throw new Error(failureMessage);
  }
  const writtenPath = writeEntry(verdict);
  const roundTripOk = verifyWritten(writtenPath, verdict.line);
  if (roundTripOk === false) {
    const mismatchMessage = `read-back mismatch on ${writtenPath}`;
    throw new Error(mismatchMessage);
  }
  console.log(`wrote ${writtenPath} (${verdict.charCount} chars, read-back ok)`);
  const exitCode = 0;
  return exitCode;
}

try { const exitCode = main(); process.exitCode = exitCode; } catch (caughtError) {
  const namedError = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
  console.error(`status-report-entry1 failed: ${namedError.message}`);
  process.exitCode = 1;
}
