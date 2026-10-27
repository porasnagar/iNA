import airpodsPro from "@/assets/airpods-pro.png";
import airpods4 from "@/assets/airpods-4.png";
import airpodsMax from "@/assets/airpods-max.png";
import beatsFitPro from "@/assets/beats-fit-pro.png";
import appleWatch from "@/assets/apple-watch.png";
import airtag from "@/assets/airtag.png";
import homepod from "@/assets/homepod.png";
import type { ProductImageKey } from "@/lib/ina/protocol";
import { cn } from "@/lib/utils";

export const PRODUCT_IMAGES: Record<ProductImageKey, string> = {
  "airpods-pro": airpodsPro,
  "airpods-4": airpods4,
  "airpods-max": airpodsMax,
  "beats-fit-pro": beatsFitPro,
  "apple-watch": appleWatch,
  airtag,
  homepod,
};

/** Android drawable-nodpi resource names used by the native project. */
export const PRODUCT_RES_NAMES: Record<ProductImageKey, string> = {
  "airpods-pro": "product_airpods_pro",
  "airpods-4": "product_airpods_4",
  "airpods-max": "product_airpods_max",
  "beats-fit-pro": "product_beats_fit_pro",
  "apple-watch": "product_apple_watch",
  airtag: "product_airtag",
  homepod: "product_homepod",
};

export function ProductImage({
  product,
  alt,
  className,
  eager,
}: {
  product: ProductImageKey;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={PRODUCT_IMAGES[product]}
      alt={alt}
      width={640}
      height={640}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className={cn("select-none object-contain drop-shadow-[0_18px_30px_oklch(0_0_0/0.55)]", className)}
    />
  );
}
