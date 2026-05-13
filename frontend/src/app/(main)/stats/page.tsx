"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireAuth } from "@/lib/auth/hooks";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Loader2, BarChart3, MapPin, Calendar, Plane, AlertCircle, MapPinned } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
// `import type`는 실행 시 코드가 아니라 타입 정보만 가져오는 TypeScript 문법입니다.
import type { StatsSummary, MonthlyCount, TopRegion } from "@/types/travel";
import { SCOPE_LABEL } from "@/types/travel";

// `as const`는 배열/객체를 "읽기 전용 + 리터럴 타입 유지"로 고정합니다.
// 그래서 `key` 값이 그냥 string이 아니라 정확한 문자열 리터럴 타입이 되어,
// 아래에서 `summary[key]`처럼 타입 안전한 인덱싱이 가능해집니다.
const SUMMARY_CARDS = [
  { key: "completedTrips" as const, label: "완료 여행", icon: Plane, color: "text-teal-600", bg: "bg-teal-50" },
  { key: "plannedTrips" as const, label: "계획 중 여행", icon: Calendar, color: "text-coral-600", bg: "bg-coral-50" },
  { key: "travelDays" as const, label: "여행 일수", icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50" },
  { key: "visitedCountries" as const, label: "방문 국가", icon: MapPin, color: "text-sand-400", bg: "bg-sand-50" },
  { key: "visitedDomesticRegions" as const, label: "방문 국내 지역", icon: MapPinned, color: "text-teal-500", bg: "bg-teal-50" },
] as const;

function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split("-");
  const month = parseInt(parts[1], 10);
  return `${month}월`;
}

/**
 * 여행 통계 화면 컴포넌트입니다.
 *
 * 이 컴포넌트는 서버에서 받아온 통계 데이터를 배열/객체 상태로 관리합니다.
 * 타입 주석이 많지만, 실제 동작은 일반 JavaScript와 같고
 * TypeScript는 "이 값이 어떤 모양인지"를 미리 검사해 줍니다.
 */
export default function StatsPage() {
  const { loading: authLoading } = useRequireAuth();

  // `StatsSummary | null` : 서버 데이터를 아직 못 받았을 때는 null입니다.
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  // 월별 통계는 여러 개가 들어오므로 배열 타입을 사용합니다.
  const [monthly, setMonthly] = useState<MonthlyCount[]>([]);
  // 인기 지역 목록도 배열 상태로 관리합니다.
  const [topRegions, setTopRegions] = useState<TopRegion[]>([]);
  // 로딩 상태는 true/false로만 표현하므로 boolean입니다.
  const [loading, setLoading] = useState(true);
  // 에러 메시지는 문자열로 저장합니다.
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, monthlyRes, regionsRes] = await Promise.all([
        // 제네릭 `<StatsSummary>`는 응답 data의 모양을 알려주는 타입 정보입니다.
        api.get<StatsSummary>("/statistics/summary"),
        // 월별 응답도 배열 형태라는 것을 TypeScript에게 알려줍니다.
        api.get<MonthlyCount[]>("/statistics/monthly"),
        // 인기 지역 응답도 배열 타입입니다.
        api.get<TopRegion[]>("/statistics/top-regions"),
      ]);
      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data);
      setTopRegions(regionsRes.data);
    } catch {
      setError("통계 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
    // `useCallback`은 fetchData 함수를 기억해서 불필요한 재생성을 줄입니다.
  }, []);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  if (authLoading) return null;

  const domesticRegions = topRegions.filter((r) => r.scope === "DOMESTIC");
  const internationalRegions = topRegions.filter((r) => r.scope === "INTERNATIONAL");
  const chartData = monthly.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month),
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="여행 통계"
        description="나의 여행 데이터 한눈에 보기"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-body text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {SUMMARY_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
              <Card key={key}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${color}`} />
                  </div>
                  <span className="text-micro text-muted-foreground">{label}</span>
                  <span className="text-title-lg font-bold tracking-tight">
                    {summary ? summary[key].toLocaleString() : 0}
                    {key === "travelDays" && <span className="text-caption font-normal text-muted-foreground ml-0.5">일</span>}
                  </span>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Monthly Bar Chart */}
          <section>
            <h2 className="text-title font-semibold mb-4">월별 여행 횟수</h2>
            <Card>
              <CardContent className="p-4 md:p-6">
                {chartData.length === 0 ? (
                  <EmptyState
                    title="아직 여행 기록이 없습니다"
                    description="여행을 기록하면 월별 통계가 여기에 표시됩니다"
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "var(--shadow-soft, 0 2px 8px -2px rgba(0,0,0,0.06))",
                          fontSize: "13px",
                        }}
                        formatter={(value) => [`${value}회`, "여행"]}
                        labelFormatter={(label) => String(label)}
                      />
                      <Bar
                        dataKey="count"
                        fill="#FF6B54"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top Regions */}
          <section>
            <h2 className="text-title font-semibold mb-4">인기 여행지 TOP 5</h2>
            {topRegions.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    title="아직 기록된 여행지가 없습니다"
                    description="여행을 기록하면 인기 여행지가 여기에 표시됩니다"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {domesticRegions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-body font-semibold">국내</CardTitle>
                        <Badge variant="tealSoft">{domesticRegions.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2.5">
                        {domesticRegions.map((region, idx) => (
                          <div key={region.name} className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-micro font-bold text-teal-700">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-body">{region.name}</span>
                            <Badge variant="muted">{region.count}회</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {internationalRegions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-body font-semibold">해외</CardTitle>
                        <Badge variant="soft">{internationalRegions.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2.5">
                        {internationalRegions.map((region, idx) => (
                          <div key={region.name} className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral-100 text-micro font-bold text-coral-600">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-body">{region.name}</span>
                            <Badge variant="muted">{region.count}회</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
