import React from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";

// Link Adapter for Next.js -> React Router
export const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }
>(({ href, children, prefetch, ...props }, ref) => {
  return (
    <RouterLink ref={ref} to={href} {...props}>
      {children}
    </RouterLink>
  );
});

Link.displayName = "LinkAdapter";

// useRouter Adapter for Next.js -> React Router
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

// usePathname Adapter for Next.js -> React Router
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

// Image Adapter for Next.js -> standard img tag
export function Image({
  src,
  alt = "",
  className,
  width,
  height,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  src: any;
  alt?: string;
  fill?: boolean;
}) {
  const imageSrc = typeof src === "object" && src?.src ? src.src : src;
  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...props}
    />
  );
}

export default {
  Link,
  useRouter,
  usePathname,
  redirect,
  RedirectType,
  useSelectedLayoutSegments,
  notFound,
  Image,
};
