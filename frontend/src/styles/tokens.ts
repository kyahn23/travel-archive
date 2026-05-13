// 디자인 토큰은 색상, 간격, 타이포그래피 같은 반복 값을 한 곳에 모아둔 상수입니다.
// `as const` 를 붙이면 각 값이 단순한 `string`/`number` 가 아니라
// 정확한 리터럴 타입으로 고정되어, 잘못된 값 사용을 더 잘 막아줍니다.
export const colors = {
  cream: {
    50: "#FFFDF8",
    100: "#FFF8EC",
    200: "#FFF0D4",
    300: "#FFE4B5",
    400: "#FFD48A",
    500: "#FFC060",
  },
  coral: {
    50: "#FFF5F3",
    100: "#FFE8E3",
    200: "#FFD0C7",
    300: "#FFB0A0",
    400: "#FF8A73",
    500: "#FF6B54",
    600: "#E8523B",
    700: "#C43D28",
  },
  teal: {
    50: "#F0FDFA",
    100: "#CCFBF1",
    200: "#99F6E4",
    300: "#5EEAD4",
    400: "#2DD4BF",
    500: "#14B8A6",
    600: "#0D9488",
    700: "#0F766E",
  },
  sand: {
    50: "#FAFAF5",
    100: "#F5F5EB",
    200: "#EBE9D9",
    300: "#DDD9C4",
    400: "#C9C3A5",
  },
} as const;

// `spacing` 도 동일하게 읽기 전용 리터럴 타입으로 고정됩니다.
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  touch: "44px",
} as const;

// 타이포그래피 토큰은 객체 안의 중첩 객체까지 함께 타입이 좁혀집니다.
export const typography = {
  displayLg: { size: "2rem", lineHeight: "1.2", letterSpacing: "-0.02em" },
  display: { size: "1.75rem", lineHeight: "1.25", letterSpacing: "-0.01em" },
  titleLg: { size: "1.5rem", lineHeight: "1.3" },
  title: { size: "1.25rem", lineHeight: "1.4" },
  bodyLg: { size: "1.0625rem", lineHeight: "1.6" },
  body: { size: "0.9375rem", lineHeight: "1.6" },
  caption: { size: "0.8125rem", lineHeight: "1.5" },
  micro: { size: "0.75rem", lineHeight: "1.4" },
} as const;

// 브레이크포인트는 화면 크기 기준을 숫자로 정의한 디자인 시스템 값입니다.
export const breakpoints = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1200,
} as const;
