import { Suspense } from "react";
import { Shell } from "@/components/shell/shell";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
