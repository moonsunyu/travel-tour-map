'use client';
import { useEffect, useRef, useState } from 'react';

type Spot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  ageGroup: string[];
};

export default function KakaoMap({ spots, region }: { spots: Spot[]; region: '강원' | '여수' }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);

  // 핵심 추가: 지도가 실제로 준비됐는지 React가 알 수 있는 상태
  const [mapReady, setMapReady] = useState(false);

  const REGION_CENTER = {
    강원: { lat: 37.8228, lng: 128.1555 },
    여수: { lat: 34.7604, lng: 127.6622 },
  };

  useEffect(() => {
    if (!window.kakao || !mapRef.current) return;

    window.kakao.maps.load(() => {
      const center = REGION_CENTER[region];
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: 7, // 초기값. 마커 있으면 어차피 setBounds가 덮어씀
      });
      mapInstance.current = map;
      clustererRef.current = new window.kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 6,
      });

      setMapReady(true); // 여기서 "이제 지도 준비됐다"고 React에 알려줌
    });
  }, [region]);

  useEffect(() => {
    // mapReady가 false면(아직 지도 안 만들어졌으면) 그냥 대기
    if (!mapReady || !mapInstance.current || !window.kakao || spots.length === 0) return;

    clustererRef.current.clear();
    markersRef.current = [];

    const newMarkers = spots.map((spot) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
        title: spot.name,
      });
      return marker;
    });

    markersRef.current = newMarkers;
    clustererRef.current.addMarkers(newMarkers);

    const bounds = new window.kakao.maps.LatLngBounds();
    spots.forEach((spot) => {
      bounds.extend(new window.kakao.maps.LatLng(spot.lat, spot.lng));
    });
    mapInstance.current.setBounds(bounds);
  }, [spots, mapReady]); // ← mapReady를 의존성에 추가한 게 핵심

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}