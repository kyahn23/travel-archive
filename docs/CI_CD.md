# 운영 CI/CD 계약

## 동작 계약

- `prod` 대상 Pull Request 생성/갱신: backend, frontend, release config, full-stack smoke CI 실행
- Pull Request가 닫히기만 함: 배포하지 않음
- 동일 저장소의 `main → prod` Pull Request가 실제 merge됨: merge commit SHA 이미지 build 및 N100 배포
- `main` push: 자동 운영 배포하지 않음
- direct `prod` push: 배포 workflow가 실행되지 않으며 GitHub branch protection으로도 금지
- 외부 fork 또는 `main` 이외 branch의 Pull Request: merge돼도 운영 배포하지 않음

## 유지해야 하는 GitHub 보호 설정

`prod` ruleset 또는 branch protection에서 다음 조건을 계속 강제한다.

- Require a pull request before merging
- Require approvals: 1 이상
- Require status checks to pass: `backend`, `frontend`, `release-config`, `integration-smoke`
- Require branches to be up to date before merging
- Block force pushes and deletions
- Include administrators 권장

`production` environment에는 필요하면 required reviewer를 둔다.

## production secrets

| Secret | 값 |
|---|---|
| `SERVER_HOST` | N100 hostname 또는 IP |
| `SERVER_USER` | 배포용 SSH 사용자 |
| `SSH_PRIVATE_KEY` | 배포용 private key |
| `SSH_KNOWN_HOSTS` | 사전에 검증한 N100 known_hosts 행 |
| `TS_OAUTH_CLIENT_ID` | GitHub Actions용 Tailscale OAuth client ID |
| `TS_OAUTH_SECRET` | GitHub Actions용 Tailscale OAuth secret |
| `DB_PASSWORD` | `travel_archive` DB role 비밀번호 |
| `JWT_SECRET` | 최소 32자 이상의 별도 운영 secret |

`SSH_KNOWN_HOSTS`는 workflow에서 즉석 `ssh-keyscan`으로 신뢰하지 않는다. 관리자가 별도 경로로 fingerprint를 확인한 값을 등록한다.

## 검증

```bash
bash scripts/verify-deploy-workflow.sh
```
