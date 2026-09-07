# Travel Archive 보안·백업·운영 가이드

이 문서는 최초 N100 운영 배포 이후 반복적으로 적용하는 운영 기준이다.

## 1. 네트워크 최소 노출

- PostgreSQL 5432: host publish 제거 권장. 필요 시 `127.0.0.1` 또는 명시한 관리 LAN만 허용.
- backend 8080: Docker network 내부 전용.
- frontend: container 내부 `3000`, host loopback 기본 `127.0.0.1:3002`. NPM은 `travel-archive` network에서 frontend container로 접근한다.
- 외부 공개: NPM의 80/443만.
- SSH: key 인증과 신뢰 관리 대역 사용.

Docker port publish는 UFW만으로 충분히 차단된다고 가정하지 않는다. Compose 설정과 실제 listen/NAT 상태를 함께 확인한다.

```bash
docker compose -f docker-compose.infrastructure.yml config
docker compose config
ss -ltn
sudo ufw status verbose
```

## 2. secret

- `.env` mode 600, Git 제외.
- `POSTGRES_ADMIN_PASSWORD`, `DB_PASSWORD`, `JWT_SECRET`은 각각 다른 랜덤 값.
- production cookie는 반드시 Secure.
- secret을 shell trace, CI log, 문서, dump filename에 출력하지 않음.
- SSH private key는 GitHub Secret에만 두고 server에는 public key만 둠.
- SSH host key를 known_hosts에 고정하고 `StrictHostKeyChecking=no` 사용 금지.

## 3. health와 모니터링 계약

- backend liveness: `GET /api/health` → 200
- 인증 확인: `GET /api/auth/me` → 비로그인 시 401
- frontend: `GET /` → 200

`/api/auth/me`의 401은 backend 장애가 아니다. healthcheck나 자동 restart 조건으로 200을 기대하면 안 된다.

운영 시 최소 확인 항목:

- container health/restart count
- PostgreSQL disk/volume 용량
- HTTP 5xx와 auth refresh 실패율
- TLS 인증서 만료
- 최근 성공 backup과 restore-drill 시각
- uploads volume 용량

Docker log rotation 예:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

daemon 설정 변경은 서버의 다른 container에도 영향을 주므로 유지보수 시간에 적용한다.

## 4. 백업 완료의 정의

백업 파일이 존재하는 것만으로 완료가 아니다. 한 run에 다음이 모두 있어야 한다.

- PostgreSQL custom-format dump
- uploads archive
- SHA-256 checksum
- 생성 시각, DB/app version, artifact 목록을 담은 manifest
- source와 분리된 저장 위치
- disposable PostgreSQL/volume에 실제 restore한 성공 evidence

`scripts/backup.sh`는 custom-format dump, uploads archive, manifest, checksum을 원자적으로 게시한다. 정기적으로 `BACKUP_RUN_DIR=<run> bash scripts/verify-backup.sh`로 disposable PostgreSQL/volume restore drill을 수행한다.

## 5. 수동 DB snapshot 예시

아래는 임시 보존용 snapshot 예시이며 완전한 운영 backup 자동화를 대신하지 않는다.

```bash
set -euo pipefail
umask 077

BACKUP_ROOT="$HOME/backups/travel-archive"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$BACKUP_ROOT/$RUN_ID"
install -d -m 700 "$RUN_DIR"

docker exec home-postgres sh -lc '
  PGPASSWORD="$DB_PASSWORD" exec pg_dump \
    -h 127.0.0.1 -U travel_archive -d travel_archive \
    --format=custom --no-owner --no-privileges
' > "$RUN_DIR/travel_archive.dump"

test -s "$RUN_DIR/travel_archive.dump"
docker run --rm -v "$RUN_DIR:/backup:ro" postgres:16-alpine \
  pg_restore --list /backup/travel_archive.dump >/dev/null

(
  cd "$RUN_DIR"
  sha256sum travel_archive.dump > SHA256SUMS
)
```

uploads archive와 manifest, off-host copy, restore drill은 별도로 반드시 추가한다.

## 6. 복구 원칙

- production DB 위에 바로 restore하지 않는다.
- checksum을 먼저 확인한다.
- disposable PostgreSQL 16에 restore하고 schema/count/app validate를 확인한다.
- 복구 대상 DB와 uploads snapshot의 시점을 맞춘다.
- migration 적용 후 DB rollback은 단순히 이전 app image를 띄우는 것으로 해결되지 않는다.
- destructive reset/drop은 정확한 target을 확인하고 사용자 승인 후 수행한다.

## 7. 배포와 rollback

운영 배포는 동일 저장소의 `main → prod` Pull Request가 GitHub에서 merge될 때만 실행한다. `prod` push 자체는 배포 트리거가 아니다. 배포 전에 PR의 test/build/migration/smoke gate를 통과하며 release는 merge commit SHA로 식별한다.

rollback에는 다음이 필요하다.

- 실제 이전 backend/frontend image tag
- 이전 `.current-version` 또는 release manifest
- DB migration의 forward-fix/restore 결정
- rollback 후 `/api/health`, frontend, auth flow 검증

표준 배포 경로는 `.github/workflows/deploy.yml`과 `scripts/deploy.sh`이며, GitHub Actions 장애 시에만 `docs/MANUAL_DEPLOY.md`를 사용한다.

## 8. 정기 점검

- 매일: backup 성공과 artifact 크기 확인
- 매주: off-host copy와 disk 여유 확인
- 매월: disposable restore drill
- 배포마다: health/auth/smoke와 Flyway history 확인
- secret 노출 의심 시 즉시 rotate: DB password, JWT secret, SSH key, refresh token
