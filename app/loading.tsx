import { AppState } from "@/components/app-state";

export default function Loading() {
  return (
    <AppState
      eyebrow="Following the current"
      title="Loading public evidence…"
      message="Atlantys is resolving the latest public registry state."
    />
  );
}
