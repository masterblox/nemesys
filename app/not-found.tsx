import { AppState } from "@/components/app-state";

export default function NotFound() {
  return (
    <AppState
      eyebrow="No public transmission"
      title="Nothing surfaced here."
      message="The requested public skill, repository, creator, or share card does not exist."
    />
  );
}
