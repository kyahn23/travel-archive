/**
 * 이 파일은 테스트 실행 전에 한 번만 불리는 설정 파일입니다.
 *
 * TypeScript 문법 설명:
 * - `import '@testing-library/jest-dom';` 는 값을 변수에 받지 않고
 *   모듈 자체를 불러오기만 하는 "side-effect import" 입니다.
 * - 이 패키지는 `toBeInTheDocument()` 같은 DOM 전용 matcher를
 *   전역 `expect`에 추가해 줍니다.
 * - JavaScript만 알면 "테스트 헬퍼를 등록하는 초기화 코드"로 이해하면 됩니다.
 */
import '@testing-library/jest-dom';
