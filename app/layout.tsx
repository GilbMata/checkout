import CookieConsent from "@/components/CookieConsent";
import Header from "@/components/HeaderComp";
import { getSession } from "@/lib/auth/session";
import { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { Toaster } from "sonner";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "Station 24 checkout",
  description: "Gimnasio Station 24 - Únete hoy",
  icons: {
    icon: "/favicon.ico",
  },
};

// import { Toaster } from "sonner";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "400", "700"], // Specify weights
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="es">
      <body className={`${montserrat.className} bg-black  text-white`}>
        <Header session={session as any} />
        {children}
        <CookieConsent />

        <Toaster
          position="bottom-center"
          expand
          closeButton
          toastOptions={{
            className:
              "!border !border-orange-500 bg-zinc-900 text-white rounded-xl shadow-lg backdrop-blur-md bg-gray",
            style: {
              zIndex: 9999,
              background: "#18181b", // zinc-900
              color: "white",
              border: "1px solid #f97316", // orange-500
            },
          }}
        />
      </body>
    </html>
  );
}
