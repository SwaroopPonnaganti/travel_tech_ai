import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="h-5 w-5" />}
      title="Lost in transit"
      description="This route does not exist in RoamAgent. Head back to your dashboard to continue."
      action={
        <Link to="/" className="btn-primary">
          Back to dashboard
        </Link>
      }
    />
  );
}
