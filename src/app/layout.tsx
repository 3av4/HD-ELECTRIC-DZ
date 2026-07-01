import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { EMAIL, LOGO_URL, PHONE } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hdelectricdz.com"),
  title: {
    default: "HD ELECTRIC DZ | متجر معدات كهربائية في الجزائر",
    template: "%s | HD ELECTRIC DZ",
  },
  description: "متجر إلكتروني Premium لبيع المعدات واللوازم الكهربائية في الجزائر: قواطع، كابلات، إضاءة LED، لوحات، مفاتيح، وأدوات قياس.",
  keywords: ["HD ELECTRIC DZ", "معدات كهربائية الجزائر", "قواطع كهربائية", "كابلات", "إضاءة LED", "متجر كهرباء الجزائر"],
  authors: [{ name: "HD ELECTRIC DZ" }],
  creator: "HD ELECTRIC DZ",
  openGraph: {
    title: "HD ELECTRIC DZ | كل ما تحتاجه من المعدات الكهربائية في مكان واحد",
    description: "تجربة شراء احترافية وسريعة للمعدات الكهربائية في الجزائر.",
    type: "website",
    locale: "ar_DZ",
    images: [{ url: LOGO_URL, width: 512, height: 512, alt: "HD ELECTRIC DZ" }],
    emails: [EMAIL],
    phoneNumbers: [PHONE],
  },
  twitter: {
    card: "summary_large_image",
    title: "HD ELECTRIC DZ",
    description: "متجر معدات ولوازم كهربائية في الجزائر.",
    images: [LOGO_URL],
  },
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0A0A",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar-DZ" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
