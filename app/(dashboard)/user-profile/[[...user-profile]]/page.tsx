"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function UserProfilePage() {
  return (
    <div className="flex items-center justify-center py-10 w-full">
      <UserProfile
        routing="path"
        path="/user-profile"
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: "mx-auto w-full max-w-4xl shadow-none",
            card: "bg-background border border-border shadow-none w-full",
            navbar: "hidden md:flex",
            pageScrollBox: "p-4 sm:p-8",
          },
        }}
      />
    </div>
  );
}
