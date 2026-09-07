# Travel Archive 문서 안내

N100 최초 운영 배포는 완료됐다. 이 디렉터리는 현재 제품 정의, 개발 환경, 반복 운영과 장애 대응에 필요한 문서만 유지한다.

## 문서 목록

| 문서 | 역할 | 권위 기준 |
|---|---|---|
| `travel_archive_prd.md` | 제품 범위와 사용자 흐름 | 현재 제품 정의 |
| `design-system.md` | UI 디자인 원칙과 컴포넌트 규칙 | 실제 frontend 구현과 함께 참고 |
| `DATABASE_DESIGN.md` | 도메인과 테이블 관계 설명 | Flyway migration이 최종 권위 |
| `2주차_산출물/API_SPECIFICATION.md` | API 요청·응답 참고 | controller, DTO, 테스트가 최종 권위 |
| `LOCAL_DEV_DB_SETUP.md` | 로컬 legacy/disposable PostgreSQL 개발 절차 | application profile과 Compose 설정 |
| `CI_CD.md` | `main → prod` PR 검증 및 merge 배포 계약 | `.github/workflows/` |
| `OPERATIONS.md` | N100 모니터링, 백업, 복구, rollback | 실제 운영 상태와 scripts |
| `MANUAL_DEPLOY.md` | GitHub Actions 장애 시 수동 배포 폴백 | 검증된 merge commit SHA만 사용 |

## 운영 배포 계약

- `.github/workflows/ci.yml`은 `prod` 대상 Pull Request를 검증한다.
- `.github/workflows/deploy.yml`은 동일 저장소의 `main → prod` Pull Request가 merge된 경우에만 실행한다.
- `main` 또는 `prod`에 대한 단순 push는 운영 배포를 실행하지 않는다.
- production environment secrets는 배포 job에서만 사용한다.
- direct push 차단과 required checks는 GitHub의 `prod` branch protection에서도 유지한다.

## 삭제한 문서 범위

최초 서버 구축, PostgreSQL provisioning, NPM 연결, N100 인계, 최초 rollout 체크리스트와 이미 완료된 기능 전환 계획은 현재 반복 작업에 사용하지 않으므로 제거했다. 삭제된 절차를 운영 복구 지침으로 사용하지 않는다.
