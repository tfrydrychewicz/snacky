#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Snacky — Development Environment Bootstrap (macOS)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Checks all prerequisites for local development and installs missing pieces.
# Safe to run multiple times (idempotent).
#
# Usage:
#   ./scripts/setup.sh              # Full setup (check + install + configure)
#   ./scripts/setup.sh --check-only # Only verify prerequisites, install nothing
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_NODE_MAJOR=22
REQUIRED_PNPM_MAJOR=10
REQUIRED_JDK_MAJOR=17

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_ONLY=false

declare -a OK=()
declare -a INSTALLED=()
declare -a WARN=()
declare -a FAIL=()

# ── Colors (disabled when not a terminal) ─────────────────────────────────────

if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'
  DIM='\033[2m'; RESET='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; DIM=''; RESET=''
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

ok()    { printf "  ${GREEN}✓${RESET} %-28s %s\n" "$1" "${2:-}"; }
warn()  { printf "  ${YELLOW}!${RESET} %-28s %s\n" "$1" "${2:-}"; }
fail()  { printf "  ${RED}✗${RESET} %-28s %s\n" "$1" "${2:-}"; }
info()  { printf "  ${BLUE}→${RESET} %s\n" "$*"; }
step()  { printf "\n${BOLD}${CYAN}── %s ──${RESET}\n" "$*"; }

ver_gte() { [[ "$1" -ge "$2" ]]; }

die() { printf "${RED}Error:${RESET} %s\n" "$*" >&2; exit 1; }

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --check-only) CHECK_ONLY=true ;;
      --help|-h)
        printf "Usage: %s [--check-only]\n" "$0"
        printf "  --check-only  Only check prerequisites, do not install anything\n"
        exit 0
        ;;
      *) die "Unknown argument: $arg" ;;
    esac
  done
}

# ── Prerequisite Checks ──────────────────────────────────────────────────────

check_os() {
  if [[ "$(uname)" != "Darwin" ]]; then
    die "This script is for macOS. On Windows, run: .\\scripts\\setup.ps1"
  fi
}

check_xcode() {
  local xcode_path
  xcode_path=$(xcode-select -p 2>/dev/null || true)

  if [[ -d "/Applications/Xcode.app" ]]; then
    local xcode_ver
    xcode_ver=$(/usr/bin/xcodebuild -version 2>/dev/null | awk 'NR==1')

    if [[ -z "$xcode_ver" ]]; then
      warn "Xcode" "installed but license not accepted"
      if $CHECK_ONLY; then
        info "Run: sudo xcodebuild -license accept"
        FAIL+=("Xcode license")
      else
        info "Accepting Xcode license (requires sudo)..."
        sudo xcodebuild -license accept
        xcode_ver=$(/usr/bin/xcodebuild -version 2>/dev/null | awk 'NR==1')
        ok "Xcode" "${xcode_ver:-installed}"
        INSTALLED+=("Xcode license accepted")
      fi
    else
      ok "Xcode" "$xcode_ver"
      OK+=("Xcode")
    fi
  else
    fail "Xcode" "not installed"
    info "Install Xcode from the Mac App Store:"
    info "  open https://apps.apple.com/app/xcode/id497799835"
    info "After installing, run: sudo xcode-select -s /Applications/Xcode.app"
    FAIL+=("Xcode")
  fi

  if xcode-select -p &>/dev/null; then
    ok "Xcode CLT" "$xcode_path"
    OK+=("Xcode CLT")
  else
    if $CHECK_ONLY; then
      fail "Xcode CLT" "not installed"
      FAIL+=("Xcode CLT")
    else
      info "Installing Xcode Command Line Tools..."
      xcode-select --install 2>/dev/null || true
      warn "Xcode CLT" "dialog opened — install, then re-run this script"
      INSTALLED+=("Xcode CLT (prompted)")
    fi
  fi
}

check_homebrew() {
  if command -v brew &>/dev/null; then
    ok "Homebrew" "$(brew --version 2>/dev/null | head -1 | awk '{print $2}')"
    OK+=("Homebrew")
  else
    if $CHECK_ONLY; then
      fail "Homebrew" "not installed"
      FAIL+=("Homebrew")
    else
      info "Installing Homebrew..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
      fi
      INSTALLED+=("Homebrew")
    fi
  fi
}

check_git() {
  if command -v git &>/dev/null; then
    ok "Git" "$(git --version | awk '{print $3}')"
    OK+=("Git")
  else
    if $CHECK_ONLY; then
      fail "Git" "not installed"
      FAIL+=("Git")
    else
      brew install git
      INSTALLED+=("Git")
    fi
  fi
}

check_node() {
  if command -v node &>/dev/null; then
    local v
    v=$(node -v | sed 's/v//' | cut -d. -f1)
    if ver_gte "$v" "$REQUIRED_NODE_MAJOR"; then
      ok "Node.js" "$(node -v)"
      OK+=("Node.js")
    else
      fail "Node.js" "$(node -v) — need >= v${REQUIRED_NODE_MAJOR}"
      FAIL+=("Node.js >= $REQUIRED_NODE_MAJOR")
    fi
  else
    if $CHECK_ONLY; then
      fail "Node.js" "not installed"
      FAIL+=("Node.js")
    else
      info "Installing Node.js ${REQUIRED_NODE_MAJOR} via Homebrew..."
      brew install "node@${REQUIRED_NODE_MAJOR}"
      brew link --overwrite "node@${REQUIRED_NODE_MAJOR}" 2>/dev/null || true
      INSTALLED+=("Node.js $REQUIRED_NODE_MAJOR")
    fi
  fi
}

check_pnpm() {
  if command -v pnpm &>/dev/null; then
    local v
    v=$(pnpm --version | cut -d. -f1)
    if ver_gte "$v" "$REQUIRED_PNPM_MAJOR"; then
      ok "pnpm" "$(pnpm --version)"
      OK+=("pnpm")
    else
      fail "pnpm" "$(pnpm --version) — need >= ${REQUIRED_PNPM_MAJOR}"
      FAIL+=("pnpm >= $REQUIRED_PNPM_MAJOR")
    fi
  else
    if $CHECK_ONLY; then
      fail "pnpm" "not installed"
      FAIL+=("pnpm")
    else
      info "Installing pnpm via corepack..."
      if command -v corepack &>/dev/null; then
        corepack enable pnpm 2>/dev/null || true
        corepack prepare "pnpm@latest" --activate 2>/dev/null || npm install -g pnpm
      else
        npm install -g pnpm
      fi
      INSTALLED+=("pnpm")
    fi
  fi
}

check_watchman() {
  if command -v watchman &>/dev/null; then
    ok "Watchman" "$(watchman --version 2>/dev/null || echo 'installed')"
    OK+=("Watchman")
  else
    if $CHECK_ONLY; then
      warn "Watchman" "not installed (optional, recommended for Metro)"
      WARN+=("Watchman")
    else
      info "Installing Watchman via Homebrew..."
      brew install watchman
      INSTALLED+=("Watchman")
    fi
  fi
}

check_docker() {
  if command -v docker &>/dev/null; then
    if docker info &>/dev/null 2>&1; then
      ok "Docker" "$(docker --version | awk '{print $3}' | tr -d ',')"
      OK+=("Docker")
    else
      warn "Docker" "installed but not running — start Docker Desktop"
      WARN+=("Docker (not running)")
    fi
  else
    fail "Docker" "not installed — get Docker Desktop from docker.com"
    FAIL+=("Docker")
  fi
}

check_supabase_cli() {
  if command -v supabase &>/dev/null; then
    ok "Supabase CLI" "$(supabase --version 2>/dev/null | awk '{print $NF}')"
    OK+=("Supabase CLI")
  else
    if $CHECK_ONLY; then
      fail "Supabase CLI" "not installed"
      FAIL+=("Supabase CLI")
    else
      info "Installing Supabase CLI via Homebrew..."
      brew install supabase/tap/supabase
      INSTALLED+=("Supabase CLI")
    fi
  fi
}

check_ruby_bundler() {
  if command -v ruby &>/dev/null; then
    ok "Ruby" "$(ruby -v | awk '{print $2}')"
    OK+=("Ruby")
  else
    fail "Ruby" "not installed (needed for CocoaPods)"
    FAIL+=("Ruby")
    return
  fi

  if command -v bundle &>/dev/null; then
    ok "Bundler" "$(bundle --version | awk '{print $NF}')"
    OK+=("Bundler")
  else
    if $CHECK_ONLY; then
      fail "Bundler" "not installed"
      FAIL+=("Bundler")
    else
      info "Installing Bundler..."
      gem install bundler
      INSTALLED+=("Bundler")
    fi
  fi
}

check_jdk() {
  if command -v java &>/dev/null; then
    local v
    v=$(java -version 2>&1 | head -1 | awk -F'"' '{print $2}' | cut -d. -f1)
    if ver_gte "$v" "$REQUIRED_JDK_MAJOR"; then
      ok "JDK" "$(java -version 2>&1 | head -1 | awk -F'"' '{print $2}')"
      OK+=("JDK")
    else
      fail "JDK" "$v — need >= $REQUIRED_JDK_MAJOR"
      FAIL+=("JDK >= $REQUIRED_JDK_MAJOR")
    fi
  else
    if $CHECK_ONLY; then
      fail "JDK" "not installed (needed for Android builds)"
      FAIL+=("JDK")
    else
      info "Installing OpenJDK ${REQUIRED_JDK_MAJOR} via Homebrew..."
      brew install "openjdk@${REQUIRED_JDK_MAJOR}"
      INSTALLED+=("JDK $REQUIRED_JDK_MAJOR")
    fi
  fi
}

# ── Post-Check Setup ─────────────────────────────────────────────────────────

install_dependencies() {
  step "Node dependencies"
  cd "$REPO_ROOT"
  if command -v pnpm &>/dev/null; then
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    ok "pnpm install" "complete"
  else
    fail "pnpm install" "pnpm not available — skipping"
  fi
}

setup_env_files() {
  step "Environment files"

  local mobile_env="$REPO_ROOT/apps/mobile/.env"
  local mobile_example="$REPO_ROOT/apps/mobile/.env.example"
  if [[ -f "$mobile_env" ]]; then
    ok "apps/mobile/.env" "exists"
  elif [[ -f "$mobile_example" ]]; then
    cp "$mobile_example" "$mobile_env"
    ok "apps/mobile/.env" "created from .env.example"
    warn "apps/mobile/.env" "edit with your actual values"
  else
    warn "apps/mobile/.env" "no example found — create manually"
  fi

  local supa_env="$REPO_ROOT/supabase/.env"
  local supa_example="$REPO_ROOT/supabase/.env.example"
  if [[ -f "$supa_env" ]]; then
    ok "supabase/.env" "exists"
  elif [[ -f "$supa_example" ]]; then
    cp "$supa_example" "$supa_env"
    ok "supabase/.env" "created from .env.example"
    warn "supabase/.env" "edit with your actual API keys"
  else
    warn "supabase/.env" "no example found — create manually"
  fi
}

setup_ios() {
  step "iOS dependencies (CocoaPods)"
  local ios_dir="$REPO_ROOT/apps/mobile/ios"
  local native_dir="$REPO_ROOT/apps/mobile/src/native"

  if [[ ! -d "$ios_dir" ]]; then
    warn "iOS directory" "not found — skipping"
    return
  fi

  if [[ ! -d "$native_dir" ]]; then
    mkdir -p "$native_dir"
    ok "src/native" "created (required by RN codegen)"
  fi

  cd "$REPO_ROOT/apps/mobile"

  if ! command -v bundle &>/dev/null; then
    warn "Bundler" "not available — skipping pod install"
    return
  fi

  info "Running bundle install..."
  bundle install --quiet

  info "Running pod install..."
  cd "$ios_dir"
  bundle exec pod install
  ok "CocoaPods" "installed"
}

# ── Summary ───────────────────────────────────────────────────────────────────

print_summary() {
  step "Summary"
  echo ""

  if [[ ${#OK[@]} -gt 0 ]]; then
    printf "  ${GREEN}Ready${RESET}     ${DIM}${OK[*]}${RESET}\n"
  fi
  if [[ ${#INSTALLED[@]} -gt 0 ]]; then
    printf "  ${BLUE}Installed${RESET} ${INSTALLED[*]}\n"
  fi
  if [[ ${#WARN[@]} -gt 0 ]]; then
    printf "  ${YELLOW}Warnings${RESET}  ${WARN[*]}\n"
  fi
  if [[ ${#FAIL[@]} -gt 0 ]]; then
    printf "  ${RED}Missing${RESET}   ${FAIL[*]}\n"
    echo ""
    printf "  ${RED}${BOLD}Some required tools are missing. Install them and re-run this script.${RESET}\n"
    echo ""
    exit 1
  fi

  echo ""
  printf "  ${GREEN}${BOLD}Environment is ready!${RESET}\n"
  echo ""
  printf "  ${DIM}Quick start:${RESET}\n"
  printf "    pnpm supabase:start      ${DIM}# Start local Supabase${RESET}\n"
  printf "    pnpm ios                  ${DIM}# Run on iOS simulator${RESET}\n"
  printf "    pnpm android              ${DIM}# Run on Android emulator${RESET}\n"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  parse_args "$@"

  printf "\n"
  printf "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}\n"
  printf "${BOLD}${CYAN}║         Snacky — Environment Setup (macOS)       ║${RESET}\n"
  printf "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}\n"

  if $CHECK_ONLY; then
    info "Check-only mode — nothing will be installed"
  fi

  check_os

  step "System prerequisites"
  check_xcode
  check_homebrew
  check_git

  step "Runtime & package manager"
  check_node
  check_pnpm

  step "Mobile development tools"
  check_watchman
  check_ruby_bundler
  check_jdk

  step "Backend & infrastructure"
  check_docker
  check_supabase_cli

  if ! $CHECK_ONLY && [[ ${#FAIL[@]} -eq 0 ]]; then
    install_dependencies
    setup_env_files
    setup_ios
  fi

  print_summary
}

main "$@"
