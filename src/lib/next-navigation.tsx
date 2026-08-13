import { useNavigate, useLocation } from "react-router-dom";

// Named exports (matches `import { useRouter, usePathname } from "next/navigation"`)

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function redirect(url: string) {
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
}

export enum RedirectType {
  push = "push",
  replace = "replace",
}

export function useSelectedLayoutSegments() {
  return [];
}

export function notFound() {
  return null;
}
