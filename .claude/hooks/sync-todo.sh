#!/usr/bin/env bash
# PostToolUse hook: syncs TaskCreate/TaskUpdate state to .claude-todo.txt
# The statusline reads this file to show current task in the terminal.
#
# Input: JSON on stdin with tool_name, tool_input, tool_output fields
# Format: [ ] pending | [>] in_progress | [x] completed

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TODO_FILE="$PROJECT_DIR/.claude-todo.txt"

touch "$TODO_FILE"

node -e '
const fs = require("fs");
const todoFile = process.argv[1];

// Read stdin — exit gracefully if empty or malformed
let input;
try {
  const raw = fs.readFileSync("/dev/stdin", "utf8").trim();
  if (!raw) process.exit(0);
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolName = input.tool_name;
const toolInput = input.tool_input || {};

// Try to extract task ID from various result shapes
function extractId(input) {
  const out = input.tool_output || input.tool_result;
  if (!out) return null;
  if (typeof out === "object" && out.id) return String(out.id);
  if (typeof out === "string") {
    // Match "Task #N" or "id:N" or "taskId:N"
    const m = out.match(/(?:Task #|id|taskId)["\s:]*(\d+)/i);
    return m ? m[1] : null;
  }
  return null;
}

let lines = [];
try { lines = fs.readFileSync(todoFile, "utf8").split("\n"); } catch {}

if (toolName === "TaskCreate") {
  const subject = toolInput.subject;
  const id = extractId(input);
  if (subject) {
    const tag = id ? ` (id:${id})` : "";
    lines.push(`[ ] ${subject}${tag}`);
  }
} else if (toolName === "TaskUpdate") {
  const id = toolInput.taskId;
  const status = toolInput.status;
  const newSubject = toolInput.subject;

  if (id) {
    const idPattern = `(id:${id})`;

    lines = lines.map(line => {
      if (!line.includes(idPattern)) return line;

      if (status === "deleted") return null;

      let updated = line;
      if (status === "in_progress") {
        updated = updated.replace(/^\[[ ]\]/, "[>]");
      } else if (status === "completed") {
        updated = updated.replace(/^\[[ >]\]/, "[x]");
      } else if (status === "pending") {
        updated = updated.replace(/^\[[>x]\]/, "[ ]");
      }

      if (newSubject) {
        updated = updated.replace(/^\(\[.\]\) .*(\(id:\d+\))/, `$1 ${newSubject} $2`);
      }

      return updated;
    }).filter(l => l !== null);
  }
}

fs.writeFileSync(todoFile, lines.filter(l => l !== undefined).join("\n"));
' "$TODO_FILE"
