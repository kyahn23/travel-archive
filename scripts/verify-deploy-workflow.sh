#!/usr/bin/env bash

set -eEuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CI="$ROOT/.github/workflows/ci.yml"
DEPLOY="$ROOT/.github/workflows/deploy.yml"

require() {
  local pattern="$1" file="$2"
  grep -Eq -- "$pattern" "$file" || { echo "missing '$pattern' in $file" >&2; exit 1; }
}

reject() {
  local pattern="$1" file="$2"
  if grep -Eq -- "$pattern" "$file"; then
    echo "forbidden '$pattern' in $file" >&2
    exit 1
  fi
}

require 'branches: \[prod\]' "$CI"
require 'integration-smoke:' "$CI"
require 'types: \[closed\]' "$DEPLOY"
require 'pull_request\.merged == true' "$DEPLOY"
require 'merge_commit_sha' "$DEPLOY"
require 'SSH_KNOWN_HOSTS' "$DEPLOY"
reject 'StrictHostKeyChecking=no' "$DEPLOY"
reject 'push:' "$DEPLOY"

bash -n "$ROOT/scripts/deploy.sh"
echo 'deploy workflow contract passed'
