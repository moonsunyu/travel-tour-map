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
};

const REGION_DB_VALUE: Record<'강원' | '여수', string> = {
  강원: '강원도',
  여수: '여수',
};

export default function MapPage() {
  const [region, setRegion] = useState<'강원' | '여수'>('강원');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpots() {
      setLoading(true);
      const { data, error } = await supabase
        .from('T_GANGWON_POPULAR_SPOT')
        .select('SPOT_ID, SPOT_NAME, LATITUDE, LONGITUDE, CATEGORY')
        .eq('REGION', REGION_DB_VALUE[region])
        .not('LATITUDE', 'is', null);

      if (error) {
        console.error('데이터 조회 실패:', error);
        setSpots([]);
        setLoading(false);
        return;
      }

      // SPOT_ID 기준으로 중복 제거 (같은 장소가 연령대별로 여러 행 존재하므로 첫 번째 것만 채택)
      const uniqueMap = new Map<string, Spot>();
      data.forEach((row) => {
        if (!uniqueMap.has(row.SPOT_ID)) {
          uniqueMap.set(row.SPOT_ID, {
            id: row.SPOT_ID,
            name: row.SPOT_NAME,
            lat: row.LATITUDE,
            lng: row.LONGITUDE,
            category: row.CATEGORY,
          });
        }
      });

      setSpots(Array.from(uniqueMap.values()));
      console.log('불러온 spots 개수:', uniqueMap.size);
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

      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button onClick={() => setRegion('강원')} className="bg-white px-4 py-2 rounded-full shadow">강원</button>
        <button onClick={() => setRegion('여수')} className="bg-white px-4 py-2 rounded-full shadow">여수</button>
      </div>

      <KakaoMap spots={spots} region={region} />
    </div>
  );
}