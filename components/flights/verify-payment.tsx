export function VerifyPayment({
  result: { hasCompletedPayment },
}: {
  result: {
    hasCompletedPayment: boolean;
  };
}) {
  return (
    <div>
      {hasCompletedPayment
        ? "¡Su transacción de pago ha sido verificada!"
        : "No se pudo verificar su pago, ¡por favor intente de nuevo!"}
    </div>
  );
}
