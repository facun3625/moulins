import { NewCouponForm } from "./new-coupon-form";

export default function NewCouponPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nuevo cupón</h1>
      <NewCouponForm />
    </div>
  );
}
