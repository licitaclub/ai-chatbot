import NextAuth from "next-auth";

import { authConfig } from "@/app/(auth)/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/",
    "/:id",
    "/api/((?!auth/).*)",  // all /api/* except /api/auth/*
    "/login",
    "/register",
  ],
};
