"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HomeOverview } from "@/components/home/HomeOverview";
import { useAuth } from "@/lib/auth/context";
import {
  demoWorldData,
  demoDomesticData,
  demoStatsSummary,
} from "@/lib/home/demo-data";
import { Button } from "@/components/ui/button";

type MapView = "world" | "domestic";

export default function PublicHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [mapView, setMapView] = useState<MapView>("world");

  const handleTripClick = (tripId: number) => {
    if (user) {
      router.push(`/trips/${tripId}`);
    } else {
      router.push("/login");
    }
  };

  const handleStatsClick = () => {
    if (user) {
      router.push("/stats");
    } else {
      router.push("/login");
    }
  };

  const handleNewTripClick = () => {
    if (user) {
      router.push("/trips");
    } else {
      router.push("/signup");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 pb-12 pt-8">
      <HomeOverview
        worldData={demoWorldData}
        domesticData={demoDomesticData}
        statsSummary={demoStatsSummary}
        loading={false}
        error=""
        mapView={mapView}
        onMapViewChange={setMapView}
        onTripClick={handleTripClick}
        onStatsClick={handleStatsClick}
        onNewTripClick={handleNewTripClick}
        onRetry={() => {}}
      />

      <section className="mt-10 flex flex-col items-center gap-4">
        {user ? (
          <Link href="/dashboard">
            <Button size="lg">내 아카이브 보기</Button>
          </Link>
        ) : (
          <>
            <Link href="/signup">
              <Button size="lg">시작하기</Button>
            </Link>
            <p className="text-caption text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-medium text-coral-500 hover:text-coral-600"
              >
                로그인
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
