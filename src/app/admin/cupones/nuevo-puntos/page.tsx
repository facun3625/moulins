import { NewPointsCouponForm } from "./new-points-coupon-form";

export default function NewPointsCouponPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nuevo cupón por puntos</h1>
      <NewPointsCouponForm />
    </div>
  );
}
