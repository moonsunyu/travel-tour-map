// lib/bookmarkClient.ts
import { request } from "@/lib/authClient";
import { AddBookmarkRequest, BookmarkItem } from "@/lib/types";

class BookmarkClient {
    list() {
        return request<BookmarkItem[]>("/api/bookmarks");
    }

    add(payload: AddBookmarkRequest) {
        return request<null>("/api/bookmarks", { method: "POST", body: JSON.stringify(payload) });
    }

    remove(spotId: string) {
        return request<null>(`/api/bookmarks/${encodeURIComponent(spotId)}`, { method: "DELETE" });
    }
}

export const bookmarkClient = new BookmarkClient();