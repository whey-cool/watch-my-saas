#!/usr/bin/env bash
set -euo pipefail

# Wiki automation for Watch My SaaS
# Manages the GitHub wiki via git (github.com/whey-cool/watch-my-saas.wiki.git)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_DIR="${REPO_ROOT}/.wiki"
WIKI_REMOTE="https://github.com/whey-cool/watch-my-saas.wiki.git"
TODAY=$(date +%Y-%m-%d)

# --- Helpers ---

ensure_wiki() {
    if [ ! -d "${WIKI_DIR}/.git" ]; then
        echo "Cloning wiki repo..."
        git clone "${WIKI_REMOTE}" "${WIKI_DIR}"
    else
        echo "Pulling latest wiki..."
        git -C "${WIKI_DIR}" pull --rebase
    fi
    # Inherit git identity from the main repo
    local main_name main_email
    main_name=$(git -C "${REPO_ROOT}" config user.name 2>/dev/null || echo "whey-cool")
    main_email=$(git -C "${REPO_ROOT}" config user.email 2>/dev/null || echo "whey-cool@users.noreply.github.com")
    git -C "${WIKI_DIR}" config user.name "${main_name}"
    git -C "${WIKI_DIR}" config user.email "${main_email}"
}

wiki_commit_and_push() {
    local message="$1"
    git -C "${WIKI_DIR}" add -A
    if git -C "${WIKI_DIR}" diff --cached --quiet; then
        echo "No wiki changes to commit."
        return 0
    fi
    git -C "${WIKI_DIR}" commit -m "${message}"
    git -C "${WIKI_DIR}" push
    echo "Wiki updated and pushed."
}

usage() {
    cat <<'USAGE'
Usage: wiki.sh <command> [args]

Commands:
  decision <slug>       Create a decision page from template
  changelog <message>   Append to today's changelog
  brainstorm <topic>    Create a brainstorm page from template
  sync                  Pull latest wiki, commit local changes, push

Examples:
  wiki.sh decision recommendation-architecture
  wiki.sh changelog "Implemented webhook pipeline"
  wiki.sh brainstorm deployment-model
  wiki.sh sync
USAGE
}

# --- Commands ---

cmd_decision() {
    local slug="${1:?Usage: wiki.sh decision <slug>}"
    local filename="${TODAY}-${slug}.md"
    local filepath="${WIKI_DIR}/${filename}"

    ensure_wiki

    if [ -f "${filepath}" ]; then
        echo "Decision page already exists: ${filename}"
        echo "Edit it at: ${filepath}"
        return 1
    fi

    cat > "${filepath}" <<EOF
# Decision: ${slug//-/ }

**Date:** ${TODAY}
**Status:** Proposed
**Session:** _TBD_

## Context

_What is the issue or question that requires a decision?_

## Options Considered

### Option A: _Name_
- Pros: _..._
- Cons: _..._

### Option B: _Name_
- Pros: _..._
- Cons: _..._

## Decision

_Which option was chosen?_

## Rationale

_Why was this option chosen over the alternatives?_

## Consequences

_What are the implications of this decision?_
EOF

    echo "Created decision page: ${filename}"
    echo "Edit it at: ${filepath}"
    wiki_commit_and_push "docs: add decision page ${slug}"
}

cmd_changelog() {
    local message="${1:?Usage: wiki.sh changelog <message>}"
    local filename="Changelog-${TODAY}.md"
    local filepath="${WIKI_DIR}/${filename}"

    ensure_wiki

    if [ ! -f "${filepath}" ]; then
        cat > "${filepath}" <<EOF
# Changelog — ${TODAY}

- ${message}
EOF
        echo "Created changelog for ${TODAY}"
    else
        echo "- ${message}" >> "${filepath}"
        echo "Appended to changelog for ${TODAY}"
    fi

    wiki_commit_and_push "docs: changelog ${TODAY} — ${message}"
}

cmd_brainstorm() {
    local topic="${1:?Usage: wiki.sh brainstorm <topic>}"
    local filename="${TODAY}-${topic}.md"
    local filepath="${WIKI_DIR}/${filename}"

    ensure_wiki

    if [ -f "${filepath}" ]; then
        echo "Brainstorm page already exists: ${filename}"
        echo "Edit it at: ${filepath}"
        return 1
    fi

    cat > "${filepath}" <<EOF
# Brainstorm: ${topic//-/ }

**Date:** ${TODAY}
**Session:** _TBD_

## Context

_What prompted this brainstorm?_

## Ideas

### Idea 1
_Description..._

### Idea 2
_Description..._

## Discussion

_Key points raised..._

## Outcomes

_What was decided or what follow-up actions are needed?_

## Related
- _Links to related decisions, brainstorms, or archaeology pages_
EOF

    echo "Created brainstorm page: ${filename}"
    echo "Edit it at: ${filepath}"
    wiki_commit_and_push "docs: add brainstorm page ${topic}"
}

cmd_sync() {
    ensure_wiki
    wiki_commit_and_push "docs: wiki sync $(date +%Y-%m-%dT%H:%M:%S)"
}

# --- Main ---

case "${1:-}" in
    decision)   shift; cmd_decision "$@" ;;
    changelog)  shift; cmd_changelog "$@" ;;
    brainstorm) shift; cmd_brainstorm "$@" ;;
    sync)       shift; cmd_sync "$@" ;;
    -h|--help)  usage ;;
    *)          usage; exit 1 ;;
esac
