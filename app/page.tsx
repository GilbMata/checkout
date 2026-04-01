import Image from "next/image";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <header className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl mb-4">Elige tu plan</h1>
        <p className="text-gray-500 text-lg">Entrena en la red de gimnasios más grande de México.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Ejemplo de una Card de Plan */}
        <div className="plan-card">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recomendado</span>
          <h2 className="text-2xl mt-2">Plan Black</h2>
          <div className="my-6">
            <span className="price-tag">$499</span>
            <span className="text-gray-400">/mes</span>
          </div>
          <ul className="space-y-3 mb-8 text-sm">
            <li>• Acceso a todas las sucursales</li>
            <li>• Invitado especial los fines de semana</li>
            <li>• Sin inscripción</li>
          </ul>
          <button className="btn-s24 w-full">
            Inscribirme ahora
          </button>
        </div>
      </div>
    </div>
  );
}