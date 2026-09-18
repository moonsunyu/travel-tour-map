import { NextResponse } from "next/server";

// 표준 JSON 응답 규격 { success, data, message } (backend-service-architecture §1)
export function apiSuccess<T>(data: T, message: string) {
  return NextResponse.json({ success: true, data, message });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, message }, { status });
}
