"use client";

interface LoadCompProps {
  /**
   * Controla la visibilidad del overlay.
   * @default false
   */
  isVisible?: boolean;
  /**
   * Texto principal del título.
   * @default "Procesando pago"
   */
  title?: string;
  /**
   * Texto de descripción.
   * @default "Por favor espera mientras confirmamos tu pago con Mercado Pago"
   */
  description?: string;
  /**
   * Ancho máximo del modal.
   * @default "max-w-sm"
   */
  maxWidth?: string;
  /**
   * Color del spinner y elementos animados.
   * @default "orange"
   */
  color?: "orange" | "blue" | "green" | "purple";
}

const COLOR_CLASSES = {
  orange: {
    spinner: "border-t-orange-500",
    spinnerInner: "border-t-orange-400",
    progress: "from-orange-500 to-orange-400",
    border: "border-orange-500/30",
    shadow: "shadow-orange-500/20",
  },
  blue: {
    spinner: "border-t-blue-500",
    spinnerInner: "border-t-blue-400",
    progress: "from-blue-500 to-blue-400",
    border: "border-blue-500/30",
    shadow: "shadow-blue-500/20",
  },
  green: {
    spinner: "border-t-green-500",
    spinnerInner: "border-t-green-400",
    progress: "from-green-500 to-green-400",
    border: "border-green-500/30",
    shadow: "shadow-green-500/20",
  },
  purple: {
    spinner: "border-t-purple-500",
    spinnerInner: "border-t-purple-400",
    progress: "from-purple-500 to-purple-400",
    border: "border-purple-500/30",
    shadow: "shadow-purple-500/20",
  },
};

/**
 * Componente reutilizable de overlay de procesamiento.
 * Muestra un modal con spinner animado y barra de progreso mientras dura una operación.
 *
 * @example
 * ```tsx
 * // Uso básico
 * <LoadComp isVisible={isProcessing} />
 *
 * // Uso con personalización
 * <LoadComp
 *   isVisible={isLoading}
 *   title="Procesando tu membresía"
 *   description="En unos segundos tendrás acceso a tu plan"
 *   color="blue"
 * />
 * ```
 */
export default function LoadComp({
  isVisible = false,
  title = "Procesando pago",
  description = "Por favor espera mientras confirmamos tu pago con Mercado Pago",
  maxWidth = "max-w-sm",
  color = "orange",
}: LoadCompProps) {
  if (!isVisible) return null;

  const colorClasses = COLOR_CLASSES[color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`
          bg-gray-900 ${colorClasses.border} rounded-2xl p-8 ${maxWidth} mx-4 text-center ${colorClasses.shadow} shadow-2xl
        `}
      >
        {/* Spinner animado */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
          <div
            className={`absolute inset-0 rounded-full border-4 border-transparent ${colorClasses.spinner} animate-spin`}
          />
          <div
            className={`absolute inset-2 rounded-full border-4 border-transparent ${colorClasses.spinnerInner} animate-spin`}
            style={{ animationDuration: "0.8s" }}
          />
        </div>

        {/* Texto */}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>

        {/* Progress bar animada */}
        <div className="mt-6 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-linear-to-r ${colorClasses.progress} rounded-full animate-pulse`}
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}
