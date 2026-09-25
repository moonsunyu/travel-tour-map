// app/api/bookmarks/[spotId]/route.ts
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ spotId: string }> }) {
    const user = await getAuthedUser();
    if (!user) return apiError("로그인이 필요합니다.", 401);

    const { spotId } = await params;

    const supabase = await createClient();
    const { error } = await supabase
        .from("T_USER_BOOKMARK")
        .delete()
        .eq('"USER_ID"', user.id)
        .eq('"SPOT_ID"', spotId);

    if (error) return apiError(error.message, 500);

    return apiSuccess(null, "북마크를 삭제했습니다.");
}