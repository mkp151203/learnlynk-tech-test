import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/today");
  }, [router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Redirecting to dashboard...</p>
    </div>
  );
}
