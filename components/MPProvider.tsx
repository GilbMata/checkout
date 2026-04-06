// "use client";

// import { useEffect, useState } from "react";
// import { mp } from "@/lib/mercadopago";

// interface MPProviderProps {
//   children: React.ReactNode;
// }

// export default function MPProvider({ children }: MPProviderProps) {
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     // Solo inicializar una vez en el cliente
//     if (typeof window !== "undefined" && !ready) {
//       mp()
//         .then(() => {
//           console.log("✅ MercadoPago inicializado");
//           setReady(true);
//         })
//         .catch((err) => {
//           console.error("❌ Error inicializando MercadoPago:", err);
//         });
//     }
//   }, [ready]);

//   // No renderizar children hasta que esté inicializado
//   // Esto asegura que el SDK esté listo antes de renderizar los Bricks
//   if (!ready && typeof window !== "undefined") {
//     return (
//       <div className="flex justify-center p-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
//       </div>
//     );
//   }

//   return <>{children}</>;
// }
