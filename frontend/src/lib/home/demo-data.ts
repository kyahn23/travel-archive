import type { CountryData } from "@/components/maps/WorldMap";
import type { RegionData } from "@/components/maps/KoreaMap";
import type { StatsSummary } from "@/types/travel";

export const demoWorldData: CountryData[] = [
  {
    id: "JP",
    name: "일본",
    status: "COMPLETED",
    tripCount: 3,
    bucketCount: 0,
    recentTrips: [
      { id: 1, title: "오사카 여행", startDate: "2024-05-10", endDate: "2024-05-14" },
      { id: 2, title: "도쿄 힐링", startDate: "2024-09-01", endDate: "2024-09-05" },
    ],
  },
  {
    id: "TH",
    name: "태국",
    status: "COMPLETED",
    tripCount: 2,
    bucketCount: 0,
    recentTrips: [
      { id: 3, title: "방콕 여행", startDate: "2024-08-05", endDate: "2024-08-10" },
    ],
  },
  {
    id: "FR",
    name: "프랑스",
    status: "PLANNED",
    tripCount: 1,
    bucketCount: 0,
    recentTrips: [
      { id: 4, title: "파리 여행", startDate: "2025-09-20", endDate: "2025-09-27" },
    ],
  },
  {
    id: "CH",
    name: "스위스",
    status: "BUCKET",
    tripCount: 0,
    bucketCount: 1,
  },
  {
    id: "US",
    name: "미국",
    status: "NONE",
    tripCount: 0,
    bucketCount: 0,
  },
  {
    id: "IT",
    name: "이탈리아",
    status: "BUCKET",
    tripCount: 0,
    bucketCount: 1,
  },
];

export const demoDomesticData: RegionData[] = [
  {
    code: "KR-11",
    name: "서울특별시",
    status: "COMPLETED",
    tripCount: 2,
    bucketCount: 0,
    recentTrips: [
      { id: 5, title: "서울 나들이", startDate: "2024-01-10", endDate: "2024-01-12" },
    ],
  },
  {
    code: "KR-26",
    name: "부산광역시",
    status: "COMPLETED",
    tripCount: 1,
    bucketCount: 0,
    recentTrips: [
      { id: 6, title: "부산 여행", startDate: "2024-03-15", endDate: "2024-03-17" },
    ],
  },
  {
    code: "KR-49",
    name: "제주특별자치도",
    status: "PLANNED",
    tripCount: 0,
    bucketCount: 1,
  },
  {
    code: "KR-28",
    name: "인천광역시",
    status: "NONE",
    tripCount: 0,
    bucketCount: 0,
  },
];

export const demoStatsSummary: StatsSummary = {
  completedTrips: 6,
  plannedTrips: 2,
  travelDays: 32,
  visitedCountries: 2,
  visitedDomesticRegions: 2,
};
