# N100 홈서버 설정 가이드

N100 Ubuntu 서버에 Travel Archive를 처음 배치할 때의 전체 순서다. DB 명령은 `docs/N100_POSTGRES_FROM_LOCAL_DOCKER.md`, 현재 코드 상태는 `docs/README.md`가 권위 문서다.

현재 판정일: 2026-08-26
현재 배포 상태: **코드 검증 통과** — GitHub/N100 외부 설정 후 배포 가능

## 1. 단계와 gate

| 단계 | 작업 | 현재 실행 가능 |
|---:|---|---|
| 0 | 기존 서버 자원 read-only 조사 | 가능 |
| 1 | Docker/Compose/SSH/방화벽 준비 | 가능 |
| 2 | PostgreSQL 16 + 빈 `travel_archive` DB 생성 | DB 문서의 승인을 거쳐 가능 |
| 3 | Flyway schema와 기준 데이터 적용 | 검증된 main/prod release로 가능 |
| 4 | backend/frontend 배포 | prod PR merge workflow로 가능 |
| 5 | NPM/HTTPS 공개 | 앱 healthy 확인 후 가능 |
| 6 | 백업/restore drill과 모니터링 | 첫 배포 직후 수행 |

외부 설정과 중지 조건은 `docs/README.md`와 `docs/CI_CD.md`를 따른다.

## 2. 서버 기본 조사

```bash
uname -a
cat /etc/os-release
id
df -h
free -h
ip -brief address

docker version
docker compose version
docker ps -a
docker volume ls
docker network ls
ss -ltn
```

출력을 보고 기존 프로젝트 container, volume, network, 3000/5432/8080 port 충돌을 식별한다. 이름이 다르다는 이유로 Travel Archive와 무관하다고 단정하지 않는다.

## 3. 필수 소프트웨어

- Ubuntu Server 22.04 또는 24.04 LTS
- Docker Engine과 Docker Compose v2 plugin
- Git, OpenSSH Server, curl, rsync
- Nginx Proxy Manager는 앱 공개 단계에서 필요

Docker가 없다면 Docker 공식 Ubuntu 저장소 절차로 설치한다. 설치 후 현재 사용자를 docker group에 추가하면 재로그인이 필요하다.

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

재로그인 후:

```bash
docker info >/dev/null
docker compose version
```

## 4. 저장소 위치

서버 표준 경로는 `~/travel-archive`다.

```bash
test ! -e ~/travel-archive || {
  echo 'STOP: ~/travel-archive already exists; inspect it first' >&2
  exit 1
}

git clone <repository-url> ~/travel-archive
cd ~/travel-archive
git status --short
git rev-parse --show-toplevel
```

현재 Mac 작업 트리의 운영 파일 다수가 미추적 상태이므로, 단순히 원격 `main`을 clone하면 이 문서가 보는 bytes와 다를 수 있다. N100 작업 전에 사용할 commit/tag가 실제 변경을 포함하는지 확인한다. 임시 rsync와 Git clone을 섞지 않는다.

현재 GitHub Actions도 `docs`와 `*.md`를 rsync에서 제외한다. 홈서버 Codex가 참조할 문서는 별도로 전송한 뒤 server 쪽 파일의 checksum을 확인한다.

## 5. SSH 보안

- 개인 계정과 key 인증을 사용한다.
- 공개키만 `~/.ssh/authorized_keys`에 둔다.
- private key를 서버나 저장소에 복사하지 않는다.
- 비밀번호 SSH를 끄기 전 별도 세션에서 key 로그인을 검증한다.
- GitHub Actions를 사용할 경우 server host key를 `known_hosts`에 고정한다. `StrictHostKeyChecking=no`를 사용하지 않는다.

## 6. 네트워크/방화벽 원칙

- 인터넷 공개: 80/443만 NPM으로 허용
- SSH: 신뢰할 수 있는 관리 대역으로 제한 권장
- PostgreSQL 5432: 인터넷 공개 금지
- backend 8080: host publish 없이 Docker network 내부 사용 권장
- frontend 3000: NPM이 같은 Docker network에서 접근하면 host publish 제거 가능

Docker publish는 UFW만으로 충분히 차단된다고 가정하지 않는다. infrastructure Compose는 PostgreSQL을 `127.0.0.1`에만 bind하며 외부 접근이 필요하면 별도 승인된 override를 사용한다.

## 7. PostgreSQL 신규 생성

`docs/N100_POSTGRES_FROM_LOCAL_DOCKER.md`의 경로 A를 따른다. 요약하면:

1. 기존 container/volume/DB/role/.env/port 충돌 조사
2. 5432 외부 publish 제거 또는 loopback 제한 승인
3. N100 전용 `POSTGRES_ADMIN_PASSWORD`, `DB_PASSWORD` 준비
4. `docker-compose.infrastructure.yml` 기동
5. PostgreSQL 16, locale, role, owner, 빈 schema 검증
6. backend를 시작하지 않고 중지

로컬 legacy snapshot 복제(경로 B)는 사용자가 별도로 승인한 경우에만 수행한다.

## 8. 앱 배포 재개 조건

다음 증거가 모두 있어야 한다.

- backend compile/test 성공
- frontend lint/type/test/build 성공
- 빈 PostgreSQL에 corrected Flyway migration 성공
- Flyway history가 저장소 파일과 정확히 일치
- `/api/health` 200 및 `/api/auth/me` 401 계약 확인
- signup/login/refresh/logout CSRF 통합 테스트 성공
- production secure cookie 확인
- Compose config와 clean-copy smoke 성공
- DB + uploads backup을 disposable target에 restore한 drill 성공
- rollback이 실제 이전 immutable image를 재기동함을 확인

현재 `.github/workflows/deploy.yml`은 이 gate를 만족하지 않으므로 자동 배포를 실행하지 않는다.

## 9. 향후 앱 환경 변수

DB 생성 단계의 `.env`에 앱 배포 시 다음을 추가한다. 실제 값은 출력하지 않고 mode 600을 유지한다.

```dotenv
JWT_SECRET=<at-least-32-random-characters>
API_ORIGIN=http://travel-archive-backend:8080
```

추가로 Compose가 production cookie를 보장하도록 `SPRING_PROFILES_ACTIVE=prod` 또는 `COOKIE_SECURE=true`에 대응하는 실제 Spring property 전달을 확정해야 한다. 현재 Compose에는 둘 다 없다.

브라우저는 same-origin `/api`만 사용하고 Next.js server rewrite는 비공개 `API_ORIGIN=http://travel-archive-backend:8080`을 사용한다.

## 10. NPM/HTTPS

앱 gate 통과 후 `docs/NPM_SETUP.md`를 따른다. 권장 구조는 하나의 공개 origin이다.

```text
browser -> https://travel.<domain> -> NPM -> frontend:3000
                                      frontend server rewrite -> backend:8080
```

이 구조는 cookie/CSRF의 same-origin 계약을 단순하게 한다. NPM container는 frontend가 속한 Docker network에 명시적으로 연결한다. backend를 별도 공개 domain으로 노출하는 방식은 현재 기본안이 아니다.

## 11. 백업과 복구

`scripts/backup.sh`는 DB dump, uploads, manifest, checksum을 한 run으로 만들고 `scripts/verify-backup.sh`는 disposable PostgreSQL과 volume에 복원한다. N100 첫 run의 restore drill이 통과한 뒤 cron을 등록한다.

최소 운영 백업에는 다음이 함께 있어야 한다.

- PostgreSQL custom-format dump
- uploads volume archive
- 각 artifact checksum
- PostgreSQL/app version과 생성 시각을 담은 manifest
- 별도 disposable PostgreSQL에 실제 restore한 증거

## 12. 완료 체크리스트

### 지금 수행할 서버/DB 기반

- [ ] 기존 Docker/port/storage 충돌 조사
- [ ] Docker/Compose v2 정상
- [ ] SSH key 로그인 검증
- [ ] 저장소 bytes/commit 출처 확정
- [ ] PostgreSQL 5432 외부 비공개
- [ ] N100 전용 `.env` mode 600
- [ ] `home-postgres` healthy
- [ ] PostgreSQL 16 및 locale 일치
- [ ] `travel_archive` role/DB/owner 확인
- [ ] public table count 0
- [ ] backend/frontend 미기동

### 앱 배포와 공개

- [ ] migration/build/auth/deploy gate 통과
- [ ] backend/frontend 정상 기동
- [ ] NPM same-origin HTTPS 구성
- [ ] 외부 smoke test
- [ ] backup/restore drill 성공
- [ ] 모니터링과 인증서 갱신 확인
