import type { Metadata } from "next";
import NoticeAdminPage from "@/components/admin/NoticeAdminPage";

export const metadata: Metadata = {
  title: "공지 관리 | Infratice",
  description: "Infratice 공지를 작성하고 관리하는 관리자 페이지",
};

export default function AdminNoticesPage() {
  return <NoticeAdminPage />;
}
