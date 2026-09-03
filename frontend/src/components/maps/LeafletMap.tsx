"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMarkerIcon, formatPopupContent, type MarkerData } from "./MapMarker";
import { cn } from "@/lib/utils";

/**
 * LeafletMap 컴포넌트에 전달되는 props 타입입니다.
 *
 * center?: [number, number] 에서 대괄호 튜플은
 * "정확히 두 개의 숫자만 들어가는 배열"이라는 뜻입니다.
 */
interface LeafletMapProps {
  markers: MarkerData[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  // marker 전체 객체를 넘겨받는 callback 함수 타입입니다.
  onMarkerClick?: (marker: MarkerData) => void;
}

/**
 * Leaflet 지도를 생성하고 마커를 갱신하는 컴포넌트입니다.
 */
export function LeafletMap({
  markers,
  center = [36.5, 127.5],
  zoom = 7,
  className,
  onMarkerClick,
}: LeafletMapProps) {
  // useRef<HTMLDivElement>(null) 처럼 제네릭을 넣으면 ref.current가 어떤 DOM인지 알 수 있습니다.
  const containerRef = useRef<HTMLDivElement>(null);
  // L.Map | null 은 Leaflet 지도 인스턴스가 아직 없을 수도 있음을 뜻합니다.
  const mapRef = useRef<L.Map | null>(null);
  // L.LayerGroup | null 도 같은 방식으로 초기 미생성 상태를 허용합니다.
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // L.map(...) 은 Leaflet의 생성 함수입니다.
    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      // cleanup 함수: 컴포넌트가 사라질 때 Leaflet 인스턴스를 정리합니다.
      map.remove();
      mapRef.current = null;
    };
    // The map is initialized once; the effect below applies center/zoom updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // LatLngBounds는 지도 범위를 계산하는 Leaflet 타입입니다.
    const bounds: L.LatLngBounds = L.latLngBounds([]);

    markers.forEach((marker) => {
      const icon = getMarkerIcon(marker.status);
      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
        .bindPopup(formatPopupContent(marker), {
          maxWidth: 250,
          className: "custom-popup",
        });

      if (onMarkerClick) {
        leafletMarker.on("click", () => onMarkerClick(marker));
      }

      leafletMarker.addTo(layer);
      bounds.extend([marker.latitude, marker.longitude]);
    });

    if (markers.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers, onMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(center, zoom);
  }, [center, zoom]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full rounded-xl", className)}
      style={{ minHeight: "300px" }}
    />
  );
}
