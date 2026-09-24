// app/api/bookmarks/route.ts
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const user = await getAuthedUser();
    if (!user) return apiError("로그인이 필요합니다.", 401);

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("T_USER_BOOKMARK")
        .select('"SPOT_ID","SPOT_NAME","CATEGORY","REGION"')
        .eq('"USER_ID"', user.id)
        .order('"CREATED_ON"', { ascending: false });

    if (error) return apiError(error.message, 500);

    const bookmarks = (data ?? []).map((row: any) => ({
        spotId: row.SPOT_ID,
        spotName: row.SPOT_NAME,
        category: row.CATEGORY,
        region: row.REGION,
    }));

    return apiSuccess(bookmarks, "북마크 목록을 조회했습니다.");
}

export async function POST(request: NextRequest) {
    const user = await getAuthedUser();
    if (!user) return apiError("로그인이 필요합니다.", 401);

    const body = await request.json();
    const { spotId, spotName, category, region } = body ?? {};

    if (!spotId || !spotName || !region) {
        return apiError("필수 정보가 누락되었습니다.", 400);
    }

    const supabase = await createClient();
    const { error } = await supabase.from("T_USER_BOOKMARK").insert({
        USER_ID: user.id,
        SPOT_ID: spotId,
        SPOT_NAME: spotName,
        CATEGORY: category ?? null,
        REGION: region,
    });

    if (error) {
        // UNQ_T_USER_BOOKMARK(USER_ID, SPOT_ID) 위반 = 이미 북마크된 경우. 에러로 취급 안 하고 그냥 성공 처리
        if (error.code === "23505") {
            return apiSuccess(null, "이미 북마크된 장소입니다.");
        }
        return apiError(error.message, 500);
    }

    return apiSuccess(null, "북마크에 추가했습니다.");
}