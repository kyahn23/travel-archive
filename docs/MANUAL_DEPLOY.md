# 수동 배포 폴백 가이드

> 표준 운영 배포는 `prod` Pull Request merge workflow다. 이 문서는 GitHub Actions 장애 시 검증된 merge commit SHA를 수동 배포하는 폴백이다.

## 배포 전 필수 증거

- 배포할 commit/tag가 확정되고 worktree가 재현 가능함
- backend clean test/build 성공
- frontend lint/type/test/build 성공
- 신규 빈 DB migration과 Hibernate validate 성공
- Compose config와 clean-copy smoke 성공
- production cookie/CSRF/refresh 통합 검증 성공
- DB와 uploads backup + restore drill 성공
- N100의 `home-postgres` healthy와 Flyway history 일치
- 이전 immutable app image와 rollback 절차 확인

## 수동 폴백 흐름

```bash
git fetch origin prod
APP_VERSION="$(git rev-parse origin/prod)"
test "$(git rev-parse HEAD)" = "$APP_VERSION"
test -z "$(git status --porcelain)"
export APP_VERSION
export SERVER_HOST="<deploy-user>@<n100-host>"

rsync -az \
  --exclude='.git' \
  --exclude='.env*' \
  --exclude='.omo' \
  --exclude='.opencode' \
  --exclude='.playwright-mcp' \
  --exclude='node_modules' \
  --exclude='backend/build' \
  --exclude='backend/.gradle' \
  --exclude='backend/bin' \
  --exclude='frontend/.next' \
  ./ "$SERVER_HOST":~/travel-archive/

ssh "$SERVER_HOST" 'cd ~/travel-archive && test -f .env.app && \
  docker compose -f docker-compose.infrastructure.yml ps && \
  docker exec home-postgres sh -lc '\''
  PGPASSWORD="$DB_PASSWORD" psql \
    -v ON_ERROR_STOP=1 -h 127.0.0.1 \
    -U travel_archive -d travel_archive \
    -c "select installed_rank, version, script, checksum, success from flyway_schema_history order by installed_rank"
'\'''
```

위 결과와 배포 대상 migration을 비교하고 backup/restore evidence를 확인한다. 그 다음에만 검증된 release 절차로 build/up한다.

```bash
SERVER_HOST="$SERVER_HOST" APP_VERSION="$APP_VERSION" bash scripts/deploy.sh
ssh "$SERVER_HOST" 'cd ~/travel-archive && docker compose --env-file .env.app ps'
```

검증은 실제 접근 경로에서 수행한다.

```bash
curl -fsS https://<travel-domain>/
curl -fsS https://<travel-domain>/api/health
test "$(curl -sS -o /dev/null -w '%{http_code}' https://<travel-domain>/api/auth/me)" = 401
```

backend가 host 8080에 publish되지 않는 구성에서는 `localhost:8080`을 배포 검증으로 사용하지 않는다.

## rollback

단순히 current image에 `rollback` tag를 추가하는 것은 rollback이 아니다. 배포 전에 기록한 이전 immutable image tag로 Compose가 실제 재기동돼야 한다.

DB migration이 적용됐다면 app image만 되돌려도 호환되는지 먼저 판단한다. 불확실하면 서비스를 중지하고 복구 결정을 사용자에게 보고한다. volume 삭제, DB drop, prune은 rollback 절차에 포함하지 않는다.
