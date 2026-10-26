import { redirect } from "next/navigation";
import { getStaffUser } from "../auth";
import Login from "./login";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await getStaffUser()) redirect("/");
  return <Login />;
}
