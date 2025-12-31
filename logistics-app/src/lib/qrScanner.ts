type Html5QrcodeLike = {
  start: (
    constraints: { facingMode: string },
    config: { fps: number; qrbox: number },
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (error: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

declare global {
  interface Window {
    Html5Qrcode?: new (elementId: string) => Html5QrcodeLike;
  }
}

let loaderPromise: Promise<void> | null = null;

export const loadQrScanner = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("QR scanner unavailable on server."));
  }

  if (window.Html5Qrcode) {
    return Promise.resolve();
  }

  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("html5-qrcode-script");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load scanner library."))
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "html5-qrcode-script";
      script.src = "https://unpkg.com/html5-qrcode@2.3.10/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load scanner library."));
      document.head.appendChild(script);
    });
  }

  return loaderPromise;
};

export const createQrScanner = async (elementId: string) => {
  await loadQrScanner();
  if (!window.Html5Qrcode) {
    throw new Error("Scanner library not available.");
  }
  return new window.Html5Qrcode(elementId);
};
