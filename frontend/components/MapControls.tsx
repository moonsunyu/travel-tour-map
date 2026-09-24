// components/MapControls.tsx
"use client";

import { useSearchSidebar } from "@/context/SearchSidebarContext";
import { PlaceRegion } from "@/lib/places";

const OPTIONS: { label: string; value: PlaceRegion | null }[] = [
    { label: "전체", value: null },
    { label: "강원도", value: "강원도" },
    { label: "여수", value: "여수" },
];

export default function MapControls() {
    const { selectedRegion, setSelectedRegion } = useSearchSidebar();

    return (
        <div className="absolute top-20 right-4 z-50 flex gap-1 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-1">
            {OPTIONS.map((opt) => (
                <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedRegion(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${selectedRegion === opt.value ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}