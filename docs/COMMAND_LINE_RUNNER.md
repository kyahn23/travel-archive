# CommandLineRunner - Spring Boot 초기화 가이드

> Spring Boot 애플리케이션이 완전히 기동된 직후, 자동으로 실행되는 초기화 로직을 구현하는 방법을 설명합니다.

---

## 1. CommandLineRunner란?

**CommandLineRunner**는 Spring Boot에서 제공하는 간단한 인터페이스입니다.

```java
public interface CommandLineRunner {
    void run(String... args) throws Exception;
}
```

> **한 문장 정의:** "Spring Boot 애플리케이션이 완전히 기동된 직후, 자동으로 실행되는 코드 블록"

---

## 2. 왜 필요한가?

애플리케이션이 뜨자마자 해야 할 일들이 있습니다:

| 작업 유형 | 예시 |
|-----------|------|
| **참조 데이터 삽입** | 국가 코드, 지역 코드, 체크리스트 템플릿 등 |
| **캐시 초기화** | Redis, Caffeine 등에 데이터 미리 로드 |
| **스케줄러 등록** | Quartz, @Scheduled 작업 초기 설정 |
| **외부 API 연결 확인** | 서드파티 서비스 헬스체크 |
| **인덱스 생성** | Elasticsearch, MongoDB 등 |

### @PostConstruct와의 차이

`@PostConstruct`는 **Bean 생성 직후** 실행됩니다. 이 시점에는 아직 DB 커넥션이나 트랜잭션이 준비되지 않을 수 있어 위험합니다.

CommandLineRunner는 **애플리케이션 컨텍스트가 완전히 로드된 후** 실행되므로 안전합니다.

| 구분 | @PostConstruct | CommandLineRunner |
|------|---------------|-------------------|
| **실행 시점** | Bean 생성 직후 | 앱 컨텍스트 로드 완료 후 |
| **DB 접근** | 불안전할 수 있음 | 안전 |
| **트랜잭션** | 별도 설정 필요 | @Transactional 사용 가능 |
| **의존성** | 주입된 Bean만 사용 가능 | 전체 컨텍스트 사용 가능 |

---

## 3. 사용 방법

### 3.1 기본 구현

```java
@Component  // Spring Bean으로 등록
public class SeedDataLoader implements CommandLineRunner {

    private final EntityManager entityManager;

    public SeedDataLoader(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional  // DB 작업이 필요하면 트랜잭션 필수
    public void run(String... args) {
        // 앱 기동 후 실행될 로직
        if (isEmpty("countries")) {
            seedCountries();
        }
    }

    private boolean isEmpty(String table) {
        Long count = ((Number) entityManager
            .createNativeQuery("select count(*) from " + table)
            .getSingleResult()).longValue();
        return count == 0;
    }

    private void seedCountries() {
        // 데이터 삽입 로직
    }
}
```

### 3.2 실행 순서 지정

여러 개의 CommandLineRunner가 있을 때 순서를 지정하려면 `@Order` 애노테이션을 사용합니다.

```java
@Component
@Order(1)  // 낮을수록 먼저 실행
public class SeedDataLoader implements CommandLineRunner { ... }

@Component
@Order(2)
public class CacheWarmer implements CommandLineRunner { ... }
```

### 3.3 조걶 실행

특정 프로필에서만 실행되도록 설정할 수 있습니다.

```java
@Component
@Profile("!test")  // 테스트 환경에서는 실행하지 않음
public class SeedDataLoader implements CommandLineRunner { ... }
```

또는 설정값을 기반으로 실행 여부를 결정할 수 있습니다.

```java
@Component
public class SeedDataLoader implements CommandLineRunner {

    @Value("${app.seed-data.enabled:true}")
    private boolean seedDataEnabled;

    @Override
    public void run(String... args) {
        if (!seedDataEnabled) {
            return;
        }
        // seed 데이터 삽입 로직
    }
}
```

---

## 4. CommandLineRunner vs ApplicationRunner

둘 다 앱 기동 후 실행되지만, 파라미터 처리 방식에 차이가 있습니다.

| 구분 | CommandLineRunner | ApplicationRunner |
|------|-------------------|-------------------|
| **파라미터** | `String... args` (문자열 배열) | `ApplicationArguments args` (객체) |
| **사용 예** | 단순한 문자열 파라미터 처리 | `--option=value` 형태의 옵션 파싱 |
| **추천** | 대부분의 경우 이걸로 충분 | CLI 옵션을 정교하게 다룰 때 |

### ApplicationRunner 예시

```java
@Component
public class CacheWarmer implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        // --warmup-categories=food,travel 같은 옵션 파싱
        List<String> categories = args.getOptionValues("warmup-categories");
        if (categories != null) {
            categories.forEach(this::warmupCache);
        }
    }
}
```

---

## 5. Travel Archive에서의 활용

### 5.1 SeedDataLoader 구조

`SeedDataLoader`는 애플리케이션이 기동될 때 **3가지를 확인**합니다:

| 순서 | 테이블 | 조건 | 동작 |
|------|--------|------|------|
| 1 | `countries` | 비어있으면 | 20개 국가 데이터 INSERT |
| 2 | `domestic_regions` | 비어있으면 | 17개 국내 지역 데이터 INSERT |
| 3 | `travel_checklist_templates` | 비어있으면 | 국내/해외 템플릿 + 각 12개 아이템 INSERT |

### 5.2 중복 삽입 방지

`isEmpty()` 체크 덕분에 **이미 데이터가 있으면 중복 삽입되지 않습니다.**

```java
private boolean isEmpty(String table) {
    Long count = ((Number) entityManager
        .createNativeQuery("select count(*) from " + table)
        .getSingleResult()).longValue();
    return count == 0;
}
```

앱을 여러 번 재기동필도 안전합니다.

### 5.3 JPA ddl-auto와의 관계

현재 프로젝트는 `ddl-auto: update`를 사용하고 있어 스키마는 자동으로 관리되지만, **데이터는 자동으로 채워지지 않습니다.** CommandLineRunner가 이 간극을 메웁니다.

```yaml
# application-dev.yml
spring:
  jpa:
    hibernate:
      ddl-auto: update  # 스키마 자동 관리
```

---

## 6. 주의사항

### 6.1 테스트에서도 실행됨

`@SpringBootTest`는 전체 컨텍스트를 로드하므로 CommandLineRunner도 함께 실행됩니다. 이 덕분에 테스트에서 seed 데이터를 자동으로 받을 수 있지만, **테스트 실행 시간이 증가**할 수 있습니다.

**해결 방법:**
- `@Profile("!test")`로 테스트 환경에서 제외
- `application-test.yml`에 `app.seed-data.enabled=false` 설정
- `@MockBean`으로 대체

### 6.2 실패하면 앱 기동 실패

`run()` 메서드에서 예외가 발생하면 애플리케이션이 종료됩니다. 치명적이지 않은 초기화는 `try-catch`로 감싸는 것이 좋습니다.

```java
@Override
public void run(String... args) {
    try {
        seedData();
    } catch (Exception e) {
        log.warn("Seed data initialization failed: {}", e.getMessage());
        // 앱은 계속 실행됨
    }
}
```

### 6.3 무거운 작업은 피하기

기동 시간을 지연시키지 않으려면, 대량 데이터 마이그레이션이나 외부 API 호출은 **비동기(`@Async`)**로 처리하세요.

```java
@Component
public class SeedDataLoader implements CommandLineRunner {

    @Async  // 별도 스레드에서 실행
    @Override
    public void run(String... args) {
        // 무거운 작업
    }
}
```

### 6.4 트랜잭션 관리

CommandLineRunner 메서드에 `@Transactional`을 붙이면 **메서드 전체가 하나의 트랜잭션**으로 실행됩니다. 하지만 **다른 Bean에서 호출되는 메서드**는 별도의 트랜잭션이 필요할 수 있습니다.

```java
@Component
public class SeedDataLoader implements CommandLineRunner {

    @Override
    public void run(String... args) {
        // 여기에는 @Transactional이 적용되지 않음!
        seedService.seed();  // 이 메서드에 @Transactional이 있어야 함
    }
}

@Service
public class SeedService {

    @Transactional  // 여기에 붙여야 실제 트랜잭션 적용
    public void seed() {
        // DB 작업
    }
}
```

> **주의:** `run()` 메서드 자체에 `@Transactional`을 붙이려면 클래스에 `@Transactional`을 붙이거나, `TransactionTemplate`을 사용해야 합니다.

---

## 7. 요약

> CommandLineRunner는 "앱이 뜨고 나서 딱 한 번 실행되는 초기화 로직"을 깔끔하게 분리할 수 있게 해주는 Spring Boot의 편의 도구입니다.

| 상황 | 사용 여부 |
|------|-----------|
| 참조 데이터(국가, 코드) 삽입 | ✅ 필수 |
| 캐시 워밍업 | ✅ 적합 |
| 외부 API 헬스체크 | ✅ 적합 |
| 무거운 배치 작업 | ⚠️ @Async 권장 |
| 테스트 데이터 준비 | ✅ 또는 @Sql |
| 스키마 마이그레이션 | ❌ Flyway 권장 |

---

> 마지막 업데이트: 2026-05-20
