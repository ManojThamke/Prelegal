"use client";

import AuthForm from "@/components/AuthForm";
import GuestPage from "@/components/GuestPage";

export default function SignUpPage() {
  return (
    <GuestPage title="Create your account">
      <AuthForm mode="signup" />
    </GuestPage>
  );
}
