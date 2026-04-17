"use server";

import { destroySession } from "@/lib/auth/session";
import { refresh } from "next/cache";

export async function logoutAction() {
  await destroySession();
  refresh;
  // redirect("https://station24.com.mx");
}
