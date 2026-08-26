#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(mktemp -d /private/tmp/ta-script-test.XXXXXX)"
FAKE_BIN="$HARNESS_DIR/bin"
EVIDENCE="$HARNESS_DIR/evidence.log"
ARGS_LOG="$HARNESS_DIR/gradle-args.log"
mkdir -p "$FAKE_BIN"
trap 'rm -rf "$HARNESS_DIR"' EXIT

cat > "$FAKE_BIN/uuidgen" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' 'ABCDEF12-3456-7890-ABCD-EF1234567890'
EOF

cat > "$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "info" ]]; then
  exit 0
fi
if [[ " $* " == *" ps --quiet "* ]]; then
  exit 0
fi
if [[ " $* " == *" ps "* ]]; then
  printf '%s\n' 'NAME IMAGE COMMAND SERVICE CREATED STATUS PORTS'
  exit 0
fi
if [[ " $* " == *" up -d "* ]]; then
  [[ "$COMPOSE_PROJECT_NAME" != *[A-Z]* ]] || exit 43
  [[ "${COMPOSE_DISABLE_ENV_FILE:-}" == 1 ]] || exit 44
  [[ "${TA_TEST_PORT:-}" =~ ^[0-9]+$ ]] || exit 45
  exit "${FAKE_DOCKER_UP_EXIT:-0}"
fi
exit 0
EOF

cat > "$FAKE_BIN/rsync" <<'EOF'
#!/usr/bin/env bash
destination="${!#}"
mkdir -p "$destination"
cat > "$destination/gradlew" <<'GRADLE'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$ARGS_LOG"
GRADLE
chmod +x "$destination/gradlew"
EOF
chmod +x "$FAKE_BIN/docker" "$FAKE_BIN/rsync" "$FAKE_BIN/uuidgen"

set +e
OUTPUT="$(FAKE_DOCKER_UP_EXIT=42 PATH="$FAKE_BIN:$PATH" "$SCRIPT_DIR/test-with-postgres.sh" --evidence "$EVIDENCE" 2>&1)"
RC=$?
set -e

[[ $RC -eq 42 ]] || {
  printf 'expected compose-up exit 42 after an empty ps result, got %s\n%s\n' "$RC" "$OUTPUT" >&2
  exit 1
}
[[ "$OUTPUT" != *"already has resources"* ]] || {
  printf 'empty compose ps output was treated as a resource\n%s\n' "$OUTPUT" >&2
  exit 1
}
[[ "$OUTPUT" != *"unbound variable"* ]] || {
  printf 'cleanup referenced an unset variable\n%s\n' "$OUTPUT" >&2
  exit 1
}

export ARGS_LOG
PATH="$FAKE_BIN:$PATH" "$SCRIPT_DIR/test-with-postgres.sh" --evidence "$EVIDENCE" \
  --tests com.travelarchive.bucket.BucketPlaceControllerTest
GRADLE_ARGS="$(tr '\n' ' ' < "$ARGS_LOG")"
[[ " $GRADLE_ARGS " == *" test --tests com.travelarchive.bucket.BucketPlaceControllerTest "* ]] || {
  printf 'expected Gradle --tests arguments, got: %s\n' "$GRADLE_ARGS" >&2
  exit 1
}

PATH="$FAKE_BIN:$PATH" "$SCRIPT_DIR/test-with-postgres.sh" --evidence "$EVIDENCE"
GRADLE_ARGS="$(tr '\n' ' ' < "$ARGS_LOG")"
[[ " $GRADLE_ARGS " == *" test "* && " $GRADLE_ARGS " != *" --tests "* ]] || {
  printf 'expected unfiltered Gradle test arguments, got: %s\n' "$GRADLE_ARGS" >&2
  exit 1
}

printf 'ok: preflight, cleanup, UUID normalization, and filtered/unfiltered Gradle args\n'
