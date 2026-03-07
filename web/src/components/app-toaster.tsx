"use client";

import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export default function AppToaster() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      richColors
      position={mobile ? "top-center" : "top-right"}
      mobileOffset={{ top: 12, left: 8, right: 8 }}
      toastOptions={{
        className: mobile ? "!w-[calc(100vw-16px)] !max-w-[420px]" : undefined
      }}
    />
  );
}
