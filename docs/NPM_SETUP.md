# Nginx Proxy Manager 연결 가이드

이 문서는 app build/auth/Compose gate를 통과하고 N100 container가 healthy인 뒤 사용한다.

## 권장 공개 구조

하나의 HTTPS origin을 권장한다.

```text
https://travel.<domain>
  /       -> NPM -> travel-archive-frontend:3000
  /api/*  -> frontend server rewrite -> travel-archive-backend:8080
```

별도 `api.<domain>` 공개는 현재 기본안이 아니다. JWT cookie와 CSRF를 same-origin으로 유지하는 편이 단순하고 안전하다.

## 선행 조건

- frontend/backend container healthy
- `/api/health` 200
- 비로그인 `/api/auth/me` 401
- frontend rewrite destination이 Docker 내부 backend URL로 확정됨
- production cookies에 Secure/SameSite/HttpOnly가 의도대로 설정됨
- NPM container 이름과 현재 network 확인

frontend는 browser의 same-origin `/api`를 Docker 내부 `API_ORIGIN=http://travel-archive-backend:8080`으로 전달한다.

## Docker network

NPM이 frontend container 이름을 해석하려면 같은 Docker network에 있어야 한다.

```bash
docker network ls
docker inspect <npm-container-name> --format '{{json .NetworkSettings.Networks}}'
docker inspect travel-archive-frontend --format '{{json .NetworkSettings.Networks}}'
```

연결이 필요하면 정확한 network 이름을 확인한 뒤 실행한다.

```bash
docker network connect travel-archive <npm-container-name>
```

이미 연결돼 있으면 재실행하지 않는다. backend를 NPM network에 직접 연결할 필요는 없다.

## Proxy Host

NPM UI에서:

- Domain: `travel.<your-domain>`
- Scheme: `http`
- Forward hostname: `travel-archive-frontend`
- Forward port: `3000`
- Block Common Exploits: enabled
- Websocket Support: 앱에서 필요할 때만

SSL:

- Let's Encrypt certificate 발급
- Force SSL enabled
- HTTP/2 enabled
- 실제 DNS가 홈서버 public IP를 가리킨 뒤 발급

NPM 초기 default credential은 설치 즉시 변경한다.

## 검증

```bash
curl -fsSI https://travel.<your-domain>/
curl -fsS https://travel.<your-domain>/api/health
test "$(curl -sS -o /dev/null -w '%{http_code}' https://travel.<your-domain>/api/auth/me)" = 401
```

브라우저에서 signup/login/refresh/logout을 실행해 cookie의 Secure, HttpOnly, SameSite, Path와 CSRF header를 확인한다. curl health만으로 인증 배포 완료를 판정하지 않는다.
