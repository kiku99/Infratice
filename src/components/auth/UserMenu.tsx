"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function UserMenu() {
  const { user, solvedIds, signInWithGoogle, signOut, loading, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        로그인
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "사용자";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-emerald-500"
        aria-label="사용자 메뉴"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} width={32} height={32} className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-emerald-500 text-sm font-bold text-white">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* profile */}
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>

          {/* stats */}
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-500">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {solvedIds.size}
                </span>
                문제 완료
              </span>
            </div>
          </div>

          {/* profile link */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M16.555 5.412a8.028 8.028 0 0 0-3.503-2.81 14.899 14.899 0 0 1 1.663 4.472 8.547 8.547 0 0 0 1.84-1.662ZM13.326 7.825a13.43 13.43 0 0 0-2.413-5.773 8.087 8.087 0 0 0-1.826 0 13.43 13.43 0 0 0-2.413 5.773A8.473 8.473 0 0 0 10 8.5c1.18 0 2.304-.24 3.326-.675ZM6.514 9.376A9.98 9.98 0 0 0 10 10c1.226 0 2.4-.22 3.486-.624a13.54 13.54 0 0 1 .351 3.759 13.54 13.54 0 0 1-7.674 0 13.538 13.538 0 0 1 .351-3.759ZM5.285 7.074a14.9 14.9 0 0 1 1.663-4.471 8.028 8.028 0 0 0-3.503 2.81c.529.638 1.149 1.199 1.84 1.66ZM17.334 6.798a7.973 7.973 0 0 1 .614 4.115 13.47 13.47 0 0 1-3.178 1.72 15.093 15.093 0 0 0-.174-3.939 10.043 10.043 0 0 0 2.738-1.896ZM2.666 6.798a10.042 10.042 0 0 0 2.738 1.896 15.097 15.097 0 0 0-.174 3.94 13.472 13.472 0 0 1-3.178-1.72 7.973 7.973 0 0 1 .614-4.116ZM4.309 14.588a15.088 15.088 0 0 0 5.691 1.91 15.088 15.088 0 0 0 5.691-1.91 7.996 7.996 0 0 1-11.382 0Z" />
            </svg>
            내 풀이 현황
          </Link>

          {isAdmin && (
            <Link
              href="/admin/notices"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 2.5a.75.75 0 0 0-1.5 0v1.024a6.752 6.752 0 0 0-4.219 2.337l-.724-.724a.75.75 0 1 0-1.06 1.06l.724.724A6.752 6.752 0 0 0 3.024 9.25H2a.75.75 0 0 0 0 1.5h1.024a6.752 6.752 0 0 0 2.337 4.219l-.724.724a.75.75 0 1 0 1.06 1.06l.724-.724a6.752 6.752 0 0 0 4.219 2.337V18a.75.75 0 0 0 1.5 0v-1.024a6.752 6.752 0 0 0 4.219-2.337l.724.724a.75.75 0 0 0 1.06-1.06l-.724-.724a6.752 6.752 0 0 0 2.337-4.219H18a.75.75 0 0 0 0-1.5h-1.024a6.752 6.752 0 0 0-2.337-4.219l.724-.724a.75.75 0 0 0-1.06-1.06l-.724.724A6.752 6.752 0 0 0 10.75 3.524V2.5Z" />
                <path d="M9 7.25A1.75 1.75 0 0 1 10.75 5.5h1a1.75 1.75 0 1 1 0 3.5h-1A1.75 1.75 0 0 1 9 7.25Zm1.75-.25a.25.25 0 0 0 0 .5h1a.25.25 0 1 0 0-.5h-1ZM7.75 11a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 7.75 11Zm2.25 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 11Zm3 .75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5Z" />
              </svg>
              공지 관리
            </Link>
          )}

          {/* logout */}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.047a.75.75 0 1 0-1.06-1.06l-2.25 2.25a.75.75 0 0 0 0 1.06l2.25 2.25a.75.75 0 1 0 1.06-1.06L8.704 10.75H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
            </svg>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
