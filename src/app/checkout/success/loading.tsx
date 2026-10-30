import { Skeleton } from "@/components/ui/Skeleton";

/** Checkout success while Stripe is confirmed: the centred pane with the check, title, line and two buttons. */
export default function CheckoutSuccessLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-16" aria-busy="true" aria-label="Confirming your payment">
      <div className="pane p-8 text-center">
        <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto h-9 w-2/3 max-w-xs" />
        <Skeleton className="mx-auto mt-4 h-4 w-11/12 max-w-md" />
        <Skeleton className="mx-auto mt-2 h-4 w-3/4 max-w-sm" />
        <div className="mt-6 flex justify-center gap-3"><Skeleton className="h-11 w-36 rounded-full" /><Skeleton className="h-11 w-36 rounded-full" /></div>
        <Skeleton className="mx-auto mt-6 h-3 w-48" />
      </div>
      <div className="pane mt-4 p-5">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="mt-3 h-4 w-11/12 max-w-lg" />
        <Skeleton className="mt-4 h-10 w-44 rounded-full" />
      </div>
    </div>
  );
}
