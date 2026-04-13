# Documentación del Flujo de Compra - Station24

## Resumen del Proceso

El sistema de checkout de Station24 permite a los nuevos usuarios registrarse y comprar una membresía de gimnasio de manera completamente digital. El flujo está diseñado para ser simple, seguro y fluido.

---

## Pasos del Flujo

### 1. Selección del Plan (fuera del checkout)

El usuario llega al checkout desde el sitio principal de Station24 (`station24.com.mx/unete`) seleccionando un plan de membresía. El URL del checkout incluye un parámetro `planId` que identifica el plan seleccionado.

### 2. Página de Checkout

El checkout muestra el plan seleccionado con su precio y duración. Desde aquí el usuario comienza el proceso de registro.

### 3. Registro de Datos Personales

El usuario completa un formulario con:

- **Teléfono** (dato obligatorio y principal)
- **CURP** (opcional - si se ingresa, el sistema autocompleta género y fecha de nacimiento)
- **Nombre y Apellido**
- **Género y Fecha de Nacimiento**
- **Correo electrónico**

#### Flujo de Validación de Teléfono (Antes de Capturar Datos)

Antes de permitir que el usuario ingrese sus datos, el sistema verifica si el teléfono ya existe:

1. **Consulta en Base Local**: Se busca si el teléfono ya está registrado como prospecto en nuestra base de datos
   - Si existe → Se envía código OTP directamente y se salta el registro de datos

2. **Consulta en Sistema Evo** (si no existe local): Si el teléfono no está en nuestra base, el sistema consulta el sistema externo Evo (sistema de gestión de miembros del gimnasio)
   - Si existe en Evo → Se recuperan los datos existentes del miembro (nombre, email, CURP, género, fecha de nacimiento) y se crea un prospecto automáticamente con esos datos
   - Si no existe en Evo → Se permite al usuario completar todos los datos desde cero

El sistema valida en tiempo real:

- Que el correo no sea de un dominio temporal
- Que el teléfono no esté registrado previamente como cliente existente

### 4. Verificación por OTP

Una vez ingresados los datos, el sistema envía un código de verificación de 6 dígitos al número de WhatsApp proporcionado. El usuario tiene 60 segundos para solicitar un nuevo código si no le llega el primero.

El código debe ingresarse para continuar con el pago.

### 5. Pago con Tarjeta

Después de verificar el teléfono, el usuario puede completar el pago directamente en la página usando el formulario seguro de MercadoPago (Payment Brick). Se aceptan tarjetas de crédito y débito.

#### Flujo de Procesamiento de Pago

1. **Iniciación**: El usuario completa el formulario de pago en el Payment Brick de MercadoPago
2. **Creación de Orden**: El sistema envía los datos a `/api/payment/mercadopago` que crea una orden en MercadoPago
3. **Procesamiento**: MercadoPago procesa el pago con el banco emisor
4. **Respuesta Inmediata**: El sistema recibe una respuesta inicial del procesamiento

#### Validación por Webhook

MercadoPago envía notificaciones asíncronas sobre el estado real del pago. El sistema escucha en `/api/payment/webhook`:

1. **Recepción de Notificación**: Cuando el estado del pago cambia (aprobado, pendiente, rechazado, etc.), MercadoPago envía un webhook
2. **Consulta de Detalles**: El sistema consulta los detalles del pago a la API de MercadoPago
3. **Actualización de Estado**: Se actualiza el registro del pago en la base de datos
4. **Sincronización**: El prospecto se actualiza según el estado final del pago

#### Estados de Pago

| Estado         | Descripción                             |
| -------------- | --------------------------------------- |
| `approved`     | Pago aprobado y confirmado              |
| `pending`      | Pago en proceso de revisión             |
| `rejected`     | Pago rechazado por el banco             |
| `cancelled`    | Pago cancelado por el usuario o sistema |
| `refunded`     | Pago reembolsado                        |
| `in_process`   | Pago en proceso de validación           |
| `in_mediation` | Pago en mediación (disputa)             |

#### Integración con Prospecto

- Cuando el pago se aprueba (`approved`), el prospecto se marca como miembro activo
- El campo `paymentPending` del prospecto se actualiza a `false`
- Se registra el `paymentId` de MercadoPago para referencia futura

### 6. Confirmación del Pago

Dependiendo del resultado del pago:

- **Éxito**: El usuario es redirigido a una página de confirmación con los detalles de su compra
- **Pendiente**: El usuario ve un mensaje indicando que el pago está en proceso
- **Rechazado**: El usuario puede intentar nuevamente

---

## Estados del Checkout

| Estado    | Descripción                                |
| --------- | ------------------------------------------ |
| `form`    | Usuario completando formulario de registro |
| `otp`     | Verificando número con código SMS/WhatsApp |
| `payment` | Realizando el pago con tarjeta             |

---

## ¿Qué sucede después del pago exitoso?

1. El sistema registra el pago en la base de datos
2. Se envía un correo de confirmación al usuario
3. El usuario es redirigido a la página de éxito con los detalles de su membresía
4. Puede continuar hacia el sitio principal de Station24

---

## Seguridad

- Los datos personales se almacenan de forma segura en la base de datos
- El pago se procesa directamente a través de MercadoPago (no se manejan datos de tarjeta en nuestros servidores)
- La verificación de identidad se hace mediante código OTP enviado por WhatsApp

---

## Gestión de Sesión

El sistema utiliza una cookie configurable para mantener la sesión del usuario:

- **Nombre de Cookie**: `station24-session`
- **Tipo**: JWT (JSON Web Token) firmando cryptográficamente
- **Contenido**: id, email, nombre, apellido, teléfono del usuario
- **Expiración**: Configurable mediante variable de entorno `COOKIE_EXPIRATION_TIME` (por ejemplo: "24h", "10m")
- **Seguridad**:
  - `httpOnly` - No accesible desde JavaScript del cliente
  - `secure` - Solo se transmite en HTTPS en producción
  - `sameSite: "lax"` - Protección CSRF

Cuando el usuario completa la verificación OTP exitosamente, se crea la sesión y puede navegar sin volver a verificar en visitas posteriores durante el período de validez de la cookie.
