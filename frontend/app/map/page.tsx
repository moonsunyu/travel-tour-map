// app/map/page.tsx
'use client';
import { useEffect, useState } from 'react';
import KakaoMap from '@/components/KakaoMap';
import { supabase } from '@/lib/supabase';

type Spot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  ageGroup: string[];
};

export default function MapPage() {
  const [region, setRegion] = useState<'강원' | '여수'>('강원');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpots() {
      setLoading(true);
      const { data, error } = await supabase
        .from('T_GANGWON_POPULAR_SPOT')          // ← 실제 테이블명으로 수정
        .select('*')
        .eq('REGION', region);

      if (error) {
        console.error('데이터 조회 실패:', error);
        setSpots([]);
      } else {
        const mapped = data.map((row) => ({
          id: row.SPOT_ID,
          name: row.SPOT_NAME,
          lat: row.LAT,
          lng: row.LNG,
          category: row.CATEGORY,
          ageGroup: row.AGE_GROUP,
        }));
        setSpots(mapped);
      }
      setLoading(false);
    }

    fetchSpots();
  }, [region]);

  return (
    <div className="relative w-screen h-screen">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
          불러오는 중...
        </div>
      )}

      {/* 지역 전환 버튼 (임시 테스트용) */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button onClick={() => setRegion('강원')} className="bg-white px-4 py-2 rounded-full shadow">강원</button>
        <button onClick={() => setRegion('여수')} className="bg-white px-4 py-2 rounded-full shadow">여수</button>
      </div>

      <KakaoMap spots={spots} region={region} />
    </div>
  );
}