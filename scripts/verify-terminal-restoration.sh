#!/usr/bin/env bash
# Phase 1 exit evidence: process-level terminal restoration harness.
#
# Mounts test/fixtures/terminal-harness.tsx inside a real pty (macOS `script`,
# no added dependency) and checks that normal exit, SIGINT, SIGTERM, an
# uncaught exception, and an unhandled rejection all leave the pty holding
# the exit-alt-screen, show-cursor, and SGR-reset sequences that
# @termuijs/core's Terminal.restore() writes, with the expected process exit
# code. Run this in a real Terminal.app / iTerm2 / VS Code terminal session
# on macOS; it will not give a trustworthy signal-delivery result inside a
# non-interactive or sandboxed shell.
set -u

if [ "$(uname)" != "Darwin" ]; then
  echo "This harness only runs on macOS, matching Hush's Phase 1 platform." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
FIXTURE="test/fixtures/terminal-harness.tsx"
export TSX_TSCONFIG_PATH="test/fixtures/tsconfig.json"
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

EXIT_ALT_SCREEN=$'\x1b[?1049l'
SHOW_CURSOR=$'\x1b[?25h'
SGR_RESET=$'\x1b[0m'

pass=0
fail=0

check_restored() {
  local out="$1"
  if grep -qF "$EXIT_ALT_SCREEN" "$out" && grep -qF "$SHOW_CURSOR" "$out" && grep -qF "$SGR_RESET" "$out"; then
    return 0
  fi
  return 1
}

run_signal_scenario() {
  local name="$1" signal="$2" expected_code="$3"
  local out="$WORKDIR/$name.out" pidfile="$WORKDIR/$name.pid"

  script -q "$out" bash -c "echo \$\$ > '$pidfile'; exec npx tsx '$FIXTURE'" &
  local job=$!

  for _ in $(seq 1 50); do
    [ -s "$pidfile" ] && break
    sleep 0.1
  done
  sleep 1 # let the app finish mounting (raw mode + alt screen) before signaling

  kill "-$signal" "$(cat "$pidfile")"
  wait "$job"
  local code=$?

  report "$name" "$code" "$expected_code" "$out"
}

run_fault_scenario() {
  local name="$1" fault="$2" expected_code="$3"
  local out="$WORKDIR/$name.out"

  HUSH_HARNESS_FAULT="$fault" script -q "$out" bash -c "exec npx tsx '$FIXTURE'"
  local code=$?

  report "$name" "$code" "$expected_code" "$out"
}

run_quit_scenario() {
  local name="quit" expected_code="0"
  local out="$WORKDIR/$name.out"

  printf 'q' | script -q "$out" bash -c "exec npx tsx '$FIXTURE'"
  local code=$?

  report "$name" "$code" "$expected_code" "$out"
}

report() {
  local name="$1" code="$2" expected_code="$3" out="$4"
  if [ "$code" != "$expected_code" ]; then
    echo "FAIL $name: exit code $code, expected $expected_code"
    fail=$((fail + 1))
    return
  fi
  if ! check_restored "$out"; then
    echo "FAIL $name: terminal was not restored (missing exit-alt-screen/show-cursor/reset in $out)"
    fail=$((fail + 1))
    return
  fi
  echo "PASS $name: exit code $code, terminal restored"
  pass=$((pass + 1))
}

run_signal_scenario sigint INT 130
run_signal_scenario sigterm TERM 143
run_fault_scenario uncaught uncaught 1
run_fault_scenario rejection rejection 1
run_quit_scenario

echo "---"
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
