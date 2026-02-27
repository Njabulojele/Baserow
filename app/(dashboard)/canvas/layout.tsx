export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-40 bg-[#0f0f11]">{children}</div>;
}
