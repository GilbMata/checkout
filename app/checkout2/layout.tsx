// import Header from "@/components/layout/Header";

export default function CheckoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-black">
            {/* <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b h-16 flex items-center px-6">
                <div className="font-bold text-xl">LOGO</div>
            </header> */}
            <main className="pt- bg-black">{children}</main>
        </div>
    );
}