import React from "react";
import { Link as RouterLink } from "react-router-dom";

// Default export: the Link component (matches `import Link from "next/link"`)
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }
>(({ href, children, prefetch, ...props }, ref) => {
  return (
    <RouterLink ref={ref} to={href} {...props}>
      {children}
    </RouterLink>
  );
});

Link.displayName = "Link";

export default Link;
