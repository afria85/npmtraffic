import Image from "next/image";

export type BrandMarkVariant = "ui" | "solid";

export interface BrandMarkProps {
  className?: string;
  variant?: BrandMarkVariant;
}

function BrandMark({ className = "h-6 w-6", variant = "ui" }: BrandMarkProps) {
  // Kalau nanti kamu punya dua file icon (mis. /icon.png dan /icon-solid.png),
  // tinggal ganti mapping ini.
  const src = variant === "solid" ? "/icon.png" : "/icon.png";

  return (
    <span className={`${className} relative inline-block`}>
      <Image
        src={src}
        alt="npmtraffic"
        fill
        sizes="24px"
        priority
        className="object-contain"
      />
    </span>
  );
}

export default BrandMark;
export { BrandMark };
