"use client";

import {
  AlertTriangle,
  Bookmark,
  Camera,
  Check,
  Edit2,
  Landmark,
  Lock,
  LogOut,
  Star,
  Utensils,
  BedDouble,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBookmark } from "@/context/BookmarkContext";
import { DEFAULT_PROFILE_IMAGE, validateNickname, validatePassword } from "@/lib/authClient";

export const MyPage: React.FC = () => {
  const router = useRouter();
  const {
    user,
    isLoading,
    logout,
    updateNickname,
    changePassword,
    uploadProfileImage,
    deleteAccount,
    checkNicknameAvailability,
    openTermsDetail,
  } = useAuth();
  const { bookmarks, bookmarksLoading, removeBookmark } = useBookmark();

  const CATEGORY_ICON: Record<string, typeof Utensils> = {
    음식점: Utensils,
    관광명소: Landmark,
    숙박: BedDouble,
  };

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || "");
  const [nicknameMsg, setNicknameMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isCheckingNick, setIsCheckingNick] = useState(false);
  const [isSavingNick, setIsSavingNick] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // 로그인 상태 확인 전(초기 GET /api/profile 응답 대기 중)엔 "로그인 필요" 화면이
  // 잠깐 깜빡이지 않도록 아무것도 표시하지 않는다.
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto my-16 flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-slate-600 font-medium mb-4">로그인이 필요한 페이지입니다.</p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const handleCheckNicknameAvail = async () => {
    if (!newNickname.trim()) return;
    const formatCheck = validateNickname(newNickname.trim());
    if (!formatCheck.valid) {
      setNicknameMsg({ text: formatCheck.message!, isError: true });
      return;
    }

    setIsCheckingNick(true);
    setNicknameMsg(null);
    try {
      const res = await checkNicknameAvailability(newNickname.trim());
      setNicknameMsg({ text: res.message, isError: !res.available });
    } catch {
      setNicknameMsg({ text: "중복 확인 실패", isError: true });
    } finally {
      setIsCheckingNick(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) return;
    setIsSavingNick(true);
    setNicknameMsg(null);
    try {
      const res = await updateNickname(newNickname.trim());
      if (res.success) {
        setIsEditingNickname(false);
      } else {
        setNicknameMsg({ text: res.message, isError: true });
      }
    } catch {
      setNicknameMsg({ text: "닉네임 변경에 실패했습니다.", isError: true });
    } finally {
      setIsSavingNick(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageMsg("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setIsUploadingImage(true);
    setImageMsg(null);
    try {
      const res = await uploadProfileImage(file);
      if (res.success) {
        setImageMsg("프로필 이미지가 변경되었습니다.");
        setTimeout(() => setImageMsg(null), 3000);
      } else {
        setImageMsg(res.message);
      }
    } catch {
      setImageMsg("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== newPasswordConfirm) {
      setPasswordError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const val = validatePassword(newPassword);
    if (!val.valid) {
      setPasswordError(val.message!);
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });

      if (res.success) {
        setPasswordSuccess(true);
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setNewPasswordConfirm("");
        }, 1500);
      } else {
        setPasswordError(res.message);
      }
    } catch {
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "탈퇴합니다") return;
    setIsDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        setShowDeleteModal(false);
        router.push("/");
      }
    } catch {
      alert("회원탈퇴 처리 중 문제가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const avatarUrl = user.profileImageUrl || DEFAULT_PROFILE_IMAGE;

  return (
    <div id="mypage-view" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt={user.nickname}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_PROFILE_IMAGE;
                  }}
                />
              </div>
              <button
                id="avatar-upload-trigger"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                title="프로필 사진 변경 (JPG, PNG, WEBP, 5MB 이하)"
                className="absolute inset-0 bg-slate-900/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-2xs"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">사진 변경</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                {!isEditingNickname ? (
                  <>
                    <h1 id="user-nickname-display" className="text-xl sm:text-2xl font-bold text-slate-900">
                      {user.nickname}
                    </h1>
                    <button
                      id="edit-nickname-btn"
                      type="button"
                      onClick={() => {
                        setNewNickname(user.nickname);
                        setIsEditingNickname(true);
                        setNicknameMsg(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="닉네임 변경"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      id="edit-nickname-input"
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="text-lg font-bold border border-sky-400 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={handleCheckNicknameAvail}
                      disabled={isCheckingNick}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                    >
                      {isCheckingNick ? "확인 중" : "중복확인"}
                    </button>
                    <button
                      id="save-nickname-btn"
                      type="button"
                      onClick={handleSaveNickname}
                      disabled={isSavingNick}
                      className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg cursor-pointer"
                      title="저장"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingNickname(false);
                        setNicknameMsg(null);
                      }}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer"
                      title="취소"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {nicknameMsg && (
                <p className={`text-xs font-medium ${nicknameMsg.isError ? "text-rose-600" : "text-emerald-600"}`}>
                  {nicknameMsg.text}
                </p>
              )}

              {imageMsg && <p className="text-xs font-medium text-sky-600 animate-in fade-in">{imageMsg}</p>}

              <p className="text-xs sm:text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <button
              id="mypage-logout-btn"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-500" />
              <span>북마크한 장소</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">{bookmarks.length}곳</span>
          </div>

          {bookmarksLoading ? (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              아직 북마크한 장소가 없어요. 지도에서 마음에 드는 장소를 저장해보세요.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {bookmarks.map((bookmark) => {
                const Icon = CATEGORY_ICON[bookmark.category ?? ""] ?? Landmark;
                return (
                  <div
                    key={bookmark.spotId}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-500">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{bookmark.spotName}</p>
                      <p className="text-xs text-slate-500">
                        {bookmark.region} · {bookmark.category ?? "장소"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBookmark(bookmark.spotId)}
                      className="p-1.5 text-amber-400 hover:text-slate-400 rounded-full cursor-pointer shrink-0"
                      title="북마크 해제"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>보안 및 비밀번호 관리</span>
            </h3>
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              안전
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            소중한 혼여행 기록과 개인정보를 안전하게 보호하기 위해 주기적으로 비밀번호를 변경해 주세요.
          </p>
          <button
            id="open-password-change-btn"
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-slate-600" />
            <span>비밀번호 변경하기</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">서비스 약관 동의 내역</h3>
            <p className="text-xs text-slate-500">
              회원가입 시 동의하신 홀로트립 약관 내역입니다. 언제든지 전문을 확인하실 수 있습니다.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold">
                    필수
                  </span>
                  <span className="text-sm font-bold text-slate-800">홀로트립 서비스 이용약관 (TOS)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openTermsDetail("TOS")}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer"
              >
                전문보기
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold">
                    필수
                  </span>
                  <span className="text-sm font-bold text-slate-800">개인정보 수집 및 이용 동의 (PRIVACY)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openTermsDetail("PRIVACY")}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer"
              >
                전문보기
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    선택
                  </span>
                  <span className="text-sm font-bold text-slate-800">위치기반 서비스 이용약관 (LBS)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openTermsDetail("LBS")}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer"
              >
                전문보기
              </button>
            </div>
          </div>
        </div>

        <div className="bg-rose-50/40 rounded-2xl p-6 border border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>회원 탈퇴</span>
            </h4>
            <p className="text-xs text-rose-700/80 leading-relaxed">
              탈퇴 시 프로필 이미지, 저장된 설정이 즉시 파기되며 되돌릴 수 없습니다.
            </p>
          </div>
          <button
            id="open-delete-account-btn"
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
          >
            회원 탈퇴하기
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          id="password-change-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            id="password-change-card"
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">비밀번호 변경</h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>비밀번호가 성공적으로 변경되었습니다!</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">현재 비밀번호</label>
                <input
                  id="current-password-input"
                  type="password"
                  placeholder="현재 비밀번호 입력"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">새 비밀번호 (영문+숫자+특수문자 8자 이상)</label>
                <input
                  id="new-password-input"
                  type="password"
                  placeholder="새 비밀번호 입력"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">새 비밀번호 확인</label>
                <input
                  id="new-password-confirm-input"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium cursor-pointer"
                >
                  취소
                </button>
                <button
                  id="submit-password-change-btn"
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPassword ? "변경 중..." : "변경 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          id="delete-account-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            id="delete-account-card"
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">홀로트립 회원 탈퇴</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed bg-rose-50/70 p-4 rounded-xl border border-rose-100">
              <ul className="list-disc pl-4 space-y-1">
                <li>프로필 사진(Storage) 및 개인정보가 완전히 파기됩니다.</li>
                <li>소셜 로그인 연동 정보 또한 즉시 해제됩니다.</li>
                <li>탈퇴 후에는 복구할 수 없습니다.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                확인을 위해 아래 입력창에 <strong className="text-rose-600 font-bold">탈퇴합니다</strong>를 정확히
                입력해주세요.
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                placeholder="탈퇴합니다"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium cursor-pointer"
              >
                취소
              </button>
              <button
                id="confirm-delete-account-btn"
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "탈퇴합니다" || isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? "탈퇴 처리 중..." : "탈퇴 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
