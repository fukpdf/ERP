export type SubscriptionStatus = "TRIALING"|"ACTIVE"|"PAST_DUE"|"PAUSED"|"CANCELLED"|"EXPIRED";
export type PaymentStatus = "PENDING"|"SUCCEEDED"|"FAILED"|"REFUNDED";

export function transitionSubscription(status: SubscriptionStatus, action: "ACTIVATE"|"PAUSE"|"CANCEL"|"RENEW"|"EXPIRE"): SubscriptionStatus {
  const map: Record<SubscriptionStatus, Partial<Record<typeof action, SubscriptionStatus>>> = {
    TRIALING:{ACTIVATE:"ACTIVE",CANCEL:"CANCELLED",EXPIRE:"EXPIRED"},
    ACTIVE:{PAUSE:"PAUSED",CANCEL:"CANCELLED",RENEW:"ACTIVE",EXPIRE:"EXPIRED"},
    PAST_DUE:{ACTIVATE:"ACTIVE",PAUSE:"PAUSED",CANCEL:"CANCELLED",RENEW:"ACTIVE",EXPIRE:"EXPIRED"},
    PAUSED:{ACTIVATE:"ACTIVE",CANCEL:"CANCELLED",RENEW:"ACTIVE"},
    CANCELLED:{RENEW:"ACTIVE"},
    EXPIRED:{RENEW:"ACTIVE"}
  };
  const next=map[status][action]; if(!next) throw new Error(`invalid subscription transition: ${status} -> ${action}`); return next;
}

export function paymentIdempotencyKey(provider: string, key: string): string {
  if(!provider.trim() || !key.trim()) throw new Error("payment provider and idempotency key are required");
  return `${provider}:${key}`;
}

export function canUseEntitlement(status: "ACTIVE"|"SUSPENDED"|"EXPIRED", startsAt: Date, endsAt: Date|undefined, now: Date): boolean {
  return status==="ACTIVE" && now >= startsAt && (!endsAt || now < endsAt);
}

export function validateMoney(amount: number): void {
  if(!Number.isFinite(amount) || amount < 0) throw new Error("amount must be a finite non-negative number");
}
