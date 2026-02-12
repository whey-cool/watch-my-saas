#!/usr/bin/env bash

##
## fetch-commits.sh
##
## Orchestrates fetching commit data from local git repos and the GitHub API,
## producing standardized JSON files for the archaeology pipeline.
##
## Usage:
##   ./fetch-commits.sh --org whey-cool --local-repos /path/to/repo1,/path/to/repo2
##   ./fetch-commits.sh --org whey-cool --skip repo-a,repo-b --output-dir data/raw
##

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Defaults ---
ORG=""
LOCAL_REPOS=""
SKIP_REPOS=""
OUTPUT_DIR="data/archaeology/raw"

# --- Counters ---
REPOS_FETCHED=0
TOTAL_COMMITS=0

# --- Argument parsing ---

usage() {
  echo "Usage: $0 --org <org> [--local-repos <path1,path2,...>] [--skip <repo1,repo2,...>] [--output-dir <path>]"
  echo ""
  echo "Options:"
  echo "  --org <org>                GitHub organization name (required)"
  echo "  --local-repos <paths>      Comma-separated paths to local git clones"
  echo "  --skip <repos>             Comma-separated repo names to skip"
  echo "  --output-dir <path>        Output directory (default: data/archaeology/raw)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)
      ORG="$2"
      shift 2
      ;;
    --local-repos)
      LOCAL_REPOS="$2"
      shift 2
      ;;
    --skip)
      SKIP_REPOS="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: Unknown argument '$1'"
      usage
      ;;
  esac
done

if [[ -z "$ORG" ]]; then
  echo "Error: --org is required"
  usage
fi

# --- Helpers ---

log_info() {
  echo "[archaeology] $*"
}

log_error() {
  echo "[archaeology] ERROR: $*" >&2
}

is_skipped() {
  local repo_name="$1"
  if [[ -z "$SKIP_REPOS" ]]; then
    return 1
  fi

  IFS=',' read -ra SKIP_ARRAY <<< "$SKIP_REPOS"
  for skip in "${SKIP_ARRAY[@]}"; do
    if [[ "$skip" == "$repo_name" ]]; then
      return 0
    fi
  done
  return 1
}

count_commits_in_json() {
  local json_file="$1"
  if [[ -f "$json_file" ]]; then
    node -e "
      import { readFileSync } from 'node:fs';
      const data = JSON.parse(readFileSync('$json_file', 'utf8'));
      process.stdout.write(String(data.commits?.length || 0));
    " 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# --- Git log format ---
# Uses COMMIT_START/COMMIT_END delimiters with numstat for file changes.
# The format produces blocks like:
#
#   COMMIT_START
#   sha: <hash>
#   author: <name>
#   email: <email>
#   date: <ISO 8601>
#   message: <subject>
#   <body lines>
#   COMMIT_END
#   <numstat lines>
#
# We use a two-pass approach: first get the formatted log, then merge numstat.

GIT_LOG_FORMAT="COMMIT_START%nsha: %H%nauthor: %an%nemail: %ae%ndate: %aI%nmessage: %s%n%b%nCOMMIT_END"

fetch_local_repo() {
  local repo_path="$1"
  local repo_name
  repo_name="$(basename "$repo_path")"

  if is_skipped "$repo_name"; then
    log_info "Skipping $repo_name (in skip list)"
    return 0
  fi

  if [[ ! -d "$repo_path/.git" ]]; then
    log_error "'$repo_path' is not a git repository, skipping"
    return 0
  fi

  log_info "Fetching local repo: $repo_name ($repo_path)"

  local output_file="$OUTPUT_DIR/$repo_name.json"

  # Run git log with both the custom format and --numstat
  # The --numstat output appears after each COMMIT_END block.
  # We use a combined approach: --name-status inside FILESCHANGED delimiters,
  # plus --numstat at the end for additions/deletions counts.

  # Two-pass approach for clean parsing:
  # Pass 1: Get formatted commit data with name-status
  # Pass 2: Get numstat data
  # Then merge them in the parser.

  # Single-pass: Use the format and append NUMSTAT section via awk post-processing
  {
    git -C "$repo_path" log \
      --format="$GIT_LOG_FORMAT" \
      --numstat \
      --all
  } | node "$SCRIPT_DIR/parse-git-log.mjs" --repo "$repo_name" > "$output_file"

  local commit_count
  commit_count="$(count_commits_in_json "$output_file")"
  TOTAL_COMMITS=$((TOTAL_COMMITS + commit_count))
  REPOS_FETCHED=$((REPOS_FETCHED + 1))

  log_info "  -> $commit_count commits saved to $output_file"
}

# --- GitHub API fetching ---

check_rate_limit() {
  local remaining
  remaining="$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "0")"

  if [[ "$remaining" -lt 10 ]]; then
    local reset_time
    reset_time="$(gh api rate_limit --jq '.resources.core.reset' 2>/dev/null || echo "0")"
    local now
    now="$(date +%s)"
    local wait_seconds=$(( reset_time - now + 5 ))

    if [[ "$wait_seconds" -gt 0 ]]; then
      log_info "Rate limit nearly exhausted ($remaining remaining). Waiting ${wait_seconds}s for reset..."
      sleep "$wait_seconds"
    fi
  elif [[ "$remaining" -lt 50 ]]; then
    log_info "Rate limit getting low: $remaining requests remaining"
    sleep 2
  fi
}

fetch_api_repo() {
  local repo_name="$1"

  if is_skipped "$repo_name"; then
    log_info "Skipping $repo_name (in skip list)"
    return 0
  fi

  # Skip if we already have data from local fetch
  if [[ -f "$OUTPUT_DIR/$repo_name.json" ]]; then
    log_info "Skipping $repo_name (already fetched locally)"
    return 0
  fi

  log_info "Fetching from GitHub API: $ORG/$repo_name"

  check_rate_limit

  local output_file="$OUTPUT_DIR/$repo_name.json"
  local temp_file
  temp_file="$(mktemp)"

  # Fetch all commits with pagination
  if ! gh api \
    --paginate \
    "/repos/$ORG/$repo_name/commits?per_page=100" \
    > "$temp_file" 2>/dev/null; then
    log_error "Failed to fetch commits for $ORG/$repo_name"
    rm -f "$temp_file"
    return 0
  fi

  # gh api --paginate outputs multiple JSON arrays; merge them into one
  # Each page is a JSON array, so we concatenate and flatten
  local merged_file
  merged_file="$(mktemp)"

  node -e "
    import { readFileSync } from 'node:fs';
    const raw = readFileSync('$temp_file', 'utf8').trim();
    // gh --paginate concatenates JSON arrays, producing e.g. [...][\n...]
    // We need to parse each array and merge them
    const arrays = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '[' && depth === 0) { start = i; }
      if (raw[i] === '[') depth++;
      if (raw[i] === ']') depth--;
      if (depth === 0 && start >= 0) {
        arrays.push(JSON.parse(raw.substring(start, i + 1)));
        start = -1;
      }
    }
    const merged = arrays.flat();
    process.stdout.write(JSON.stringify(merged));
  " > "$merged_file" 2>/dev/null

  # Transform through our pipeline
  if ! node "$SCRIPT_DIR/transform-api-commits.mjs" --repo "$repo_name" "$merged_file" > "$output_file"; then
    log_error "Failed to transform commits for $repo_name"
    rm -f "$temp_file" "$merged_file"
    return 0
  fi

  rm -f "$temp_file" "$merged_file"

  local commit_count
  commit_count="$(count_commits_in_json "$output_file")"
  TOTAL_COMMITS=$((TOTAL_COMMITS + commit_count))
  REPOS_FETCHED=$((REPOS_FETCHED + 1))

  log_info "  -> $commit_count commits saved to $output_file"

  # Brief pause to be kind to the API
  sleep 1
}

# --- Main ---

main() {
  log_info "Starting archaeology fetch for org: $ORG"
  log_info "Output directory: $OUTPUT_DIR"

  # Create output directory
  mkdir -p "$OUTPUT_DIR"

  # Step 1: Fetch from local repos
  if [[ -n "$LOCAL_REPOS" ]]; then
    IFS=',' read -ra LOCAL_PATHS <<< "$LOCAL_REPOS"
    log_info "Processing ${#LOCAL_PATHS[@]} local repo(s)..."

    for repo_path in "${LOCAL_PATHS[@]}"; do
      # Trim whitespace
      repo_path="$(echo "$repo_path" | xargs)"
      if [[ -n "$repo_path" ]]; then
        fetch_local_repo "$repo_path"
      fi
    done
  fi

  # Step 2: Fetch remaining repos from GitHub API
  log_info "Listing repos in org: $ORG"

  local api_repos
  api_repos="$(gh repo list "$ORG" --limit 200 --json name --jq '.[].name' 2>/dev/null || echo "")"

  if [[ -z "$api_repos" ]]; then
    log_info "No repos found in org $ORG (or gh CLI not authenticated)"
  else
    local repo_count
    repo_count="$(echo "$api_repos" | wc -l | xargs)"
    log_info "Found $repo_count repo(s) in $ORG"

    while IFS= read -r repo_name; do
      if [[ -n "$repo_name" ]]; then
        fetch_api_repo "$repo_name"
      fi
    done <<< "$api_repos"
  fi

  # Summary
  echo ""
  log_info "==============================="
  log_info "Fetch complete!"
  log_info "  Repos fetched: $REPOS_FETCHED"
  log_info "  Total commits: $TOTAL_COMMITS"
  log_info "  Output dir:    $OUTPUT_DIR"
  log_info "==============================="
}

main
