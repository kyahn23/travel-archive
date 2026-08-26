# Travel Archive API 명세서

> **설계 명세 참고**: 현재 작업 트리의 controller/DTO/frontend client가 우선이며, 이 문서만으로 배포 가능 여부를 판단하지 않는다. 현재 차단 사항은 `docs/README.md`를 따른다.

> **작성 기준**: 2주차 개발 완료 시점의 백엔드 REST API (Spring Boot 4.0.6)
> **인증 방식**: JWT (httpOnly Cookie) — `access_token`, `refresh_token`
> **Base URL**: `http://localhost:8080`
> **응답 포맷**: 공통 래퍼 `ApiResponse<T>` (`{ data: T, message: string }`)

---

## 공통 규칙

| 항목 | 설명 |
|------|------|
| 인증 필요 | `Authorization` 헤더가 아닌 httpOnly Cookie 기반. 브라우저가 쿠키를 자동 전송 |
| Access Token TTL | 15분 |
| Refresh Token TTL | 7일 |
| Cookie 속성 | `HttpOnly`, `SameSite=Strict`, Secure는 prod profile에서만 활성화 |
| Content-Type | `application/json` (파일 업로드 제외) |

---

## 1. 인증 (Auth)

### 1.1 회원가입

```http
POST /api/auth/signup
```

**Request Body**

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| email | string | `@NotBlank` `@Email` | 로그인 ID |
| password | string | `@NotBlank` `@Size(min=8, max=72)` | 비밀번호 |
| nickname | string | `@NotBlank` `@Size(min=2, max=80)` | 닉네임 |

**Response**
- `201 Created`
- `Set-Cookie: access_token=...; refresh_token=...`
- `data`: `{ tokenType: "Bearer", accessTokenExpiresInSeconds: 900 }`

---

### 1.2 로그인

```http
POST /api/auth/login
```

**Request Body**

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| email | string | `@NotBlank` `@Email` | 이메일 |
| password | string | `@NotBlank` | 비밀번호 |

**Response**
- `200 OK`
- `Set-Cookie: access_token=...; refresh_token=...`
- `data`: `{ tokenType: "Bearer", accessTokenExpiresInSeconds: 900 }`

---

### 1.3 토큰 갱신

```http
POST /api/auth/refresh
```

**Request**: `refresh_token` 쿠키 자동 전송

**Response**
- `200 OK` — `Set-Cookie: access_token=...` (새 Access Token)
- `401 Unauthorized` — 쿠키 없음 또는 유효하지 않은 Refresh Token

---

### 1.4 로그아웃

```http
POST /api/auth/logout
```

**Request**: `refresh_token` 쿠키 자동 전송

**Response**
- `200 OK` — `Set-Cookie: access_token=; max-age=0; refresh_token=; max-age=0`

---

### 1.5 현재 사용자 정보

```http
GET /api/auth/me
```

**Response**
- `data`: `{ id: number, email: string, nickname: string, role: string }`

---

## 2. 여행 (Trip) — 2주차 핵심 CRUD

### 2.1 여행 목록 조회

```http
GET /api/trips
```

**Response**
- `data`: `TripResponse[]`

**TripResponse**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 여행 ID |
| title | string | 여행명 |
| travelScope | string | `DOMESTIC` / `INTERNATIONAL` |
| countryId | string? | 해외 국가 코드 (해외 시) |
| domesticRegionId | string? | 국내 지역 코드 (국내 시) |
| cityName | string? | 도시명 |
| startDate | string (date) | 시작일 (YYYY-MM-DD) |
| endDate | string (date) | 종료일 (YYYY-MM-DD) |
| status | string | `PLANNED` / `COMPLETED` / `CANCELLED` |
| travelType | string? | 여행 유형 |
| companion | string? | 동행자 |
| summary | string? | 요약/메모 |
| tripDays | TripDayResponse[] | 날짜별 정보 |
| coverPhotoId | number? | 대표 사진 ID |

**TripDayResponse**: `{ id, dayNo, travelDate, title, memo }`

---

### 2.2 여행 생성

```http
POST /api/trips
```

**Request Body** (`TripRequest`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 여행명 |
| travel_scope | string | O | `DOMESTIC` / `INTERNATIONAL` |
| country_id | string | 조건부 | 해외 여행 시 필수 |
| domestic_region_id | string | 조건부 | 국내 여행 시 필수 |
| city_name | string | X | 도시명 |
| start_date | string (date) | O | 시작일 |
| end_date | string (date) | O | 종료일 |
| travel_type | string | X | 여행 유형 |
| companion | string | X | 동행자 |
| summary | string | X | 요약 |

**Response**: `201 Created` — `TripResponse`

> **비고**: 생성 시 `trip_days`가 자동으로 `start_date`~`end_date` 기간만큼 생성되며, `travel_checklists`도 템플릿 기반으로 자동 생성됩니다.

---

### 2.3 여행 상세 조회

```http
GET /api/trips/{id}
```

**Response**: `TripResponse`

---

### 2.4 여행 수정

```http
PATCH /api/trips/{id}
```

**Request Body**: `TripRequest` (전체 또는 부분 필드)

**Response**: `TripResponse`

---

### 2.5 여행 삭제

```http
DELETE /api/trips/{id}
```

**Response**: `200 OK` — `{ data: null, message: "Success" }`

> **비고**: CASCADE로 연결된 `trip_days`, `trip_timeline_items`, `trip_photos`, `travel_checklists` 및 `travel_checklist_items`가 함께 삭제됩니다.

---

### 2.6 여행 상태 변경

```http
PATCH /api/trips/{id}/status
```

**Request Body**

| 필드 | 타입 | 설명 |
|------|------|------|
| status | string | `PLANNED` / `COMPLETED` / `CANCELLED` |

**Response**: `TripResponse`

---

## 3. 버킷리스트 (Bucket Place) — 2주차 핵심 CRUD

### 3.1 버킷리스트 목록 조회

```http
GET /api/buckets
```

**Response**: `BucketPlaceResponse[]`

**BucketPlaceResponse**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 버킷 ID |
| title | string | 장소명 |
| travelScope | string | `DOMESTIC` / `INTERNATIONAL` |
| countryId | string? | 국가 코드 |
| domesticRegionId | string? | 지역 코드 |
| cityName | string? | 도시 |
| reason | string? | 가고 싶은 이유 |
| expectedBudget | number? | 예상 예산 |
| desiredSeason | string? | 희망 시기 |
| companion | string? | 동행자 |
| priority | number | 1~5 우선순위 (기본 3) |
| status | string | `WANT_TO_GO` / `PLANNING` / `BOOKED` / `VISITED` / `ON_HOLD` |
| referenceUrl | string? | 참고 링크 |
| memo | string? | 메모 |
| createdAt | string (datetime) | 생성일 |
| updatedAt | string (datetime) | 수정일 |

---

### 3.2 버킷리스트 생성

```http
POST /api/buckets
```

**Request Body** (`BucketPlaceRequest`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 장소명 |
| travel_scope | string | O | `DOMESTIC` / `INTERNATIONAL` |
| country_id | string | 조건부 | 해외 시 필수 |
| domestic_region_id | string | 조건부 | 국내 시 필수 |
| city_name | string | X | 도시 |
| reason | string | X | 이유 |
| expected_budget | number | X | 예상 예산 |
| desired_season | string | X | 희망 시기 |
| companion | string | X | 동행자 |
| priority | number | X | 1~5 (기본 3) |
| status | string | X | 기본 `WANT_TO_GO` |
| reference_url | string | X | 참고 링크 |
| memo | string | X | 메모 |

**Response**: `201 Created` — `BucketPlaceResponse`

---

### 3.3 버킷리스트 상세 조회

```http
GET /api/buckets/{id}
```

**Response**: `BucketPlaceResponse`

---

### 3.4 버킷리스트 수정

```http
PATCH /api/buckets/{id}
```

**Request Body**: `BucketPlaceRequest` (전체 또는 부분 필드)

**Response**: `BucketPlaceResponse`

---

### 3.5 버킷리스트 삭제

```http
DELETE /api/buckets/{id}
```

**Response**: `200 OK`

---

### 3.6 버킷리스트 → 여행 전환

```http
POST /api/buckets/{id}/convert-to-trip
```

**Request Body**: `BucketPlaceRequest` (기간 정보 `start_date`, `end_date` 등 추가 입력)

**Response**: `201 Created` — `TripResponse`

> **비고**: 버킷 정보를 복사하여 새 `trips` 레코드를 생성하고, `trip_days` 및 `travel_checklists`도 함께 생성합니다.

---

## 4. 타임라인 (Timeline)

### 4.1 타임라인 조회 (일자별 그룹핑)

```http
GET /api/trips/{tripId}/timeline
```

**Response**: `DayGroup[]`

**DayGroup**: `{ tripDayId, tripDay, travelDate, items: TimelineItemResponse[] }`

**TimelineItemResponse**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 항목 ID |
| tripDayId | number | 소속 일자 ID |
| tripDay | number | 몇 번째 날 |
| travelDate | string (date) | 해당 날짜 |
| visitedAt | string (datetime)? | 방문 시간 |
| title | string | 제목 |
| placeName | string? | 장소명 |
| address | string? | 주소 |
| latitude | number? | 위도 |
| longitude | number? | 경도 |
| category | string | `PLACE` / `FOOD` / `ACTIVITY` / `MOVE` / `MEMO` |
| memo | string? | 메모 |
| photos | PhotoResponse[] | 첨부 사진 |

**PhotoResponse**: `{ id, storageKey, fileUrl, originalFileName, contentType, fileSize, caption, sortOrder }`

---

### 4.2 타임라인 항목 생성

```http
POST /api/trips/{tripId}/timeline-items
```

**Request Body** (`TimelineItemRequest`)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| title | string | O | 제목 |
| place_name | string | X | 장소명 |
| address | string | X | 주소 |
| latitude | number | X | 위도 |
| longitude | number | X | 경도 |
| visited_at | string (datetime) | X | 방문 시간 |
| category | string | O | `PLACE` / `FOOD` / `ACTIVITY` / `MOVE` / `MEMO` |
| memo | string | X | 메모 |

**Response**: `201 Created` — `TimelineItemResponse`

---

### 4.3 타임라인 항목 수정

```http
PATCH /api/timeline-items/{id}
```

**Request Body**: `TimelineItemRequest`

**Response**: `TimelineItemResponse`

---

### 4.4 타임라인 항목 삭제

```http
DELETE /api/timeline-items/{id}
```

**Response**: `200 OK`

---

### 4.5 타임라인 항목에 사진 추가 (메타데이터)

```http
POST /api/timeline-items/{id}/photos
```

**Request Body**: `{ storage_key, file_url, original_file_name, content_type, file_size, caption }`

**Response**: `201 Created` — `PhotoResponse`

---

## 5. 사진 (Photo)

### 5.1 커버 이미지 업로드

```http
POST /api/trips/{tripId}/cover-image
Content-Type: multipart/form-data
```

**Request**: `file` (MultipartFile)

**Response**: `201 Created` — `PhotoResponse`

> **제약**: 여행당 1개의 커버 이미지만 가능

---

### 5.2 타임라인 사진 업로드

```http
POST /api/timeline-items/{id}/photos
Content-Type: multipart/form-data
```

**Request**: `file` (MultipartFile)

**Response**: `201 Created` — `PhotoResponse`

> **제약**: 타임라인 항목당 최대 3장

---

### 5.3 커버 이미지 조회

```http
GET /api/trips/{tripId}/cover-image
```

**Response**: `PhotoResponse` 또는 `{ data: null, message: "No cover image" }`

---

### 5.4 사진 파일 서빙

```http
GET /api/files/{photoId}
```

**Response**: `image/*` — `Content-Disposition: inline`

---

## 6. 체크리스트 (Checklist)

### 6.1 체크리스트 조회/생성

```http
GET /api/trips/{tripId}/checklists
```

**Response**: `ChecklistResponse`

**ChecklistResponse**

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 체크리스트 ID |
| tripId | number | 여행 ID |
| title | string | 제목 |
| progressRate | number | 완료율 (%) |
| items | ChecklistItemResponse[] | 항목 목록 |

**ChecklistItemResponse**: `{ id, category, content, status, sortOrder, dueDate }`

> **비고**: 체크리스트가 없으면 `travel_scope` 기반 템플릿으로 자동 생성합니다.

---

### 6.2 체크리스트 명시적 생성

```http
POST /api/trips/{tripId}/checklists
```

**Response**: `201 Created` — `ChecklistResponse`

---

### 6.3 체크리스트 항목 토글

```http
PATCH /api/checklist-items/{id}
```

**Response**: `ChecklistResponse` (완료율 자동 재계산)

---

### 6.4 체크리스트 항목 추가 (사용자 정의)

```http
POST /api/checklists/{checklistId}/items
```

**Request Body**: `{ content: string, category?: string }` (category 미입력 시 `ETC`)

**Response**: `201 Created` — `ChecklistItemResponse`

---

### 6.5 체크리스트 항목 삭제

```http
DELETE /api/checklist-items/{id}
```

**Response**: `200 OK` (완료율 자동 재계산)

---

## 7. 지도 (Map)

### 7.1 세계 지도 집계

```http
GET /api/maps/world
```

**Response**: `WorldRegion[]`

**WorldRegion**: `{ mapKey, countryCode, nameKo, status }`

> `status`: `COMPLETED` > `PLANNED` > `BUCKET` 우선순위로 결정

---

### 7.2 국내 지도 집계

```http
GET /api/maps/domestic
```

**Response**: `DomesticRegion[]`

**DomesticRegion**: `{ mapKey, regionCode, nameKo, status }`

---

### 7.3 지역 상세

```http
GET /api/maps/regions/{mapKey}
```

**Response**: `RegionDetail`

**RegionDetail**: `{ mapKey, name, completedCount, plannedCount, bucketCount, trips: TripSummary[] }`

**TripSummary**: `{ id, title, travelScope, startDate, endDate, status, cityName }`

---

## 8. 통계 (Statistics)

### 8.1 요약 통계

```http
GET /api/statistics/summary
```

**Response**: `Summary`

**Summary**: `{ completedTrips, plannedTrips, travelDays, visitedCountries, visitedDomesticRegions }`

---

### 8.2 월별 통계

```http
GET /api/statistics/monthly
```

**Response**: `MonthlyCount[]`

**MonthlyCount**: `{ month: "YYYY-MM", count: number }`

---

### 8.3 인기 지역 TOP N

```http
GET /api/statistics/top-regions?limit={N}
```

**Query Parameters**

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| limit | number | (전체) | 조회 개수 |

**Response**: `TopRegion[]`

**TopRegion**: `{ name, scope: "DOMESTIC" | "INTERNATIONAL", count }`

---

## 상태 코드 정리

| 코드 | 의미 | 발생 상황 |
|------|------|----------|
| 200 | 성공 | 정상 응답 |
| 201 | 생성됨 | POST 성공 |
| 400 | 잘못된 요청 | 유효성 검증 실패, 비즈니스 규칙 위반 |
| 401 | 인증 필요 | JWT 만료/누락, 사용자 없음 |
| 403 | 접근 금지 | 소유자가 아닌 리소스 접근 |
| 404 | 리소스 없음 | 존재하지 않는 ID 조회 |
| 500 | 서버 오류 | 예상치 못한 내부 오류 |

---

## 2주차 구현 완료 범위

| 영역 | 구현 상태 | 비고 |
|------|----------|------|
| 인증 (Auth) | ✅ 완료 | 회원가입, 로그인, 토큰 갱신, 로그아웃, 내 정보 |
| 여행 CRUD | ✅ 완료 | 목록, 생성, 상세, 수정, 삭제, 상태 변경 |
| 버킷리스트 CRUD | ✅ 완료 | 목록, 생성, 상세, 수정, 삭제, 여행 전환 |
| 타임라인 | ✅ 완료 | 조회, 생성, 수정, 삭제, 사진 추가 |
| 사진 업로드 | ✅ 완료 | 커버 이미지, 타임라인 사진, 파일 서빙 |
| 체크리스트 | ✅ 완료 | 템플릿 기반 자동 생성, 토글, 추가, 삭제 |
| 지도 집계 | ✅ 완료 | 세계/국내 지도, 지역 상세 |
| 통계 | ✅ 완료 | 요약, 월별, 인기 지역 |

> **기술적 특징**: Spring Security + JWT (httpOnly Cookie), JPA/Hibernate, PostgreSQL, Spring Validation, Lombok 기반의 RESTful API.
