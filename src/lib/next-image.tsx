import React from "react";

// Default export: the Image component (matches `import Image from "next/image"`)
function Image({
  src,
  alt = "",
  className,
  width,
  height,
  fill,
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
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={fill ? { width: "100%", height: "100%", objectFit: "cover" } : undefined}
      {...props}
    />
  );
}

export default Image;
