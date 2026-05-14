# Travel Archive 백엔드 완벽 가이드

> 대상 독자: Travel Archive 프로젝트를 읽으며 Spring Boot 백엔드를 배우는 주니어 개발자  
> 기준 코드: Spring Boot 4.0.6, Java 25, JPA/Hibernate, Spring Security, JWT, PostgreSQL, Gradle  
> 학습 방식: “개념 → 이 프로젝트 코드 → 왜 이렇게 했는가 → 바꾸면 생기는 일” 순서로 읽는다.

---

## 000. 이 문서가 다루는 범위

Travel Archive는 개인 여행 기록 PWA의 백엔드 API 서버다. 핵심 PRD 요구는 다음과 같다.

- 회원가입/로그인/내 정보 조회: JWT를 httpOnly 쿠키로 관리한다.
- 여행 CRUD: 여행 기간을 입력하면 `TripDay`가 자동 생성된다.
- 버킷리스트: 가고 싶은 장소를 저장하고, 나중에 실제 여행으로 전환한다.
- 체크리스트: 국내/해외 템플릿을 기반으로 여행 준비물을 자동 생성한다.
- 타임라인: 여행 일자별 방문 장소, 좌표, 메모, 사진을 관리한다.
- 사진 저장: 로컬 파일 저장소를 추상화해 업로드 파일을 관리한다.
- 지도/통계: 완료/예정/버킷 상태를 세계/국내 지도와 대시보드 통계로 집계한다.

---

# Part 1. 프로젝트 시작하기

## 001. Spring Boot는 이 프로젝트에서 무엇을 해 주는가

Spring Boot는 “웹 서버 + JSON API + DB 접근 + 보안 + 설정”을 빠르게 조립하게 해 주는 프레임워크다. Travel Archive에서는 다음 역할을 한다.

```java
@SpringBootApplication
public class TravelArchiveApplication {
    public static void main(String[] args) {
        SpringApplication.run(TravelArchiveApplication.class, args);
    }
}
```

- `@SpringBootApplication`: `com.travelarchive` 아래의 `@Controller`, `@Service`, `@Repository`, `@Component`를 스캔한다.
- `SpringApplication.run(...)`: 내장 톰캣을 띄우고 HTTP 요청을 받을 준비를 한다.
- 이 파일이 작지만 모든 기능의 출발점이다.

## 002. Java 25를 쓰는 이유

`build.gradle.kts`에는 다음 설정이 있다.

```kotlin
java {
    sourceCompatibility = JavaVersion.VERSION_17
}
```

이 프로젝트는 Java 25에서 실행되며, Java 17의 `record`, 텍스트 블록(`"""`), 현대적인 switch 표현식 등을 사용한다. 특히 DTO가 대부분 `record`라서 보일러플레이트가 줄어든다. Spring Boot 4.0.6은 Java 17을 최소 버전으로 요구하며, Java 25에서 Virtual Threads 등 최신 기능을 활용할 수 있다.

## 003. Gradle과 `build.gradle.kts` 읽기

핵심 의존성은 다음과 같다.

```kotlin
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    runtimeOnly("org.postgresql:postgresql")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
}
```

> **버전 업데이트 노트**: 이 프로젝트는 2026년 5월에 Spring Boot 3.2.12 → 4.0.6, Java 17 → 25, Maven → Gradle로 마이그레이션되었다.

## 004. Jackson 3 마이그레이션

Spring Boot 4.0.6은 Jackson 3을 기본으로 사용한다. 기존 Jackson 2의 `com.fasterxml.jackson` 패키지에서 `tools.jackson`으로 변경되었다.

```java
// Jackson 2 (Spring Boot 3.x)
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

// Jackson 3 (Spring Boot 4.x)
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
```

주의: Jackson 3은 완전히 다른 패키지 구조를 가지므로, 모든 import 문을 확인해야 한다.

## 005. Spring Boot 4 테스트 어노테이션 변경

Spring Boot 4.0.6에서 테스트 어노테이션 패키지가 변경되었다.

| 이전 (Boot 3.x) | 새로운 (Boot 4.x) |
|----------------|------------------|
| `org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc` | `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc` |
| `org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase` | `org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase` |
| `org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest` | `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest` |

또한 테스트용 별도 starter가 추가되었다.

```kotlin
testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
```

> **참고**: 위 내용들은 2026년 5월 Spring Boot 4.0.6 마이그레이션 시 추가되었다.

## 006. Maven과 `pom.xml` 읽기 (레거시)

> **주의**: 이 프로젝트는 현재 Gradle을 사용한다. 아래 내용은 Maven 시절의 참고용이다.

핵심 의존성은 다음과 같다.

```xml
<dependency>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<dependency>
    <!-- Flyway 제거: JPA ddl-auto로 스키마 관리 -->
</dependency>
```

- `web`: REST API, JSON 변환, 내장 서버.
- `security`: 인증/인가 필터 체인.
- `data-jpa`: Entity와 Repository.
- `validation`: `@Valid`, `@Email`, `@NotBlank`.
- `postgresql`: 운영/개발/테스트 통일 DB 드라이버.

## 004. 기본 환경 설정: PostgreSQL

`application.yml`:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/travel_archive}
    username: ${DB_USERNAME:travel_archive}
    password: ${DB_PASSWORD:travel_archive}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
```

라인별 핵심:

- `${DB_URL:...}`: 환경변수가 있으면 사용하고 없으면 기본값을 쓴다.
- `ddl-auto: validate`: Hibernate가 테이블을 만들지 않고, Entity와 DB 스키마가 맞는지만 검증한다.
- `open-in-view: false`: Controller 렌더링 시점까지 영속성 컨텍스트를 열어 두지 않는다. 서비스 안에서 필요한 데이터를 명시적으로 가져오라는 뜻이다.
- `ddl-auto: validate`: 운영 환경에서는 JPA가 엔티티와 DB 스키마 일치 여부만 검증한다.

## 005. 개발 환경: H2 dev profile

`application-dev.yml`:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/travel_archive}
    username: ${DB_USERNAME:travel_archive}
    password: ${DB_PASSWORD:travel_archive}
  jpa:
    hibernate:
      ddl-auto: create
```

- `ddl-auto: create`: JPA가 앱 실행 시 엔티티 기반으로 스키마를 자동 생성/재생성한다.
- 장점: 수동 SQL 없이 JPA가 스키마를 자동으로 갱신한다.
- 주의: 개발 중에는 편리하지만, 운영 환경에서는 `validate`를 사용한다.

## 006. 실행 방법

```bash
# PostgreSQL 기본 profile
./mvnw spring-boot:run

# H2 dev profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 테스트
./mvnw test
```

## 007. PRD와 실행 환경의 연결

PRD는 “개인 여행 아카이브”를 요구한다. 이 요구를 안정적으로 운영하려면 데이터가 서버 재시작 뒤에도 남아야 하므로 기본은 PostgreSQL이다. 반면 개발자는 빠른 피드백이 필요하므로 H2 dev profile이 있다.

---

# Part 2. 아키텍처와 공통 패턴

## 008. Feature-based 패키지 구조

패키지는 기술 계층별(`controller`, `service`, `repository`)이 아니라 기능별이다.

```text
com.travelarchive
├── auth
├── bucket
├── checklist
├── config
├── map
├── stats
├── storage
├── trip
└── user
```

장점:

- 버킷 기능을 고칠 때 `bucket` 패키지 안에서 대부분 해결된다.
- 도메인별 응집도가 높다.
- 주니어가 “이 기능은 어디 있지?”를 찾기 쉽다.

## 009. Layered Architecture

대표 흐름:

```text
HTTP 요청
  → Controller: URL/HTTP 메서드/인증 사용자 추출
  → Service: 비즈니스 규칙, 트랜잭션, 소유권 검증
  → Repository/EntityManager: DB 조회/저장
  → Entity: DB 테이블과 매핑되는 객체
  → DTO Response: 프론트에 줄 JSON 모양
```

예: 여행 생성

```text
POST /api/trips
  → TripController.create
  → TripService.create
  → TripRepository.save(new Trip(...))
  → TripDayRepository.save(new TripDay(...)) 반복
  → TripResponse.from(...)
```

## 010. Controller의 책임

Controller는 얇다.

```java
@PostMapping
public ResponseEntity<ApiResponse<TripResponse>> create(Authentication authentication,
                                                       @RequestBody TripRequest request) {
    return ResponseEntity.status(201)
            .body(new ApiResponse<>(tripService.create(authentication.getName(), request), "Success"));
}
```

- `Authentication`: Spring Security가 넣어 준 현재 사용자.
- `authentication.getName()`: 이 프로젝트에서는 이메일이다.
- 비즈니스 로직은 `TripService`에 위임한다.

## 011. Service의 책임

Service는 다음을 담당한다.

- 현재 사용자 조회.
- 데이터 소유권 확인.
- 입력값 검증.
- 상태 전환 규칙 검증.
- 여러 Repository 호출을 하나의 트랜잭션으로 묶기.
- Entity를 DTO로 변환하기 위한 보조 데이터 조회.

`@Transactional`이 Service에 주로 붙는 이유다.

## 012. Repository의 책임

Repository는 DB 접근을 단순화한다.

```java
public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findAllByUserIdOrderByStartDateDescIdDesc(Long userId);
    Optional<Trip> findByIdAndUserId(Long id, Long userId);
}
```

Spring Data JPA는 메서드 이름을 분석해 SQL을 만든다.

## 013. Entity의 책임

Entity는 테이블과 직접 연결된다.

```java
@Entity
@Table(name = "trips")
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
}
```

Entity에는 DB 컬럼, 연관관계, 도메인 변경 메서드(`update`, `changeStatus`)가 있다.

## 014. DTO와 `record` 패턴

DTO 예시:

```java
public record TripResponse(
        Long id,
        String title,
        TravelScope travelScope,
        Long countryId,
        Long domesticRegionId,
        String cityName,
        LocalDate startDate,
        LocalDate endDate,
        TripStatus status,
        List<TripDayResponse> tripDays,
        Long coverPhotoId
) { }
```

`record`는 생성자, getter, `equals/hashCode/toString`을 자동 제공한다. 응답 DTO처럼 불변 데이터 전달에 적합하다.

## 015. `from(...)` 정적 팩토리 패턴

```java
public static UserResponse from(User user) {
    return new UserResponse(user.getId(), user.getEmail(), user.getNickname(), user.getRole());
}
```

왜 좋은가?

- Entity → DTO 변환 위치가 DTO 안에 모인다.
- Controller/Service가 JSON 필드 구성을 몰라도 된다.
- 응답 모양이 바뀔 때 DTO 파일을 중심으로 수정한다.

## 016. `ApiResponse<T>` 래퍼

```java
public record ApiResponse<T>(T data, String message) {
}
```

모든 JSON 응답을 다음처럼 통일한다.

```json
{
  "data": { "id": 1 },
  "message": "Success"
}
```

트레이드오프:

- 장점: 프론트엔드가 항상 같은 구조로 응답을 처리한다.
- 단점: 단순 응답도 한 겹 감싸져 JSON이 길어진다.

## 017. 예외 처리 전략

대부분 서비스는 다음처럼 예외를 던진다.

```java
throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
```

Spring은 이를 HTTP 400으로 변환한다.

인증 예외는 별도 처리한다.

```java
@RestControllerAdvice
class AuthExceptionHandler {
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Void> authenticationException() {
        return ResponseEntity.status(401).build();
    }
}
```

## 018. `@Transactional` 기본 감각

```java
@Transactional
public TripResponse create(...) { ... }

@Transactional(readOnly = true)
public List<TripResponse> list(...) { ... }
```

- 쓰기 작업: 기본 `@Transactional`.
- 읽기 작업: `readOnly = true`로 최적화 의도를 표현.
- 하나의 서비스 메서드 안에서 여러 insert/update가 모두 성공하거나 모두 롤백된다.

## 019. 소유권 검사 패턴

개인 여행 앱이므로 모든 핵심 데이터는 사용자별로 격리되어야 한다.

```java
private Trip findOwnedTrip(Long id, Long userId) {
    return tripRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Trip not found"));
}
```

ID만으로 찾지 않고 `id + userId`로 찾는다. 다른 사용자의 `tripId`를 추측해도 접근할 수 없다.

## 020. `EntityManager.getReference(...)` 패턴

```java
country = entityManager.getReference(Country.class, countryId);
```

전체 Country 데이터를 즉시 조회하지 않고, FK 참조용 프록시를 얻는다. 저장 시 FK로 사용하기 충분하다.

주의: 존재하지 않는 ID면 나중에 DB 제약조건 또는 프록시 초기화 시점에 예외가 난다.

---

# Part 3. 공통 Enum과 상태 모델

## 021. `TravelScope`

```java
public enum TravelScope {
    DOMESTIC,
    INTERNATIONAL
}
```

국내 여행은 `domestic_region_id`, 해외 여행은 `country_id`를 사용한다. DB에도 체크 제약이 있다.

## 022. `TripStatus`

```java
public enum TripStatus {
    PLANNED,
    COMPLETED,
    CANCELLED
}
```

`TripService.validateTransition`에서 전환 가능 경로를 제한한다.

## 023. `BucketStatus`

```java
public enum BucketStatus {
    WANT_TO_GO, PLANNING, BOOKED, VISITED, ON_HOLD
}
```

버킷리스트 PRD의 “가고 싶음 → 계획 중/예약됨 → 방문/보류” 흐름을 표현한다.

## 024. `TimelineCategory`

```java
public enum TimelineCategory {
    PLACE, FOOD, ACTIVITY, MOVE, MEMO
}
```

타임라인 마커/필터링/아이콘 분류에 사용된다.

## 025. `ChecklistItemStatus`

```java
public enum ChecklistItemStatus {
    TODO, DONE
}
```

체크리스트 진행률 계산의 기준이다.

## 026. `PhotoOwnerType`

```java
public enum PhotoOwnerType {
    TRIP_COVER, TIMELINE_ITEM
}
```

하나의 `trip_photos` 테이블이 여행 커버 사진과 타임라인 사진을 같이 저장한다.

---

# Part 4. 도메인 모델 심층 분석

## 027. `User.java` 목적

`User`는 인증과 모든 개인 데이터 소유권의 기준 Entity다.

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 80)
    private String nickname;
}
```

라인별:

- `@Entity`: JPA 관리 대상.
- `@Table(name = "users")`: DB 테이블명 지정.
- `@GeneratedValue.IDENTITY`: DB identity 컬럼 사용.
- `email unique`: 같은 이메일 가입 방지.
- `passwordHash`: 원문 비밀번호 저장 금지.

## 028. `User` 설계 결정

- Setter가 없다. 생성자와 getter만 있다.
- 비밀번호는 `BCryptPasswordEncoder`로 해시되어 저장된다.
- `role`은 문자열이다. 작은 프로젝트에서는 enum보다 단순하다.

바꾸면?

- `role`을 enum으로 바꾸면 타입 안정성은 좋아지지만 마이그레이션과 SecurityConfig 변환 코드가 필요하다.

## 029. `UserRepository.java`

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

- 로그인: `findByEmail`.
- 회원가입 중복 검사: `existsByEmail`.
- Spring Data가 메서드 이름으로 쿼리를 만든다.

## 030. `Trip.java` 목적

`Trip`은 핵심 도메인이다. 하나의 실제/예정 여행을 의미한다.

```java
@Entity
@Table(name = "trips")
public class Trip {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bucket_place_id")
    private BucketPlace bucketPlace;

    @Enumerated(EnumType.STRING)
    @Column(name = "travel_scope", nullable = false, length = 20)
    private TravelScope travelScope;
}
```

핵심 관계:

- `Trip → User`: 여행의 소유자.
- `Trip → BucketPlace`: 버킷에서 전환된 여행이면 원본 버킷을 참조.
- `Trip → Country/DomesticRegion`: 해외/국내 목적지 참조.

## 031. `Trip` 날짜와 상태

```java
@Column(name = "start_date", nullable = false)
private LocalDate startDate;

@Column(name = "end_date", nullable = false)
private LocalDate endDate;

@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private TripStatus status = TripStatus.PLANNED;
```

- `LocalDate`: 시간대 영향을 받지 않는 여행 날짜.
- DB 제약 `end_date >= start_date`와 서비스 검증이 이중으로 보호한다.
- 기본 상태는 `PLANNED`.

## 032. `Trip.update(...)`와 `changeStatus(...)`

```java
public void update(...) {
    this.title = title;
    this.travelScope = travelScope;
    this.country = country;
    this.domesticRegion = domesticRegion;
    this.cityName = cityName;
    this.startDate = startDate;
    this.endDate = endDate;
}

public void changeStatus(TripStatus status) {
    this.status = status;
}
```

Entity 내부 변경 메서드를 두면 Service가 필드를 직접 만지지 않아도 된다.

## 033. `TripDay.java` 목적

여행 기간의 각 날짜를 나타낸다.

```java
@Entity
@Table(name = "trip_days")
public class TripDay {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "day_no", nullable = false)
    private Integer dayNo;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;
}
```

PRD 연결: “일자별 타임라인”을 만들기 위해 먼저 여행 날짜 단위가 필요하다.

## 034. `TripDay` 자동 생성 규칙

`TripService.generateTripDays`:

```java
long days = ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate()) + 1;
for (int i = 0; i < days; i++) {
    int dayNo = i + 1;
    tripDayRepository.save(new TripDay(trip, dayNo, trip.getStartDate().plusDays(i), "Day " + dayNo, null));
}
```

예: 5월 1일~5월 3일이면 3개가 생성된다.

## 035. `TripTimelineItem.java` 목적

여행의 특정 일자에 있는 방문/식사/활동/이동/메모 항목이다.

```java
@Entity
@Table(name = "trip_timeline_items")
public class TripTimelineItem {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_day_id", nullable = false)
    private TripDay tripDay;

    @Column(name = "item_time")
    private LocalTime itemTime;

    private BigDecimal latitude;
    private BigDecimal longitude;
}
```

- `TripDay`에 붙기 때문에 타임라인은 날짜별로 그룹화된다.
- 좌표는 지도 마커에 사용된다.
- `BigDecimal`은 좌표의 소수 정밀도를 안정적으로 표현한다.

## 036. `TripTimelineItem` 검증

`TimelineService.validateFields`:

```java
if (latitude != null && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
        || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude must be between -90 and 90");
}
```

DB에도 같은 체크 제약이 있다. 서비스 검증은 사용자에게 빠른 400 응답을 주고, DB 제약은 최후의 방어선이다.

## 037. `TripPhoto.java` 목적

사진 메타데이터를 저장한다. 실제 바이너리는 파일 시스템에 있다.

```java
@Entity
@Table(name = "trip_photos")
public class TripPhoto {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    private TripTimelineItem timelineItem;

    @Enumerated(EnumType.STRING)
    private PhotoOwnerType ownerType;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;
}
```

PRD 연결:

- 여행 대표 이미지: `ownerType = TRIP_COVER`, `timelineItem = null`.
- 타임라인 사진: `ownerType = TIMELINE_ITEM`, `timelineItem != null`.

## 038. `BucketPlace.java` 목적

가고 싶은 장소를 실제 여행 전 단계로 관리한다.

```java
@Entity
@Table(name = "bucket_places")
public class BucketPlace {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private TravelScope travelScope;

    private BigDecimal expectedBudget;
    private String desiredSeason;
    private Integer priority = 3;
    private BucketStatus status = BucketStatus.WANT_TO_GO;
}
```

PRD의 “버킷리스트 관리”가 이 Entity로 구현된다.

## 039. `BucketPlace`와 `Trip`의 연결

`Trip`에는 `bucketPlace`가 있다. 버킷 전환 시:

```java
Trip trip = tripRepository.save(new Trip(user, bucketPlace, bucketPlace.getTitle(), ...));
```

이렇게 저장하면 나중에 “이 여행은 어떤 버킷에서 시작됐는지” 추적 가능하다.

## 040. `TravelChecklist.java` 목적

여행 하나에 대한 준비물 목록 컨테이너다.

```java
@Entity
@Table(name = "travel_checklists")
public class TravelChecklist {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Trip trip;

    private String title;
    private Integer progressRate = 0;

    public void updateProgress(long doneCount, long totalCount) {
        this.progressRate = totalCount == 0 ? 0 : (int) Math.round(doneCount * 100.0 / totalCount);
    }
}
```

진행률은 매번 조회 시 계산하지 않고 컬럼에 저장한다.

## 041. 진행률 저장의 트레이드오프

장점:

- 목록 화면에서 빠르게 표시 가능.
- 복잡한 count 쿼리를 매번 하지 않아도 된다.

단점:

- 아이템 상태 변경/삭제/추가 때마다 재계산해야 한다.
- 재계산 누락 시 데이터 불일치가 생긴다.

## 042. `TravelChecklistItem.java` 목적

체크리스트의 개별 준비물이다.

```java
public void toggleStatus() {
    this.status = this.status == ChecklistItemStatus.DONE
            ? ChecklistItemStatus.TODO
            : ChecklistItemStatus.DONE;
}
```

프론트는 단순히 PATCH 요청을 보내고, 서버는 TODO/DONE을 토글한다.

## 043. `TravelChecklistTemplate.java` 목적

국내/해외 기본 준비물 템플릿이다.

```java
@Entity
@Table(name = "travel_checklist_templates")
public class TravelChecklistTemplate {
    @Enumerated(EnumType.STRING)
    private TravelScope travelScope;
    private String title;
    private Integer displayOrder = 0;
    private Boolean active = true;
}
```

PRD의 “템플릿 기반 체크리스트 자동 생성” 요구를 구현한다.

## 044. `TravelChecklistTemplateItem.java` 목적

템플릿에 속한 준비물 항목이다. 실제 여행 체크리스트 생성 시 `TravelChecklistItem`으로 복제된다.

## 045. `Country.java`와 `DomesticRegion.java`

이 둘은 참조 데이터 Entity다.

```java
@Entity
@Table(name = "countries")
public class Country {
    private String codeAlpha2;
    private String mapKey;
    private String nameKo;
}
```

```java
@Entity
@Table(name = "domestic_regions")
public class DomesticRegion {
    private String code;
    private String mapKey;
    private String nameKo;
}
```

`mapKey`는 프론트 지도 라이브러리의 지역 식별자와 맞추기 위한 값이다.

## 046. 왜 `@ManyToOne(fetch = LAZY)`를 많이 쓰는가

`Trip`을 조회할 때 항상 `User`, `Country`, `DomesticRegion`, `BucketPlace` 전체가 필요한 것은 아니다. `LAZY`는 실제 접근 전까지 조회를 미룬다.

주의:

- `open-in-view=false`라서 트랜잭션 밖에서 LAZY 필드를 건드리면 문제가 될 수 있다.
- 따라서 Service 안에서 DTO 변환까지 끝내는 구조가 중요하다.

## 047. 왜 `@OneToMany` 컬렉션이 거의 없는가

Trip에 `List<TripDay>`를 두지 않고 `TripDayRepository.findAllByTripId...`로 조회한다.

장점:

- 무심코 컬렉션을 접근해 N+1 쿼리를 만드는 일을 줄인다.
- 조회 범위와 정렬을 Repository 메서드에서 명시한다.

단점:

- 객체 그래프 탐색은 덜 자연스럽다.

---

# Part 5. 데이터 접근 계층과 JPA

## 048. `JpaRepository` 기본 기능

`JpaRepository<Entity, ID>`는 다음을 제공한다.

- `save(entity)`
- `findById(id)`
- `findAll()`
- `delete(entity)`
- `flush()`

프로젝트의 대부분 Repository는 이 기능과 메서드 이름 쿼리만으로 충분하다.

## 049. `TripTimelineItemRepository`의 JPQL fetch join

```java
@Query("""
        select item from TripTimelineItem item
        join fetch item.tripDay day
        join fetch day.trip trip
        where trip.id = :tripId
        order by day.dayNo asc,
                 case when item.itemTime is null then 1 else 0 end asc,
                 item.itemTime asc,
                 item.id asc
        """)
List<TripTimelineItem> findTimelineByTripId(@Param("tripId") Long tripId);
```

해설:

- `join fetch`: item을 가져올 때 day/trip도 같이 가져온다.
- 정렬: 날짜 순, 시간이 있는 항목 먼저, 시간 순, id 순.
- PRD의 “일자별 타임라인” 화면을 안정적으로 정렬한다.

## 050. `TripPhotoRepository`의 카운트 메서드

```java
long countByTimelineItemIdAndOwnerType(Long timelineItemId, PhotoOwnerType ownerType);
long countByTripIdAndOwnerType(Long tripId, PhotoOwnerType ownerType);
```

- 타임라인 사진 최대 3장.
- 커버 사진 최대 1장.
- 저장 전에 현재 개수를 확인한다.

## 051. 스키마 설계 (JPA 엔티티 기반)

`V1__init_schema.sql`은 모든 주요 테이블을 만든다.

```sql
CREATE TABLE trips (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket_place_id BIGINT REFERENCES bucket_places(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    travel_scope VARCHAR(20) NOT NULL CHECK (travel_scope IN ('DOMESTIC', 'INTERNATIONAL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_trips_date_range CHECK (end_date >= start_date)
);
```

## 052. DB 제약과 서비스 검증을 둘 다 두는 이유

예: 여행 날짜

- 서비스: `endDate.isBefore(startDate)`면 400을 반환한다.
- DB: `CHECK (end_date >= start_date)`로 잘못된 데이터 저장을 막는다.

서비스 검증은 사용자 경험, DB 제약은 데이터 무결성이다.

## 053. 국내/해외 참조 제약

```sql
CONSTRAINT ck_trips_scope_reference CHECK (
    (travel_scope = 'DOMESTIC' AND domestic_region_id IS NOT NULL AND country_id IS NULL)
    OR (travel_scope = 'INTERNATIONAL' AND country_id IS NOT NULL AND domestic_region_id IS NULL)
)
```

이 제약 덕분에 “국내 여행인데 country_id가 들어감” 같은 모순을 DB가 차단한다.

## 054. 지도 참조 데이터 (seed)

`countries`, `domestic_regions`에 지도 표시용 데이터를 seed한다.

- `countries.map_key`: 세계 지도 식별자.
- `domestic_regions.map_key`: 대한민국 지도 식별자.
- `display_order`: UI 표시 순서.

## 055. 체크리스트 템플릿 (seed)

```sql
INSERT INTO travel_checklist_templates (travel_scope, title, display_order, active) VALUES
('DOMESTIC', '국내 여행 기본 준비물', 1, TRUE),
('INTERNATIONAL', '해외 여행 기본 준비물', 2, TRUE);
```

국내/해외 각각 12개 준비물 항목이 들어간다.

## 056. 데모 데이터 (seed)

데모 계정과 샘플 여행/버킷/타임라인/사진 메타데이터를 넣는다. README의 `demo@example.com` 계정이 이 마이그레이션에서 나온다.

## 057. 버킷 동행자 컬럼 추가

```sql
ALTER TABLE bucket_places ADD COLUMN companion VARCHAR(100);
```

기능이 발전하면서 버킷에도 “누구와 갈지”가 필요해져 컬럼을 추가했다.

## 058. 인덱스 설계

V1 마지막에는 다음 인덱스들이 있다.

```sql
CREATE INDEX idx_trips_user_status_scope ON trips(user_id, status, travel_scope);
CREATE INDEX idx_bucket_places_user_status_scope ON bucket_places(user_id, status, travel_scope);
CREATE INDEX idx_timeline_items_coordinates ON trip_timeline_items(latitude, longitude);
```

지도/통계/목록 조회는 대부분 `user_id`, `status`, `scope`로 필터링하기 때문에 인덱스가 맞춰져 있다.

---

# Part 6. 인증과 보안

## 059. `SecurityConfig.java` 전체 역할

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
```

핵심:

- 서버 세션을 쓰지 않는다.
- 폼 로그인/HTTP Basic을 끈다.
- JWT 쿠키 필터로 인증한다.
- auth 일부 endpoint만 공개한다.

## 060. 왜 stateless인가

JWT를 쓰면 서버가 access token 상태를 메모리에 들고 있을 필요가 없다. 확장성이 좋다. 대신 refresh token은 DB에 해시로 저장해 로그아웃/재발급 제어를 한다.

## 061. `PasswordEncoder`

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

BCrypt는 salt와 반복 비용을 포함한 비밀번호 해시 알고리즘이다. 원문 비밀번호는 절대 저장하지 않는다.

## 062. `UserDetailsService`

```java
return email -> {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPasswordHash(),
            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
    );
};
```

Spring Security는 자체 `UserDetails`를 사용한다. 프로젝트의 `User` Entity를 보안 객체로 변환하는 어댑터다.

## 063. `JwtTokenProvider.java` 목적

JWT 생성, 검증, subject 추출, refresh token 해시를 담당한다.

```java
public static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
public static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);
```

- Access token: 짧게.
- Refresh token: 길게.

## 064. JWT secret 검증

```java
@PostConstruct
void validateSecret() {
    if (secret.length() < 32) {
        throw new IllegalStateException("jwt.secret must be at least 32 characters");
    }
    if (DEFAULT_SECRET.equals(secret) && !isLocalProfile()) {
        throw new IllegalStateException("JWT_SECRET must be explicitly configured for non-local environments");
    }
}
```

운영 환경에서 기본 secret을 쓰면 누구나 토큰을 위조할 수 있다. 그래서 앱 시작 자체를 실패시킨다.

## 065. Access token 생성

```java
public String createAccessToken(User user) {
    Instant now = Instant.now();
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("sub", user.getEmail());
    claims.put("uid", user.getId());
    claims.put("role", user.getRole());
    claims.put("iat", now.getEpochSecond());
    claims.put("exp", now.plus(ACCESS_TOKEN_TTL).getEpochSecond());
    return sign(claims);
}
```

- `sub`: 인증 주체. 이 프로젝트에서는 이메일.
- `uid`: 사용자 ID.
- `role`: 권한.
- `iat`, `exp`: 발급/만료 시각.

## 066. Refresh token 생성과 타입 구분

```java
claims.put("typ", "refresh");
```

`validateRefreshToken`은 `typ`가 refresh인지 확인한다. Access token을 refresh endpoint에 넣는 것을 막는다.

## 067. 직접 구현한 JWT의 트레이드오프

이 프로젝트는 jjwt 같은 라이브러리 대신 HMAC SHA-256 서명을 직접 만든다.

장점:

- JWT 구조를 학습하기 쉽다.
- 의존성이 줄어든다.

주의:

- 운영 프로젝트에서는 검증된 JWT 라이브러리 사용이 일반적으로 더 안전하다.
- 알고리즘 혼동, claim 검증 누락 같은 위험을 줄일 수 있기 때문이다.

## 068. Refresh token은 왜 해시로 저장하는가

```java
public String hash(String token) {
    MessageDigest digest = MessageDigest.getInstance("SHA-256");
    byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
    return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
}
```

DB가 유출돼도 원본 refresh token을 바로 사용할 수 없게 한다. 비밀번호 해시와 같은 방어 개념이다.

## 069. `JwtAuthenticationFilter.java` 요청 인증 흐름

```java
String accessToken = cookieValue(request, AuthController.ACCESS_TOKEN_COOKIE);
if (accessToken != null && SecurityContextHolder.getContext().getAuthentication() == null) {
    try {
        String email = jwtTokenProvider.subject(accessToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
    }
}
filterChain.doFilter(request, response);
```

필터는 쿠키에서 access token을 찾고, 유효하면 SecurityContext에 인증 객체를 넣는다.

## 070. 왜 예외를 무시하고 다음 필터로 넘기는가

토큰이 잘못되면 인증을 만들지 않는다. 이후 SecurityFilterChain의 `.anyRequest().authenticated()`가 401을 처리한다. 필터가 직접 응답을 만들지 않아 책임이 분리된다.

## 071. `AuthService.signup`

```java
@Transactional
public IssuedTokens signup(SignupRequest request) {
    if (userRepository.existsByEmail(request.email())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    }
    User user = userRepository.save(new User(
            request.email(), passwordEncoder.encode(request.password()), request.nickname(), "USER"));
    return issueTokens(user);
}
```

회원가입 성공 즉시 로그인 상태가 되도록 토큰을 발급한다.

## 072. `AuthService.login`

```java
User user = userRepository.findByEmail(request.email())
        .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
    throw new BadCredentialsException("Invalid email or password");
}
return issueTokens(user);
```

이메일 없음과 비밀번호 틀림을 같은 메시지로 처리한다. 계정 존재 여부 노출을 줄인다.

## 073. `AuthService.issueTokens`

```java
private IssuedTokens issueTokens(User user) {
    String accessToken = jwtTokenProvider.createAccessToken(user);
    String refreshToken = jwtTokenProvider.createRefreshToken(user);
    refreshTokenRepository.deleteByUser(user);
    refreshTokenRepository.flush();
    refreshTokenRepository.save(new RefreshToken(user, jwtTokenProvider.hash(refreshToken),
            LocalDateTime.now().plus(JwtTokenProvider.REFRESH_TOKEN_TTL)));
    return new IssuedTokens(accessToken, refreshToken);
}
```

사용자당 refresh token을 하나만 유지한다. 새 로그인 시 이전 refresh token은 삭제된다.

## 074. `RefreshToken.java`

```java
public boolean isActive(LocalDateTime now) {
    return revokedAt == null && expiresAt.isAfter(now);
}

public void revoke(LocalDateTime revokedAt) {
    this.revokedAt = revokedAt;
}
```

로그아웃은 row를 삭제하지 않고 `revokedAt`을 기록한다. 감사 추적에 유리하다.

## 075. `AuthController` 쿠키 전략

```java
private ResponseCookie accessCookie(String value) {
    return ResponseCookie.from(ACCESS_TOKEN_COOKIE, value)
            .httpOnly(true)
            .secure(secureCookies())
            .sameSite("Strict")
            .path("/")
            .maxAge(JwtTokenProvider.ACCESS_TOKEN_TTL)
            .build();
}
```

- `httpOnly`: JavaScript로 토큰을 읽지 못하게 하여 XSS 피해를 줄인다.
- `sameSite("Strict")`: CSRF 위험을 줄인다.
- access cookie path `/`: 모든 API 요청에 포함.

## 076. Refresh cookie path

```java
.path("/api/auth")
```

Refresh token은 인증 endpoint에만 전송된다. 불필요하게 모든 API에 refresh token을 보내지 않는다.

## 077. `SignupRequest`, `LoginRequest`

```java
public record SignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(min = 2, max = 80) String nickname
) { }
```

`@Valid`가 Controller에 있기 때문에 잘못된 요청은 Service까지 가지 않고 400이 된다.

---

# Part 7. 여행 기능

## 078. `TripController` endpoint 목록

```text
GET    /api/trips
POST   /api/trips
GET    /api/trips/{id}
PATCH  /api/trips/{id}
DELETE /api/trips/{id}
PATCH  /api/trips/{id}/status
```

모든 endpoint는 인증 필요다.

## 079. `TripRequest` JSON alias

```java
public record TripRequest(
        String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") Long countryId,
        @JsonAlias("domestic_region_id") Long domesticRegionId,
        @JsonAlias("city_name") String cityName,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate
) { }
```

프론트가 snake_case를 보내도 Java 필드는 camelCase로 받는다.

## 080. `TripService.list`

```java
List<Trip> trips = tripRepository.findAllByUserIdOrderByStartDateDescIdDesc(user.getId());
List<Long> tripIds = trips.stream().map(Trip::getId).toList();
Map<Long, List<TripDay>> daysByTripId = tripIds.isEmpty() ? Map.of() : tripDayRepository
        .findAllByTripIdInOrderByTripIdAscDayNoAsc(tripIds)
        .stream()
        .collect(Collectors.groupingBy(day -> day.getTrip().getId()));
```

여행 목록에서 각 여행의 일자도 보여줘야 한다. 여행마다 day를 따로 조회하면 N+1이 되므로 tripId 목록으로 한 번에 조회한다.

## 081. 커버 사진 ID 같이 내려주기

```java
Map<Long, Long> coverPhotoIdsByTripId = tripIds.isEmpty() ? Map.of() : tripPhotoRepository
        .findAllByTripIdInAndOwnerTypeOrderByTripIdAscSortOrderAscIdAsc(tripIds, PhotoOwnerType.TRIP_COVER)
        .stream()
        .collect(Collectors.toMap(photo -> photo.getTrip().getId(), TripPhoto::getId, (first, ignored) -> first));
```

프론트 목록 카드에서 커버 이미지를 표시하기 위해 첫 번째 커버 사진 ID를 함께 제공한다.

## 082. `TripService.create`

```java
TripFields fields = validateCreate(request);
Trip trip = tripRepository.save(new Trip(user, fields.title(), fields.travelScope(), ...));
generateTripDays(trip);
return response(trip);
```

생성과 동시에 `TripDay`가 생성되는 것이 중요하다. 타임라인과 체크리스트는 여행 일자를 기준으로 동작한다.

## 083. 여행 생성 필수값

```java
if (isBlank(request.title()) || request.travelScope() == null || isBlank(request.cityName())
        || request.startDate() == null || request.endDate() == null) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "title, travelScope, cityName, startDate and endDate are required");
}
```

도시명은 지도/목록 표시에서 중요한 사용자 입력값이라 필수다.

## 084. 국내/해외 검증

```java
if (travelScope == TravelScope.INTERNATIONAL) {
    if (countryId == null || domesticRegionId != null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "International trips require countryId only");
    }
    country = entityManager.getReference(Country.class, countryId);
} else if (travelScope == TravelScope.DOMESTIC) {
    if (domesticRegionId == null || countryId != null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Domestic trips require domesticRegionId only");
    }
    domesticRegion = entityManager.getReference(DomesticRegion.class, domesticRegionId);
}
```

PRD의 세계 지도/국내 지도 분리를 데이터 모델에서 강제한다.

## 085. 날짜 변경 시 TripDay 재생성

```java
if (datesChanged) {
    tripDayRepository.deleteByTripId(trip.getId());
    tripDayRepository.flush();
    generateTripDays(trip);
}
```

여행 기간이 바뀌면 기존 일자 구조가 틀어질 수 있다. 그래서 삭제 후 다시 만든다.

주의: 이미 타임라인이 있는 여행의 날짜를 바꾸면 cascade로 일자와 관련 항목 삭제 문제가 생길 수 있다. 현재 구현은 단순성을 택했다.

## 086. 상태 전환 규칙

```java
boolean allowed = (current == TripStatus.PLANNED && (nextStatus == TripStatus.COMPLETED || nextStatus == TripStatus.CANCELLED))
        || (current == TripStatus.CANCELLED && nextStatus == TripStatus.PLANNED);
```

허용:

- `PLANNED → COMPLETED`
- `PLANNED → CANCELLED`
- `CANCELLED → PLANNED`

불허:

- `COMPLETED → CANCELLED`
- `COMPLETED → PLANNED`

## 087. 완료 조건

```java
if (nextStatus == TripStatus.COMPLETED && tripDayRepository.countByTripId(trip.getId()) < 1) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "COMPLETED requires at least one trip day");
}
```

완료 여행은 최소 1일이 있어야 한다. 통계의 여행 일수 계산이 이 전제에 의존한다.

## 088. `TripResponse`

```java
public static TripResponse from(Trip trip, List<TripDay> tripDays, Long coverPhotoId) {
    return new TripResponse(
            trip.getId(), trip.getTitle(), trip.getTravelScope(),
            trip.getCountry() == null ? null : trip.getCountry().getId(),
            trip.getDomesticRegion() == null ? null : trip.getDomesticRegion().getId(),
            trip.getCityName(), trip.getStartDate(), trip.getEndDate(),
            trip.getStatus(), trip.getTravelType(), trip.getCompanion(), trip.getSummary(),
            tripDays.stream().map(TripDayResponse::from).toList(),
            coverPhotoId
    );
}
```

Entity를 그대로 JSON으로 내보내지 않는다. 필요한 필드만 안정적인 API 계약으로 만든다.

---

# Part 8. 버킷리스트 기능

## 089. `BucketPlaceController` endpoint 목록

```text
GET    /api/buckets
POST   /api/buckets
GET    /api/buckets/{id}
PATCH  /api/buckets/{id}
DELETE /api/buckets/{id}
POST   /api/buckets/{id}/convert-to-trip
```

마지막 endpoint가 PRD의 “버킷리스트 → 여행 전환” 핵심이다.

## 090. `BucketPlaceRequest`

```java
public record BucketPlaceRequest(
        String title,
        @JsonAlias("travel_scope") TravelScope travelScope,
        @JsonAlias("country_id") Long countryId,
        @JsonAlias("domestic_region_id") Long domesticRegionId,
        @JsonAlias("expected_budget") BigDecimal expectedBudget,
        @JsonAlias("desired_season") String desiredSeason,
        String companion,
        Integer priority,
        BucketStatus status,
        @JsonAlias("start_date") LocalDate startDate,
        @JsonAlias("end_date") LocalDate endDate
) { }
```

전환 endpoint도 같은 Request를 재사용하므로 `startDate/endDate`가 포함되어 있다.

## 091. 버킷 생성 검증

```java
if (isBlank(request.title()) || request.travelScope() == null || isBlank(request.cityName())) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title, travelScope and cityName are required");
}
```

여행보다 날짜가 없다는 점이 다르다. 버킷은 아직 일정이 확정되지 않은 상태이기 때문이다.

## 092. 우선순위 검증

```java
if (priority == null || priority < 1 || priority > 5) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "priority must be between 1 and 5");
}
```

DB도 `CHECK (priority BETWEEN 1 AND 5)`로 보호한다.

## 093. 버킷 목록 정렬

```java
List<BucketPlace> findAllByUserIdOrderByPriorityAscIdDesc(Long userId);
```

우선순위가 높은 항목(숫자 작음)이 먼저 오고, 같은 우선순위면 최근 생성 ID가 먼저 온다.

## 094. 전환 불가 상태

```java
if (bucketPlace.getStatus() == BucketStatus.VISITED || bucketPlace.getStatus() == BucketStatus.ON_HOLD) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "VISITED and ON_HOLD buckets cannot be converted");
}
```

- 이미 방문한 버킷은 새 여행으로 전환할 필요가 없다.
- 보류한 버킷은 아직 계획으로 확정하지 않은 상태다.

## 095. 버킷 → 여행 전환 핵심 코드

```java
Trip trip = tripRepository.save(new Trip(user, bucketPlace,
        bucketPlace.getTitle(), bucketPlace.getTravelScope(),
        bucketPlace.getCountry(), bucketPlace.getDomesticRegion(), bucketPlace.getCityName(),
        request.startDate(), request.endDate(), null,
        bucketPlace.getCompanion(), bucketPlace.getReason()));
generateTripDays(trip);
cloneChecklistTemplates(trip, bucketPlace.getTravelScope());
bucketPlace.changeStatus(request.status() == BucketStatus.BOOKED ? BucketStatus.BOOKED : BucketStatus.PLANNING);
```

전환 시 동시에 일어나는 일:

1. 여행 생성.
2. 여행 일자 생성.
3. 체크리스트 템플릿 복제.
4. 버킷 상태를 `BOOKED` 또는 `PLANNING`으로 변경.

## 096. 전환 시 체크리스트 자동 생성

```java
List<TravelChecklistTemplate> templates = entityManager.createQuery("""
    select template from TravelChecklistTemplate template
    where template.travelScope = :travelScope and template.active = true
    order by template.displayOrder asc, template.id asc
    """, TravelChecklistTemplate.class)
    .setParameter("travelScope", travelScope)
    .getResultList();
```

Bucket 전환은 실제 여행 준비 시작을 뜻하므로 체크리스트도 자동으로 만들어진다.

## 097. `BucketPlaceResponse`

```java
public static BucketPlaceResponse from(BucketPlace bucketPlace) {
    return new BucketPlaceResponse(
            bucketPlace.getId(), bucketPlace.getTitle(), bucketPlace.getTravelScope(),
            bucketPlace.getCountry() == null ? null : bucketPlace.getCountry().getId(),
            bucketPlace.getDomesticRegion() == null ? null : bucketPlace.getDomesticRegion().getId(),
            bucketPlace.getCityName(), bucketPlace.getReason(), bucketPlace.getExpectedBudget(),
            bucketPlace.getDesiredSeason(), bucketPlace.getCompanion(), bucketPlace.getPriority(),
            bucketPlace.getStatus(), bucketPlace.getReferenceUrl(), bucketPlace.getMemo(),
            bucketPlace.getCreatedAt(), bucketPlace.getUpdatedAt()
    );
}
```

---

# Part 9. 체크리스트 기능

## 098. `ChecklistController` endpoint 목록

```text
GET    /api/trips/{tripId}/checklists
POST   /api/trips/{tripId}/checklists
PATCH  /api/checklist-items/{id}
POST   /api/checklists/{checklistId}/items
DELETE /api/checklist-items/{id}
```

GET도 “없으면 생성”하는 동작을 한다.

## 099. `getOrCreate` 패턴

```java
TravelChecklist checklist = checklistRepository.findByTripId(trip.getId())
        .orElseGet(() -> createFromTemplate(trip));
```

프론트는 체크리스트 존재 여부를 고민하지 않아도 된다. 화면에 들어오면 항상 체크리스트를 받을 수 있다.

## 100. `createFromTemplate`

```java
TravelChecklistTemplate template = activeTemplate(trip.getTravelScope());
TravelChecklist checklist = checklistRepository.save(new TravelChecklist(trip, template.getTitle()));
templateItems(template.getId()).forEach(templateItem -> itemRepository.save(new TravelChecklistItem(
        checklist,
        templateItem.getCategory(),
        templateItem.getContent(),
        templateItem.getSortOrder()
)));
recalculateProgress(checklist);
```

템플릿은 복사된다. 이후 사용자가 개별 여행 체크리스트를 수정해도 원본 템플릿은 영향을 받지 않는다.

## 101. 템플릿을 복사하는 이유

만약 체크리스트가 템플릿 항목을 직접 참조한다면:

- 사용자가 항목을 삭제/추가하기 어렵다.
- 템플릿 변경이 과거 여행에 영향을 줄 수 있다.

복사 방식은 과거 여행 기록의 안정성을 보장한다.

## 102. 진행률 재계산

```java
private void recalculateProgress(TravelChecklist checklist) {
    long totalCount = itemRepository.countByChecklistId(checklist.getId());
    long doneCount = itemRepository.countByChecklistIdAndStatus(checklist.getId(), ChecklistItemStatus.DONE);
    checklist.updateProgress(doneCount, totalCount);
}
```

아이템 토글, 삭제, 추가 후 호출된다.

## 103. 토글 API

```java
public ChecklistResponse toggleItem(String email, Long itemId) {
    User user = currentUser(email);
    TravelChecklistItem item = findOwnedItem(itemId, user.getId());
    item.toggleStatus();
    recalculateProgress(item.getChecklist());
    return response(item.getChecklist());
}
```

한 아이템만 바꾸지만 응답은 전체 체크리스트를 돌려준다. 프론트 상태 동기화가 단순해진다.

## 104. 커스텀 아이템 추가

```java
String safeCategory = (category == null || category.isBlank()) ? "ETC" : category;
long maxSortOrder = itemRepository.findAllByChecklistIdOrderBySortOrderAscIdAsc(checklistId)
        .stream()
        .mapToLong(TravelChecklistItem::getSortOrder)
        .max()
        .orElse(0);
TravelChecklistItem item = itemRepository.save(
        new TravelChecklistItem(checklist, safeCategory, content.trim(), (int) (maxSortOrder + 1)));
```

사용자 추가 항목은 맨 뒤에 붙는다.

## 105. 체크리스트 소유권 검사

```java
if (!checklist.getTrip().getUser().getId().equals(user.getId())) {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Checklist not found");
}
```

체크리스트는 직접 user_id를 갖지 않고 Trip을 통해 소유자를 확인한다.

---

# Part 10. 타임라인 기능

## 106. `TimelineController` endpoint 목록

```text
GET    /api/trips/{tripId}/timeline
POST   /api/trips/{tripId}/timeline-items
PATCH  /api/timeline-items/{id}
DELETE /api/timeline-items/{id}
POST   /api/timeline-items/{id}/photos
```

주의: JSON metadata photo endpoint는 현재 `Use multipart upload for photos`를 반환하고, 실제 업로드는 `PhotoController`가 담당한다.

## 107. 타임라인 목록 그룹화

```java
Map<Long, List<TimelineItemResponse>> itemsByDayId = items.stream()
        .map(item -> TimelineItemResponse.from(item, photosByItemId.getOrDefault(item.getId(), List.of())))
        .collect(Collectors.groupingBy(TimelineItemResponse::tripDayId,
                java.util.LinkedHashMap::new, Collectors.toList()));
return tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()).stream()
        .map(day -> TimelineItemResponse.DayGroup.from(day,
                itemsByDayId.getOrDefault(day.getId(), List.of())))
        .toList();
```

응답은 `DayGroup` 배열이다. 아이템이 없는 날짜도 빈 배열로 포함된다.

## 108. 왜 빈 날짜도 응답하는가

프론트가 “Day 1, Day 2, Day 3” 탭을 항상 그릴 수 있다. 타임라인 항목이 없어도 여행 일정 구조는 유지된다.

## 109. 타임라인 생성 필수값

```java
if (request == null || isBlank(request.title()) || request.visitedAt() == null || request.category() == null) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title, visitedAt and category are required");
}
```

`visitedAt`에서 날짜와 시간을 분리해 `TripDay`와 `itemTime`으로 저장한다.

## 110. 방문 날짜가 여행 기간 안인지 검사

```java
TripDay day = tripDayRepository.findAllByTripIdOrderByDayNo(trip.getId()).stream()
        .filter(candidate -> candidate.getTravelDate().equals(travelDate))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "visitedAt must be within trip dates"));
```

타임라인은 반드시 여행 일자 중 하나에 속해야 한다.

## 111. 사진 개수 제한

```java
private static final long MAX_PHOTOS_PER_ITEM = 3;
```

타임라인 항목 하나에 사진 3장까지만 허용한다. UI 복잡도와 저장소 사용량을 제한하는 정책이다.

## 112. `TimelineItemResponse`

```java
LocalTime time = item.getItemTime();
return new TimelineItemResponse(
        item.getId(),
        day.getId(),
        day.getDayNo(),
        day.getTravelDate(),
        time == null ? null : LocalDateTime.of(day.getTravelDate(), time),
        item.getTitle(),
        item.getPlaceName(),
        item.getAddress(),
        item.getLatitude(),
        item.getLongitude(),
        item.getCategory(),
        item.getMemo(),
        photos.stream().map(PhotoResponse::from).toList()
);
```

DB에는 날짜와 시간이 분리되어 있지만, API 응답은 `visitedAt`으로 합쳐 프론트가 쓰기 쉽게 만든다.

---

# Part 11. 사진과 파일 저장

## 113. `StorageService` 인터페이스

```java
public interface StorageService {
    StoredFile store(MultipartFile file, StorageContext context);
    Resource open(String storageKey);
    void delete(String storageKey);
}
```

저장소를 인터페이스로 분리한 이유:

- 현재는 로컬 파일.
- 나중에 S3/GCS로 바꿔도 Controller 코드를 크게 바꾸지 않는다.

## 114. `StorageContext`, `StoredFile`

```java
public record StorageContext(Long userId, Long tripId) { }
public record StoredFile(String storageKey, String originalFileName, String contentType, Long fileSize) { }
```

`StorageContext`는 파일 경로를 사용자/여행별로 분리하는 데 쓰인다.

## 115. `StorageProperties`

```java
@ConfigurationProperties(prefix = "storage.local")
public class StorageProperties {
    private Path root = Path.of("storage", "uploads");
    private long maxFileSizeBytes = 5L * 1024 * 1024;
    private Set<String> allowedContentTypes = Set.of("image/jpeg", "image/png", "image/webp");
}
```

설정값을 코드에 하드코딩하지 않고 properties로 바꿀 수 있게 한다.

## 116. `LocalFileStorageService.store`

```java
String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
String filename = UUID.randomUUID() + extension(originalFileName, contentType);
String storageKey = "%d/%d/%s".formatted(context.userId(), context.tripId(), filename);
Path destination = root.resolve(storageKey).normalize();
if (!destination.startsWith(root)) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid storage path");
}
Files.createDirectories(destination.getParent());
Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
```

핵심 보안 포인트:

- 원본 파일명을 그대로 저장 파일명으로 쓰지 않는다.
- UUID 파일명으로 충돌과 추측을 줄인다.
- normalize 후 root 밖으로 나가는 path traversal을 막는다.

## 117. MIME type과 magic bytes 검증

```java
boolean matches = switch (file.getContentType()) {
    case "image/jpeg" -> bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
    case "image/png" -> bytes.length >= 4 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50;
    case "image/webp" -> bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49;
    default -> false;
};
```

사용자가 `.jpg` 확장자로 악성 텍스트를 올리는 것을 줄인다.

## 118. `PhotoController` 커버 업로드

```java
if (photoRepository.countByTripIdAndOwnerType(trip.getId(), PhotoOwnerType.TRIP_COVER) >= 1) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip can have at most 1 cover image");
}
StoredFile storedFile = storageService.store(file, new StorageContext(user.getId(), trip.getId()));
TripPhoto photo = photoRepository.save(new TripPhoto(trip, null, PhotoOwnerType.TRIP_COVER,
        storedFile.storageKey(), null, storedFile.originalFileName(), storedFile.contentType(),
        storedFile.fileSize(), null, 0));
```

커버는 여행당 1장이다.

## 119. `PhotoController` 타임라인 사진 업로드

```java
TripTimelineItem item = timelineItemRepository.findOwnedById(id, user.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timeline item not found"));
long currentCount = photoRepository.countByTimelineItemIdAndOwnerType(item.getId(), PhotoOwnerType.TIMELINE_ITEM);
if (currentCount >= MAX_TIMELINE_PHOTOS) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timeline item can have at most 3 photos");
}
```

타임라인 사진 업로드에서도 소유권을 먼저 검증한다.

## 120. 파일 제공 API

```java
Resource resource = storageService.open(photo.getStorageKey());
return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(photo.getContentType()))
        .contentLength(photo.getFileSize())
        .cacheControl(CacheControl.noStore())
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                .filename(photo.getOriginalFileName())
                .build().toString())
        .body(resource);
```

사진 ID로 소유권을 확인한 뒤 실제 파일을 열어 반환한다. `noStore`는 개인 사진 캐싱 위험을 줄인다.

---

# Part 12. 지도 기능

## 121. `MapController` endpoint 목록

```text
GET /api/maps/world
GET /api/maps/domestic
GET /api/maps/regions/{mapKey}
```

세계 지도와 국내 지도를 분리한다.

## 122. `MapService.world` 집계 전략

```sql
select c.map_key, c.code_alpha2, c.name_ko,
       case min(region_status.priority)
           when 1 then 'COMPLETED'
           when 2 then 'PLANNED'
           else 'BUCKET'
       end as status
from (
    select country_id as region_id,
           case when status = 'COMPLETED' then 1 else 2 end as priority
    from trips
    where user_id = :userId
      and travel_scope = 'INTERNATIONAL'
      and status in ('COMPLETED', 'PLANNED')
    union all
    select country_id as region_id, 3 as priority
    from bucket_places
    where user_id = :userId
      and travel_scope = 'INTERNATIONAL'
      and status <> 'ON_HOLD'
) region_status
join countries c on c.id = region_status.region_id
group by c.id, c.map_key, c.code_alpha2, c.name_ko, c.display_order
```

상태 우선순위:

1. 완료 여행이 있으면 `COMPLETED`
2. 완료는 없고 예정 여행이 있으면 `PLANNED`
3. 여행은 없고 버킷만 있으면 `BUCKET`

## 123. 왜 Native SQL을 쓰는가

지도 집계는 `trips`와 `bucket_places`를 union하고 우선순위를 계산한다. JPQL로도 가능하지만 Native SQL이 더 직접적이고 DB 집계 의도가 명확하다.

## 124. 국내 지도 집계

`domestic`은 `countries` 대신 `domestic_regions`, `country_id` 대신 `domestic_region_id`를 쓴다. 나머지 우선순위 규칙은 동일하다.

## 125. 지역 상세 조회

```java
public MapRegionResponse.RegionDetail region(String email, String mapKey) {
    Long userId = currentUser(email).getId();
    RegionMetadata region = findRegion(mapKey);
    return new MapRegionResponse.RegionDetail(
            region.mapKey(), region.name(),
            countTrips(userId, region, TripStatus.COMPLETED),
            countTrips(userId, region, TripStatus.PLANNED),
            countBuckets(userId, region),
            trips(userId, region)
    );
}
```

`mapKey` 하나로 국가와 국내 지역을 모두 찾는다.

## 126. 동적 컬럼 선택

```java
String regionColumn = region.scope() == TravelScope.INTERNATIONAL ? "country_id" : "domestic_region_id";
```

주의: 컬럼명은 사용자 입력이 아니라 enum 기반 내부 값이므로 SQL injection 위험을 통제하고 있다.

## 127. `MapRegionResponse`

```java
public record WorldRegion(String mapKey, String countryCode, String nameKo, String status) { }
public record DomesticRegion(String mapKey, String regionCode, String nameKo, String status) { }
public record RegionDetail(String mapKey, String name, long completedCount,
                           long plannedCount, long bucketCount, List<TripSummary> trips) { }
```

지도 색칠용 목록과 지역 상세 패널용 응답을 분리했다.

---

# Part 13. 통계 기능

## 128. `StatsController` endpoint 목록

```text
GET /api/statistics/summary
GET /api/statistics/monthly
GET /api/statistics/top-regions?limit=5
```

## 129. Summary 통계

```java
long completedTrips = countTrips(userId, TripStatus.COMPLETED);
long plannedTrips = countTrips(userId, TripStatus.PLANNED);
long travelDays = completedTripDateRanges(userId).stream()
        .mapToLong(range -> ChronoUnit.DAYS.between(range.startDate(), range.endDate()) + 1)
        .sum();
long visitedCountries = countDistinctCompletedCountries(userId);
long visitedDomesticRegions = countDistinctCompletedDomesticRegions(userId);
```

PRD 대시보드의 핵심 숫자를 만든다.

## 130. 여행 일수 계산

5월 1일부터 5월 3일까지는 `between` 결과가 2이므로 `+1` 해야 3일이다.

## 131. 월별 완료 여행 수

```java
select year(t.startDate), month(t.startDate), count(t)
from Trip t
where t.user.id = :userId and t.status = :status
group by year(t.startDate), month(t.startDate)
order by year(t.startDate), month(t.startDate)
```

완료 여행만 월별 차트에 반영한다.

## 132. Top Regions

```java
regions.addAll(groupedInternationalRegions(userId));
regions.addAll(groupedDomesticRegions(userId));
return regions.stream()
        .sorted(Comparator.comparingLong(StatsResponse.TopRegion::count).reversed()
                .thenComparing(region -> region.scope().name())
                .thenComparing(StatsResponse.TopRegion::name))
        .limit(effectiveLimit)
        .toList();
```

해외 국가와 국내 지역을 합쳐 가장 많이 간 지역을 보여준다.

## 133. `StatsResponse`

```java
public record Summary(long completedTrips, long plannedTrips, long travelDays,
                      long visitedCountries, long visitedDomesticRegions) { }
public record MonthlyCount(String month, long count) { }
public record TopRegion(String name, TravelScope scope, long count) { }
```

통계 응답은 Entity가 아니라 집계 결과이므로 DTO record만 있다.

---

# Part 14. 컨트롤러 계층 API 설계

## 134. REST 리소스 설계 원칙

- `/api/trips`: 여행 컬렉션.
- `/api/trips/{id}`: 특정 여행.
- `/api/trips/{tripId}/timeline`: 여행의 하위 리소스.
- `/api/timeline-items/{id}`: 타임라인 항목 자체 리소스.
- `/api/buckets/{id}/convert-to-trip`: 단순 CRUD가 아닌 action endpoint.

## 135. HTTP 상태 코드

- 생성 성공: 201 Created.
- 일반 성공: 200 OK.
- 인증 없음/실패: 401 Unauthorized.
- 다른 사용자 데이터 접근: 403 Forbidden 또는 일부 컨트롤러에서는 404 Not Found.
- 잘못된 요청: 400 Bad Request.
- 중복 이메일: 409 Conflict.

## 136. 인증 사용자 전달 방식

모든 보호 API는 Controller에서 `Authentication authentication`을 받는다.

```java
tripService.list(authentication.getName())
```

이메일을 Service로 넘기고, Service가 User를 조회한다.

## 137. 왜 userId가 아니라 email을 넘기는가

SecurityContext의 `name`이 email이기 때문이다. JWT subject도 email이다. 다만 성능을 생각하면 JWT의 `uid`를 활용해 userId를 바로 넣는 개선도 가능하다.

## 138. ResponseEntity를 쓰는 경우

```java
return ResponseEntity.status(201).body(...);
```

상태 코드나 헤더를 직접 제어해야 할 때 사용한다. 쿠키 설정도 `ResponseEntity` header로 한다.

---

# Part 15. 테스트 전략

## 139. 테스트 공통 구조

대부분 통합 테스트는 다음을 사용한다.

```java
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create",
    "jwt.secret=test-jwt-secret-..."
})
```

- 실제 Spring Context를 띄운다.
- MockMvc로 HTTP 요청을 흉내 낸다.
- PostgreSQL에 JPA가 스키마를 생성한다.

## 140. `AuthControllerTest`

검증 항목:

- 회원가입 시 httpOnly access/refresh 쿠키 발급.
- `/api/auth/me`가 현재 사용자 반환.
- 로그인/refresh/logout 흐름.
- 잘못된 signup, 중복 이메일, 틀린 비밀번호 거부.

## 141. `TripControllerTest`

검증 항목:

- 여행 생성 시 TripDay 자동 생성.
- 목록/상세/수정/삭제.
- 날짜 수정 시 TripDay 재생성.
- 소유권 검사.
- 상태 전환 규칙.
- 날짜/국내해외 참조 검증.

## 142. `BucketPlaceControllerTest`

검증 항목:

- 버킷 CRUD.
- 소유권 검사.
- 국내/해외 참조 검증.
- 버킷 → 여행 전환.
- 전환 시 TripDay와 Checklist 생성.
- ON_HOLD/VISITED 전환 차단.

## 143. `ChecklistControllerTest`

검증 항목:

- 템플릿 기반 체크리스트 생성.
- 이미 있으면 재사용.
- 아이템 토글/삭제 후 진행률 재계산.
- 소유권 검사.

## 144. `StorageServiceTest`

검증 항목:

- 사용자/여행 디렉터리 아래 UUID 파일명으로 저장.
- `open`으로 리소스 읽기.
- 허용되지 않은 MIME, 5MB 초과, path traversal, magic byte 불일치 거부.
- delete 동작.

## 145. 지도/통계/타임라인 테스트의 학습 포인트

프로젝트에는 `MapControllerTest`, `StatsControllerTest`, `TimelineControllerTest`, `SchemaMigrationTest`, `TravelArchiveApplicationTests`도 있다. 이들은 다음을 보장한다.

- 지도 집계 SQL이 예상 상태 우선순위를 반환한다.
- 통계 집계가 완료 여행 기준으로 계산된다.
- 타임라인이 여행 기간 내 날짜만 허용한다.
- JPA가 PostgreSQL에 스키마를 생성한다.
- Spring Context가 정상 기동한다.

---

# Part 16. 파일별 학습 인덱스 66

아래 66개 섹션은 “파일을 열었을 때 무엇을 봐야 하는지”를 빠르게 정리한다.

## 146. `TravelArchiveApplication.java`
앱 진입점. `@SpringBootApplication`의 컴포넌트 스캔 범위가 `com.travelarchive` 전체이므로 하위 패키지 Bean이 자동 등록된다.

## 147. `config/SecurityConfig.java`
Stateless JWT 보안 설정. 공개 endpoint와 보호 endpoint 경계를 정의한다. `JwtAuthenticationFilter`를 username/password 필터 앞에 둔다.

## 148. `common/dto/ApiResponse.java`
모든 성공 응답의 공통 래퍼. 에러 응답은 Spring 기본 오류 포맷 또는 빈 401을 사용할 수 있다.

## 149. `common/enums/TravelScope.java`
국내/해외 분기 기준. Trip, Bucket, ChecklistTemplate, Map/Stats 집계가 모두 사용한다.

## 150. `common/enums/TripStatus.java`
여행 생명주기. `TripService.validateTransition`과 지도/통계 필터의 기준이다.

## 151. `common/enums/BucketStatus.java`
버킷 생명주기. 전환 가능 여부와 지도 BUCKET 표시 조건에 영향이 있다.

## 152. `common/enums/ChecklistItemStatus.java`
체크리스트 진행률 계산의 분자(`DONE`)와 분모(전체)를 나누는 기준.

## 153. `common/enums/TimelineCategory.java`
타임라인 항목 타입. UI 아이콘과 필터에 연결하기 좋은 값이다.

## 154. `common/enums/PhotoOwnerType.java`
사진 row가 커버인지 타임라인 사진인지 구분한다. DB check constraint와 함께 동작한다.

## 155. `user/User.java`
사용자 Entity. 이메일 unique, password_hash, nickname, role, 생성/수정 시각을 가진다.

## 156. `user/UserRepository.java`
이메일 기반 조회와 중복 검사를 제공한다. 인증 흐름의 첫 DB 관문이다.

## 157. `auth/AuthController.java`
회원가입/로그인/refresh/logout/me API. httpOnly 쿠키 생성/삭제 책임이 있다.

## 158. `auth/AuthService.java`
비밀번호 검증, 사용자 생성, 토큰 발급/갱신/폐기 비즈니스 로직. 사용자당 refresh token 하나 정책을 구현한다.

## 159. `auth/JwtTokenProvider.java`
HS256 JWT 생성/검증, claim 파싱, refresh token SHA-256 해시. secret 안정성 검사를 포함한다.

## 160. `auth/JwtAuthenticationFilter.java`
매 요청마다 access token 쿠키를 읽어 SecurityContext를 채운다. 인증 실패 시 context를 비운다.

## 161. `auth/AuthExceptionHandler.java`
Spring Security 인증 예외를 401 빈 응답으로 통일한다.

## 162. `auth/RefreshToken.java`
DB에 저장되는 refresh token 해시와 만료/폐기 상태. `isActive`가 refresh 가능 여부를 판단한다.

## 163. `auth/RefreshTokenRepository.java`
tokenHash 조회와 사용자별 token 삭제. 로그인 시 기존 refresh token 제거에 사용된다.

## 164. `auth/dto/LoginRequest.java`
로그인 입력. 이메일 형식과 빈 값 검증.

## 165. `auth/dto/SignupRequest.java`
회원가입 입력. 비밀번호 길이 8~72, 닉네임 2~80 검증.

## 166. `auth/dto/TokenResponse.java`
토큰 본문을 직접 주지 않고 타입과 access token 만료 시간만 반환한다. 실제 토큰은 쿠키에 있다.

## 167. `auth/dto/UserResponse.java`
내 정보 응답. passwordHash는 절대 노출하지 않는다.

## 168. `trip/Trip.java`
핵심 여행 Entity. User, BucketPlace, Country/DomesticRegion 관계와 날짜/상태/동행/요약을 가진다.

## 169. `trip/TripDay.java`
여행 일자 Entity. Trip 생성/날짜 변경 시 자동 생성된다.

## 170. `trip/TripTimelineItem.java`
일자별 타임라인 항목. 시간, 장소, 주소, 좌표, 카테고리, 메모를 가진다.

## 171. `trip/TripPhoto.java`
사진 메타데이터 Entity. 실제 파일은 StorageService가 관리한다.

## 172. `trip/TripRepository.java`
사용자별 여행 목록/소유 여행 조회. 모든 Trip 접근은 userId와 함께 한다.

## 173. `trip/TripDayRepository.java`
TripDay 목록, 다중 tripId 조회, count, tripId 삭제를 제공한다.

## 174. `trip/TripTimelineItemRepository.java`
fetch join으로 timeline 목록을 조회하고 item 소유권을 확인한다.

## 175. `trip/TripPhotoRepository.java`
사진 개수 제한, 커버/타임라인 사진 목록, 사진 소유권 조회를 제공한다.

## 176. `trip/TripController.java`
여행 CRUD와 상태 변경 API. `TripService`에 위임하는 얇은 Controller다.

## 177. `trip/TimelineController.java`
타임라인 CRUD API. 사진 JSON metadata endpoint는 multipart 업로드로 대체되었다.

## 178. `trip/PhotoController.java`
multipart 파일 업로드와 파일 제공 API. StorageService와 TripPhotoRepository를 함께 사용한다.

## 179. `trip/TripService.java`
여행 생성/수정/삭제/상태 변경의 핵심. 날짜 기반 TripDay 생성과 상태 전환 검증을 담당한다.

## 180. `trip/TimelineService.java`
타임라인 목록 그룹화, 생성/수정/삭제, 좌표/날짜 검증을 담당한다.

## 181. `trip/dto/TripRequest.java`
여행 생성/수정/상태 변경 입력을 하나로 받는다. `@JsonAlias`로 snake_case를 지원한다.

## 182. `trip/dto/TripResponse.java`
여행 응답. TripDay 배열과 coverPhotoId를 포함한다.

## 183. `trip/dto/TimelineItemRequest.java`
타임라인 입력. `visitedAt`은 날짜와 시간으로 나뉘어 저장된다.

## 184. `trip/dto/TimelineItemResponse.java`
타임라인 응답. DayGroup, PhotoResponse 내부 record를 포함한다.

## 185. `bucket/BucketPlace.java`
버킷리스트 Entity. 희망 예산, 시즌, 우선순위, 상태, 동행자 등을 저장한다.

## 186. `bucket/BucketPlaceRepository.java`
사용자별 버킷 목록과 소유 버킷 조회.

## 187. `bucket/BucketPlaceController.java`
버킷 CRUD와 여행 전환 endpoint를 제공한다.

## 188. `bucket/BucketPlaceService.java`
버킷 검증, 업데이트, 전환 로직. 전환 시 TripDay와 Checklist까지 만든다.

## 189. `bucket/dto/BucketPlaceRequest.java`
버킷 CRUD 입력과 전환 날짜 입력을 겸한다.

## 190. `bucket/dto/BucketPlaceResponse.java`
버킷 상세 응답. 생성/수정 시각 포함.

## 191. `checklist/TravelChecklist.java`
체크리스트 컨테이너 Entity. 진행률을 저장한다.

## 192. `checklist/TravelChecklistItem.java`
체크리스트 항목 Entity. TODO/DONE 토글 메서드가 있다.

## 193. `checklist/TravelChecklistTemplate.java`
국내/해외 체크리스트 템플릿 헤더.

## 194. `checklist/TravelChecklistTemplateItem.java`
템플릿 항목. 여행 체크리스트 생성 시 실제 item으로 복사된다.

## 195. `checklist/TravelChecklistRepository.java`
tripId로 체크리스트 하나를 찾는다. 현재 모델은 여행당 체크리스트 하나를 전제한다.

## 196. `checklist/TravelChecklistItemRepository.java`
정렬 목록, 전체 count, DONE count를 제공한다.

## 197. `checklist/ChecklistController.java`
체크리스트 조회/생성/토글/추가/삭제 API.

## 198. `checklist/ChecklistService.java`
템플릿 기반 생성, 진행률 계산, 소유권 검사, 커스텀 항목 추가.

## 199. `map/Country.java`
해외 지도 참조 Entity. mapKey와 국가명 정보를 가진다.

## 200. `map/DomesticRegion.java`
국내 지도 참조 Entity. 시도 코드와 mapKey를 가진다.

## 201. `map/MapController.java`
세계/국내/지역 상세 지도 API.

## 202. `map/MapService.java`
Native SQL로 trips와 bucket_places를 합쳐 지도 상태를 계산한다.

## 203. `map/dto/MapRegionResponse.java`
지도 응답 record 모음. Utility class처럼 private 생성자를 둔다.

## 204. `stats/StatsController.java`
summary/monthly/top-regions 통계 API.

## 205. `stats/StatsService.java`
JPQL과 Java stream으로 여행 통계를 계산한다.

## 206. `stats/dto/StatsResponse.java`
통계 응답 record 모음.

## 207. `storage/StorageService.java`
파일 저장 추상화 인터페이스. S3 전환 시 확장 지점이다.

## 208. `storage/LocalFileStorageService.java`
로컬 디스크 저장 구현. 파일 검증, 경로 안전성, magic bytes 검증을 포함한다.

## 209. `storage/StorageProperties.java`
저장 루트, 최대 크기, 허용 MIME type 설정.

## 210. `storage/StorageContext.java`
파일 저장 위치를 결정하는 userId/tripId context.

## 211. `storage/StoredFile.java`
저장 결과 메타데이터 record.

---

# Part 17. “바꾸면 어떻게 될까?” 실전 사고 훈련

## 212. `open-in-view`를 true로 바꾸면?

LAZY 로딩 오류는 줄어들 수 있지만 Controller/JSON 직렬화 중 예상치 못한 쿼리가 발생한다. 성능 문제를 숨기므로 현재처럼 false가 학습과 운영에 더 명확하다.

## 213. Entity를 그대로 반환하면?

양방향 관계가 생길 경우 순환 참조 위험이 있고, passwordHash 같은 민감 필드 노출 위험이 커진다. DTO는 API 계약과 내부 모델을 분리한다.

## 214. Refresh token을 DB에 원문 저장하면?

DB 유출 시 공격자가 refresh token을 바로 사용할 수 있다. 해시 저장은 피해를 줄인다.

## 215. Access token을 localStorage에 저장하면?

프론트 JS가 읽을 수 있어 XSS 시 탈취 위험이 커진다. httpOnly cookie는 JS 접근을 막는다.

## 216. `TripDay`를 자동 생성하지 않으면?

프론트가 매번 날짜 배열을 계산해야 하고 타임라인 생성 시 날짜 유효성 검사가 복잡해진다. 서버가 canonical day 구조를 갖는 편이 안정적이다.

## 217. 버킷 전환 시 체크리스트를 생성하지 않으면?

사용자가 여행 준비 화면에 들어갈 때 별도 생성 요청이 필요하다. 현재 구현은 전환 즉시 준비 단계로 넘어가므로 사용자 경험이 좋다.

## 218. 지도 집계를 JPQL로만 하면?

타입 안정성은 일부 좋아질 수 있지만 union/우선순위 계산이 복잡해진다. 현재 Native SQL은 집계 의도를 명확히 표현한다.

## 219. 사진을 DB BLOB으로 저장하면?

백업/트랜잭션 일관성은 단순할 수 있지만 DB 크기와 I/O 부담이 커진다. 파일 시스템/S3 + DB 메타데이터 방식이 일반적이다.

## 220. `countryId`와 `domesticRegionId`를 둘 다 허용하면?

지도/통계에서 한 여행이 국내인지 해외인지 모호해진다. 현재 체크 제약은 이 모순을 원천 차단한다.

## 221. 상태 전환을 자유롭게 허용하면?

완료 여행이 취소로 바뀌며 통계가 흔들리거나, 취소 여행이 완료로 바뀌는 등 도메인 의미가 약해진다. 상태 머신은 데이터 의미를 지킨다.

## 222. 사용자 ID를 URL에 받으면?

`/api/users/{userId}/trips` 같은 구조는 편할 수 있지만, 악의적 userId 변경 위험이 있다. 현재는 인증 사용자 기준으로만 조회한다.

---

# Part 18. 고급 리팩터링 아이디어

## 223. 공통 `currentUser` 중복 제거

여러 Service에 다음 코드가 반복된다.

```java
userRepository.findByEmail(email)
```

`CurrentUserService` 또는 custom `AuthenticationPrincipal`로 줄일 수 있다.

## 224. Trip/Bucket 국내해외 검증 중복 제거

`TripService.validateFields`와 `BucketPlaceService.validateFields`가 비슷하다. `TravelRegionResolver` 같은 컴포넌트로 추출 가능하다.

## 225. 체크리스트 템플릿 Repository 추가

현재 템플릿 조회는 EntityManager JPQL이다. `TravelChecklistTemplateRepository`를 만들면 테스트와 재사용성이 좋아진다.

## 226. JWT 라이브러리 도입

학습용 직접 구현을 운영형으로 강화하려면 `jjwt` 또는 `nimbus-jose-jwt` 도입을 검토한다.

## 227. 사진 삭제 API 추가

현재 StorageService는 delete를 제공하지만 PhotoController에는 사진 삭제 endpoint가 없다. `DELETE /api/photos/{id}`를 추가할 수 있다.

## 228. S3 StorageService 구현

`StorageService` 덕분에 `S3StorageService implements StorageService`를 추가하고 profile별 Bean 선택으로 전환 가능하다.

## 229. Refresh token rotation 강화

현재 refresh 시 기존 refresh token을 그대로 재사용한다. 보안을 강화하려면 refresh 때마다 refresh token도 새로 발급하고 이전 token을 revoke한다.

## 230. 상태 전환 이벤트 기록

Trip/Bucket 상태 변경 이력을 별도 테이블에 저장하면 감사 추적과 활동 로그 기능을 만들 수 있다.

---

# Part 19. 면접/CSAT 스타일 핵심 문제 70

## 231. Spring Boot 시작점은 무엇인가?
`TravelArchiveApplication.main`과 `@SpringBootApplication`이다.

## 232. `ddl-auto=validate`의 의미는?
Hibernate가 스키마를 만들지 않고 Entity와 DB가 맞는지만 검증한다.

## 233. `ddl-auto=create`와 `validate`의 차이는?
- `create`: JPA가 앱 실행 시 엔티티 기반으로 스키마를 자동 생성/재생성한다.
- `validate`: JPA가 엔티티와 기존 DB 스키마가 일치하는지만 검증한다.

## 234. DTO를 쓰는 이유는?
Entity 내부 구조와 API 계약을 분리하고 민감 필드 노출을 막기 위해서다.

## 235. `record`의 장점은?
불변 데이터 전달 객체를 짧게 만들 수 있다.

## 236. `@ManyToOne(fetch = LAZY)`의 의미는?
연관 Entity를 실제 접근 전까지 조회하지 않는다.

## 237. `open-in-view=false`의 장점은?
트랜잭션 경계를 명확히 하고 Controller에서 우발적 쿼리가 나가는 것을 막는다.

## 238. Access token과 refresh token의 차이는?
Access token은 짧게 인증에 사용, refresh token은 새 access token 발급에 사용된다.

## 239. httpOnly cookie의 장점은?
브라우저 JavaScript가 토큰을 읽지 못해 XSS 탈취 위험을 줄인다.

## 240. SameSite Strict의 목적은?
다른 사이트에서 온 요청에 쿠키 전송을 제한해 CSRF 위험을 줄인다.

## 241. `ResponseStatusException`은 어디에 적합한가?
서비스 검증 실패를 HTTP 상태 코드로 바로 표현할 때 적합하다.

## 242. 소유권 검사는 왜 Service에서 하는가?
비즈니스 규칙이며 여러 Controller/API에서 일관되게 적용해야 하기 때문이다.

## 243. `findByIdAndUserId`의 장점은?
조회와 소유권 확인을 한 쿼리로 처리한다.

## 244. TripDay를 삭제 후 재생성하는 이유는?
여행 기간 변경 시 날짜 배열을 정확히 다시 맞추기 위해서다.

## 245. 이 방식의 위험은?
기존 TripDay에 연결된 타임라인이 함께 삭제될 수 있다.

## 246. DB check constraint의 역할은?
서비스 버그나 직접 DB 접근에도 잘못된 데이터를 막는 최후 방어선이다.

## 247. 지도 집계에서 status 우선순위는?
COMPLETED > PLANNED > BUCKET.

## 248. 버킷 ON_HOLD를 지도에서 제외하는 이유는?
현재 관심/계획 대상이 아니므로 지도 색칠에서 제외한다.

## 249. 체크리스트 템플릿을 복사하는 이유는?
여행별 체크리스트를 독립적으로 수정하기 위해서다.

## 250. 진행률이 반올림되는 이유는?
`Math.round(doneCount * 100.0 / totalCount)`를 사용하기 때문이다.

## 251. 파일명을 UUID로 바꾸는 이유는?
충돌, 추측, 원본 파일명 기반 공격을 줄이기 위해서다.

## 252. magic bytes 검증은 왜 필요한가?
Content-Type/확장자 위조 파일을 걸러내기 위해서다.

## 253. `StorageService` 인터페이스의 장점은?
로컬 저장소를 S3 등으로 교체하기 쉽다.

## 254. Native SQL 사용 시 주의점은?
DB 의존성이 생기고 문자열 SQL이므로 컴파일 타임 검증이 약하다.

## 255. `@JsonAlias`는 왜 쓰는가?
프론트의 snake_case JSON을 Java camelCase 필드로 받기 위해서다.

## 256. `@Valid`는 어디서 동작하는가?
Controller 메서드 파라미터에서 요청 DTO 검증을 수행한다.

## 257. 왜 Login 실패 메시지를 통일하는가?
이메일 존재 여부 노출을 줄이기 위해서다.

## 258. refresh token logout은 어떻게 구현됐나?
DB row의 `revokedAt`을 설정하고 쿠키 maxAge 0으로 지운다.

## 259. 사용자당 refresh token 하나 정책의 장단점은?
단순하고 보안 관리가 쉽지만 여러 기기 동시 로그인에는 불리하다.

## 260. `CacheControl.noStore()`의 의미는?
개인 파일 응답을 캐시에 저장하지 말라는 지시다.

## 261. `ContentDisposition.inline()`은?
브라우저가 다운로드보다 화면 표시를 시도하게 한다.

## 262. `TripPhoto.fileUrl`이 null인 이유는?
로컬 파일은 `/api/files/{photoId}`로 제공되므로 외부 URL이 필요 없을 수 있다.

## 263. `MapService.toLocalDate`가 필요한 이유는?
Native query 결과가 DB/드라이버에 따라 `LocalDate` 또는 `java.sql.Date`일 수 있기 때문이다.

## 264. `EntityManager.getReference`와 `find`의 차이?
`getReference`는 프록시 참조를 반환하고 즉시 DB 조회를 생략할 수 있다.

## 265. `flush()`를 명시적으로 호출한 예는?
refresh token 삭제 후 새 token 저장, TripDay 삭제 후 재생성, checklist item 삭제 후 progress 재계산.

## 266. 왜 삭제 후 flush가 필요할 수 있나?
같은 트랜잭션 안에서 DB 상태를 즉시 반영해야 다음 작업과 제약 충돌을 피할 수 있다.

## 267. `TimelineService.addPhoto`가 에러를 던지는 이유는?
사진은 JSON metadata가 아니라 multipart 업로드 API를 사용하도록 유도하기 위해서다.

## 268. 여행 완료 통계는 어떤 상태만 보나?
`TripStatus.COMPLETED`만 본다.

## 269. 예정 여행 통계는?
summary에서 `PLANNED` count를 제공한다.

## 270. `BucketPlace.convertToTrip` 응답 상태는 왜 PLANNED인가?
Trip 생성자의 기본 상태가 PLANNED이며, Bucket status의 BOOKED는 버킷 상태에 반영된다.

## 271. Trip과 Bucket의 scope 검증이 중요한 이유는?
지도/통계에서 국가와 국내 지역을 명확히 분리하기 위해서다.

## 272. `ApiResponse<Void>`는 언제 쓰나?
삭제/logout처럼 반환 데이터가 없지만 메시지는 통일하고 싶을 때 사용한다.

## 273. Controller가 얇아야 하는 이유는?
HTTP 처리와 비즈니스 로직을 분리해 테스트와 유지보수를 쉽게 하기 위해서다.

## 274. Service 테스트 대신 통합 테스트가 많은 이유는?
Security, JPA, PostgreSQL, HTTP 응답까지 실제 흐름을 확인하기 위해서다.

## 275. PostgreSQL 테스트의 장점은?
로컬 개발과 운영 환경이 동일한 DB를 사용하므로 SQL 동작 차이가 없다.

## 276. 테스트용 DB 스키마는 어떻게 관리하나?
`@TestPropertySource`로 `spring.jpa.hibernate.ddl-auto=create`를 설정하여 JPA가 테스트 전용 스키마를 자동 생성한다.

## 277. `ddl-auto=create`로 인한 테스트 격리는 어떻게 하나?
`@Transactional`을 사용하여 각 테스트 후 데이터를 롤백하거나, `@DirtiesContext`로 애플리케이션 컨텍스트를 재생성한다.

## 278. DTO 내부 record의 장점은?
특정 응답에만 쓰이는 작은 구조를 가까운 곳에 둘 수 있다.

## 279. Utility class private 생성자의 의미는?
`MapRegionResponse`, `StatsResponse`처럼 record 모음 클래스를 인스턴스화하지 못하게 한다.

## 280. 이 프로젝트에서 Lombok은 많이 쓰이는가?
의존성은 있지만 Entity는 명시적 getter/생성자를 사용한다. JPA 학습에는 명시 코드가 읽기 좋다.

## 281. `@SuppressWarnings("unused")`는 왜 보이나?
JPA가 reflection으로 사용하는 필드가 IDE에서 미사용처럼 보일 수 있어서 경고를 줄인다.

## 282. `createdAt`이 insertable=false인 이유는?
DB default `CURRENT_TIMESTAMP`가 값을 넣게 하기 위해서다.

## 283. `updatedAt`이 자동 갱신되는가?
현재 SQL에는 DB trigger가 없으므로 완전한 자동 갱신은 구현되어 있지 않다. 개선 포인트다.

## 284. 여행당 체크리스트가 하나인 근거는?
`TravelChecklistRepository.findByTripId`가 Optional 하나만 반환한다.

## 285. 여러 체크리스트를 지원하려면?
Repository를 list 조회로 바꾸고, unique 정책/API 응답 구조를 재설계해야 한다.

## 286. 커버 사진 여러 장을 허용하려면?
PhotoController의 count 제한과 UI에서 어떤 사진을 대표로 쓸지 정책을 바꿔야 한다.

## 287. Timeline sort_order가 생성 시 0인 이유는?
현재 정렬은 주로 day/time/id 기준이다. drag-and-drop 순서를 도입하려면 sortOrder 관리 API가 필요하다.

## 288. `cost` 필드가 Entity에 있지만 응답에 없는 이유는?
스키마/Entity에는 준비되어 있으나 현재 DTO/API에서는 노출되지 않는다. 기능 확장 여지다.

## 289. `fileUrl`이 DTO에 있는 이유는?
로컬 외 S3/CDN 전환 시 외부 URL 응답을 지원할 수 있다.

## 290. `AuthController.refresh`가 refresh cookie 없으면?
401을 반환한다.

## 291. access token 만료 시 흐름은?
보호 API는 401이 되고, 프론트는 `/api/auth/refresh`를 호출해 새 access cookie를 받아야 한다.

## 292. 로그아웃 후 refresh는 왜 실패하나?
DB refresh token row가 revoked 상태가 되기 때문이다.

## 293. 보안상 개선할 점 하나는?
Refresh token rotation과 CSRF token 추가를 검토할 수 있다.

## 294. 성능상 개선할 점 하나는?
지도/통계 집계에 캐싱 또는 materialized view를 도입할 수 있다.

## 295. API 문서화 개선은?
SpringDoc OpenAPI를 추가해 Swagger UI를 제공할 수 있다.

## 296. 테스트 개선은?
Testcontainers로 실제 PostgreSQL 통합 테스트를 추가할 수 있다.

## 297. 파일 저장 개선은?
S3 multipart upload, 바이러스 스캔, 이미지 리사이징을 추가할 수 있다.

## 298. 예외 응답 개선은?
전역 `@RestControllerAdvice`로 `{code,message,details}` 형태를 통일할 수 있다.

## 299. 감사 로그 개선은?
상태 변경, 로그인, 파일 업로드 이벤트를 별도 테이블에 기록할 수 있다.

## 300. 이 프로젝트의 가장 중요한 백엔드 학습 포인트
“Controller는 얇게, Service는 규칙을, Repository는 조회를, Entity는 데이터 모델을”이라는 Spring 백엔드 기본기를 실제 기능 전체에서 반복해 익힐 수 있다는 점이다.

---

# Part 20. 빠른 복습 로드맵

## 301. 1일차 추천
`application.yml`, `pom.xml`, `TravelArchiveApplication`, `ApiResponse`, Enum들을 읽는다.

## 302. 2일차 추천
`User`, `AuthService`, `JwtTokenProvider`, `SecurityConfig`, `JwtAuthenticationFilter`를 읽고 로그인 흐름을 손으로 그린다.

## 303. 3일차 추천
`Trip`, `TripDay`, `TripService`, `TripController`, `TripControllerTest`를 읽고 여행 생성 시 DB row가 어떻게 생기는지 추적한다.

## 304. 4일차 추천
`BucketPlaceService.convertToTrip`를 중심으로 버킷 전환이 Trip/TripDay/Checklist를 어떻게 함께 만드는지 본다.

## 305. 5일차 추천
`ChecklistService`와 V3 seed SQL을 함께 읽고 템플릿 복제 패턴을 이해한다.

## 306. 6일차 추천
`TimelineService`, `PhotoController`, `LocalFileStorageService`를 읽고 타임라인+사진 흐름을 따라간다.

## 307. 7일차 추천
`MapService`, `StatsService`의 집계 쿼리를 읽고 PRD 대시보드 요구와 연결한다.

## 308. 8일차 추천
테스트 10개를 읽으며 “어떤 규칙을 깨뜨리지 않으려는 테스트인가?”를 정리한다.

## 309. 최종 과제 A
`DELETE /api/photos/{photoId}`를 설계해 보라. DB row 삭제와 실제 파일 삭제 순서, 트랜잭션 실패 시 보상 전략을 생각한다.

## 310. 최종 과제 B
`TripService.update`에서 날짜 변경 시 기존 타임라인을 보존하려면 어떻게 해야 하는지 설계하라.

## 311. 최종 과제 C
S3 저장소로 바꿀 때 `StorageService` 구현만 바꾸면 충분한지, `StoredFile.fileUrl`을 어떻게 채울지 고민하라.

## 312. 최종 과제 D
지도 집계에 `CANCELLED` 여행을 흐리게 표시하려면 DB 쿼리와 응답 DTO를 어떻게 바꿀지 설계하라.

## 313. 최종 과제 E
여러 기기 로그인을 지원하려면 `RefreshTokenRepository.deleteByUser(user)` 정책을 어떻게 바꿔야 하는지 설계하라.

## 314. 마무리
Travel Archive 백엔드는 주니어가 Spring Boot 실무 구조를 익히기에 좋은 작은 모놀리스다. 기능은 많지만 패턴은 반복된다. 한 기능을 깊게 이해하면 다른 기능도 같은 렌즈로 읽을 수 있다.
