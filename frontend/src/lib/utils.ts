// `import type` 는 타입 정보만 가져오는 전용 import 입니다.
// JavaScript로 변환될 때는 사라지므로, 런타임 번들에 포함되지 않습니다.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// `...inputs` 는 rest parameter 입니다.
// 함수 호출 시 여러 개의 값을 한 배열로 받아서 처리할 수 있게 해줍니다.
// `ClassValue[]` 는 `ClassValue` 타입 요소가 여러 개 들어간 배열이라는 뜻입니다.
// 여기서 제네릭 배열 표기(`T[]`) 는 "T 타입을 원소로 갖는 배열"을 의미합니다.
// 반환 타입을 따로 쓰지 않았으므로 TypeScript가 `twMerge(...)` 결과를 보고
// 자동으로 반환 타입을 추론합니다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
