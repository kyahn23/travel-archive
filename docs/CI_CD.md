# prod Pull Request CI/CD

## 동작 계약

- `prod` 대상 Pull Request 생성/갱신: backend, frontend, release config, full-stack smoke CI 실행
- Pull Request가 닫히기만 함: 배포하지 않음
- Pull Request가 `prod`에 실제 merge됨: merge commit SHA 이미지 build 및 N100 배포
- `main` push: 자동 운영 배포하지 않음
- direct `prod` push: GitHub branch protection으로 금지

## GitHub 설정

1. 원격 `prod` branch를 현재 안정 커밋에서 한 번 생성한다.
2. Settings → Branches 또는 Rulesets에서 `prod`에 다음을 적용한다.
   - Require a pull request before merging
   - Require approvals: 1 이상
   - Require status checks to pass
   - Required checks: `backend`, `frontend`, `release-config`, `integration-smoke`
   - Require branches to be up to date before merging
   - Block force pushes and deletions
   - Include administrators 권장
3. Settings → Environments에 `production`을 만들고 필요하면 required reviewer를 지정한다.

## production secrets

| Secret | 값 |
|---|---|
| `SERVER_HOST` | N100 hostname 또는 IP |
| `SERVER_USER` | 배포용 SSH 사용자 |
| `SSH_PRIVATE_KEY` | 배포용 private key |
| `SSH_KNOWN_HOSTS` | 사전에 검증한 N100 known_hosts 행 |
| `DB_PASSWORD` | `travel_archive` DB role 비밀번호 |
| `JWT_SECRET` | 최소 32자 이상의 별도 운영 secret |

`SSH_KNOWN_HOSTS`는 workflow에서 즉석 `ssh-keyscan`으로 신뢰하지 않는다. 관리자가 별도 경로로 fingerprint를 확인한 값을 등록한다.

## 최초 배포 전 N100 준비

- `~/travel-archive` directory
- Docker Engine과 Compose v2
- external Docker network `infrastructure`
- healthy `home-postgres`와 빈 `travel_archive` DB/role
- NPM은 앱 배포 후 `travel-archive` network에 연결

최초 DB 생성에는 root `.env`의 `POSTGRES_ADMIN_PASSWORD`가 필요하지만 애플리케이션 배포 workflow secret은 아니다. 자동 배포는 별도 `.env.app`만 갱신하므로 인프라용 root `.env`를 덮어쓰지 않는다.
