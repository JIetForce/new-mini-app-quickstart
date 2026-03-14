import Image from "next/image";

interface PayLinkLogoMarkProps {
  className?: string;
  size?: number;
}

export function PayLinkLogoMark({
  className,
  size = 40,
}: PayLinkLogoMarkProps) {
  return (
    <Image
      alt="Pay Link logo"
      className={className}
      height={size}
      priority
      src="/logo-monogram.svg"
      width={size}
    />
  );
}
