"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check for user data (works with both localStorage tokens and httpOnly cookies)
    const user = localStorage.getItem("user");

    if (!user) {
      router.push("/login");
    } else {
      router.push("/calendar");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
