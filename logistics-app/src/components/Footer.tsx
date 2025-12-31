"use client";

import { useI18n } from "@/lib/i18n";

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/10 bg-[#0f172a]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-white/70 md:flex-row">
        <span>{t("footer.rights")}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-white/40">
          {t("footer.premium")}
        </span>
      </div>
    </footer>
  );
};

export default Footer;
