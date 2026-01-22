import { redirect } from "next/navigation";
import { SUPPORT_REDIRECT_TARGET } from "@/lib/routes";

export default function SupportRedirect() {
  redirect(SUPPORT_REDIRECT_TARGET);
}
