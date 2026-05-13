"use client";

import L from "leaflet";
import { MapPin } from "lucide-react";

// export type는 "값"이 아니라 "타입"만 외부로 내보냅니다.
// 마커 상태를 가능한 문자열 몇 개로 제한하는 유니온 타입입니다.
export type MarkerStatus = "COMPLETED" | "PLANNED" | "BUCKET";

/**
 * 지도 마커가 필요로 하는 데이터 구조입니다.
 * 인터페이스는 객체의 필수/선택 속성을 문서화하는 용도입니다.
 */
interface MarkerData {
  id: number;
  title: string;
  placeName: string | null;
  visitedAt: string | null;
  latitude: number;
  longitude: number;
  status: MarkerStatus;
}

// Record<MarkerStatus, string>으로 상태별 색상 매핑을 타입 안전하게 만듭니다.
const STATUS_COLOR: Record<MarkerStatus, string> = {
  COMPLETED: "#14B8A6",
  PLANNED: "#FF6B54",
  BUCKET: "#A78BFA",
};

// Leaflet의 DivIcon 타입을 반환합니다.
function createIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/>
        <circle cx="14" cy="14" r="6" fill="white"/>
      </svg>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// status 값에 따라 미리 정해둔 색상 아이콘을 반환합니다.
export function getMarkerIcon(status: MarkerStatus): L.DivIcon {
  return createIcon(STATUS_COLOR[status]);
}

// null을 허용하는 매개변수 타입입니다. 값이 없으면 빈 문자열을 반환합니다.
function escapeHtml(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// export function은 다른 파일에서 직접 가져다 쓸 수 있는 유틸 함수입니다.
export function formatPopupContent(marker: MarkerData): string {
  const title = escapeHtml(marker.title);
  const placeName = escapeHtml(marker.placeName);
  const time = marker.visitedAt
    ? new Date(marker.visitedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return `
    <div style="font-family: Pretendard, system-ui, sans-serif; padding: 4px 0;">
      <strong style="font-size: 14px; color: #1a1a1a;">${title}</strong>
      ${placeName ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">📍 ${placeName}</div>` : ""}
      ${time ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">🕐 ${time}</div>` : ""}
    </div>
  `;
}

// 타입 별칭도 export 해서 LeafletMap 등 다른 파일이 재사용할 수 있게 합니다.
export type { MarkerData };
