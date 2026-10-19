import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard";
import "./admin.css";

export const metadata: Metadata = { title: "Administration — Alfred", robots: { index: false, follow: false } };

export default function AdminPage() { return <AdminDashboard />; }
