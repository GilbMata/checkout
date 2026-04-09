import Header from "@/components/HeaderComp";
import { Toaster } from "@/components/ui/sonner";
import { Montserrat, Poppins } from "next/font/google";
// @ts-ignore
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${montserrat.className} bg-black  text-white  backdrop-blur-md`}
      >
        <Header />
        {children}

        <Toaster
          position="top-center"
          expand
          closeButton
          toastOptions={{
            className:
              "!border !border-orange-500 bg-zinc-900 text-white rounded-xl shadow-lg backdrop-blur-md",
          }}
        />
      </body>
    </html>
  );
}
