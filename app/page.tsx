import Studio from "./studio";
import { requireStaff } from "./auth";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireStaff();
  return (
    <Studio
      displayName={user.displayName}
      role={user.role}
      staffId={user.id}
      email={user.email}
    />
  );
}
