import {
  MilestoneStatus,
  PaymentPayoutStatus,
  PaymentStatus,
  PayoutRecordStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/database';

export type TelemetryRange = '7d' | '30d' | '90d' | 'all';

export interface FinancialTimeSeriesPoint {
  label: string;
  isoDate: string;
  received: number;
  pending: number;
  disbursed: number;
}

export interface FinancialSummary {
  range: TelemetryRange;
  currency: string;
  approvedMilestoneAmount: number;
  invoicedAmount: number;
  pendingPaymentAmount: number;
  receivedPaymentAmount: number;
  pendingPayoutAmount: number;
  completedPayoutAmount: number;
  pendingEarningsAmount: number;
  hasFinancialData: boolean;
  timeSeries: FinancialTimeSeriesPoint[];
}

const PAID_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.PAID,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

const PENDING_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.PENDING,
  PaymentStatus.CREATING,
  PaymentStatus.DRAFT,
  PaymentStatus.SCHEDULED,
  PaymentStatus.SENDING,
  PaymentStatus.SENT,
  PaymentStatus.PAYMENT_PENDING,
  PaymentStatus.PARTIALLY_PAID,
]);

const TERMINAL_UNPAID_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.CANCELLED,
  PaymentStatus.FAILED,
  PaymentStatus.REFUNDED,
]);

export function parseTelemetryRange(input?: string): TelemetryRange {
  if (input === '7d' || input === '30d' || input === '90d' || input === 'all') {
    return input;
  }
  return '30d';
}

export function getRangeStartDate(range: TelemetryRange): Date | undefined {
  const now = Date.now();
  if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (range === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
  return undefined;
}

function toFixedMoney(dec: Prisma.Decimal): number {
  return Number(dec.toFixed(2));
}

export async function computeFinancialSummary(
  projectWhere: Prisma.ProjectWhereInput | undefined,
  range: TelemetryRange = 'all'
): Promise<FinancialSummary> {
  const since = getRangeStartDate(range);

  const milestones = await prisma.milestone.findMany({
    where: projectWhere ? { project: projectWhere } : { project: { isArchived: false } },
    select: {
      id: true,
      status: true,
      paymentAmount: true,
      currency: true,
      updatedAt: true,
      createdAt: true,
      payments: {
        select: {
          id: true,
          status: true,
          payoutStatus: true,
          snapshotAmount: true,
          snapshotCurrency: true,
          settledAmount: true,
          netReceivedAmount: true,
          paidAt: true,
          createdAt: true,
          payoutRecords: {
            select: {
              id: true,
              amount: true,
              status: true,
              initiatedAt: true,
              disbursedAt: true,
            },
          },
        },
      },
    },
  });

  let approvedMilestoneDec = new Prisma.Decimal(0);
  let invoicedDec = new Prisma.Decimal(0);
  let pendingPaymentDec = new Prisma.Decimal(0);
  let receivedPaymentDec = new Prisma.Decimal(0);
  let completedPayoutDec = new Prisma.Decimal(0);
  let pendingPayoutDec = new Prisma.Decimal(0);
  let pendingEarningsDec = new Prisma.Decimal(0);
  let currency = 'USD';

  const events: Array<{
    date: Date;
    received: Prisma.Decimal;
    pending: Prisma.Decimal;
    disbursed: Prisma.Decimal;
  }> = [];

  for (const ms of milestones) {
    currency = ms.currency || currency;
    const msUpdatedInRange = !since || ms.updatedAt >= since || ms.createdAt >= since;

    if (
      (ms.status === MilestoneStatus.APPROVED || ms.status === MilestoneStatus.PAID) &&
      msUpdatedInRange
    ) {
      approvedMilestoneDec = approvedMilestoneDec.add(ms.paymentAmount);
    }

    let hasPaidPayment = false;
    let hasActiveInvoice = false;

    for (const pay of ms.payments) {
      currency = pay.snapshotCurrency || currency;
      const effectivePayDate = pay.paidAt || pay.createdAt;
      const payInRange = !since || effectivePayDate >= since || pay.createdAt >= since;

      if (pay.status !== PaymentStatus.CANCELLED && pay.status !== PaymentStatus.FAILED && payInRange) {
        invoicedDec = invoicedDec.add(pay.snapshotAmount);
        hasActiveInvoice = true;
      }

      const isPending = PENDING_PAYMENT_STATUSES.has(pay.status);
      const isPaid = PAID_PAYMENT_STATUSES.has(pay.status);

      if (isPending && payInRange) {
        pendingPaymentDec = pendingPaymentDec.add(pay.snapshotAmount);
        events.push({
          date: pay.createdAt,
          received: new Prisma.Decimal(0),
          pending: pay.snapshotAmount,
          disbursed: new Prisma.Decimal(0),
        });
      }

      let disbursedForPayment = new Prisma.Decimal(0);
      for (const payout of pay.payoutRecords) {
        const payoutDate = payout.disbursedAt || payout.initiatedAt;
        const payoutInRange = !since || payoutDate >= since;
        if (payout.status === PayoutRecordStatus.DISBURSED) {
          disbursedForPayment = disbursedForPayment.add(payout.amount);
          if (payoutInRange) {
            completedPayoutDec = completedPayoutDec.add(payout.amount);
            events.push({
              date: payoutDate,
              received: new Prisma.Decimal(0),
              pending: new Prisma.Decimal(0),
              disbursed: payout.amount,
            });
          }
        }
      }

      if (isPaid) {
        hasPaidPayment = true;
        const netPaid = pay.netReceivedAmount.greaterThan(0)
          ? pay.netReceivedAmount
          : pay.settledAmount.greaterThan(0)
            ? pay.settledAmount
            : pay.snapshotAmount;

        if (payInRange) {
          receivedPaymentDec = receivedPaymentDec.add(netPaid);
          events.push({
            date: effectivePayDate,
            received: netPaid,
            pending: new Prisma.Decimal(0),
            disbursed: new Prisma.Decimal(0),
          });
        }

        const remainingUndisbursed = Prisma.Decimal.max(
          new Prisma.Decimal(0),
          netPaid.minus(disbursedForPayment)
        );
        if (
          remainingUndisbursed.greaterThan(0) &&
          pay.payoutStatus !== PaymentPayoutStatus.DISBURSED &&
          payInRange
        ) {
          pendingPayoutDec = pendingPayoutDec.add(remainingUndisbursed);
        }
      } else if (!TERMINAL_UNPAID_PAYMENT_STATUSES.has(pay.status)) {
        // Pending invoice for an approved/unpaid milestone counts toward pending earnings
        if (ms.status === MilestoneStatus.APPROVED && payInRange) {
          pendingEarningsDec = pendingEarningsDec.add(pay.snapshotAmount);
        }
      }
    }

    // Approved milestone without an active invoice or paid payment yet still counts as Pending Earnings for developers
    if (
      ms.status === MilestoneStatus.APPROVED &&
      !hasPaidPayment &&
      !hasActiveInvoice &&
      msUpdatedInRange
    ) {
      pendingEarningsDec = pendingEarningsDec.add(ms.paymentAmount);
    }
  }

  // Group events chronologically cleanly into real time-series buckets (day for 7d/30d, month for 90d/all)
  const bucketMap = new Map<
    string,
    { label: string; isoDate: string; received: Prisma.Decimal; pending: Prisma.Decimal; disbursed: Prisma.Decimal }
  >();

  const useDailyBuckets = range === '7d' || range === '30d';
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const ev of sortedEvents) {
    const key = useDailyBuckets
      ? ev.date.toISOString().slice(0, 10)
      : ev.date.toISOString().slice(0, 7);
    const label = useDailyBuckets
      ? ev.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : ev.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const existing = bucketMap.get(key) || {
      label,
      isoDate: key,
      received: new Prisma.Decimal(0),
      pending: new Prisma.Decimal(0),
      disbursed: new Prisma.Decimal(0),
    };
    existing.received = existing.received.add(ev.received);
    existing.pending = existing.pending.add(ev.pending);
    existing.disbursed = existing.disbursed.add(ev.disbursed);
    bucketMap.set(key, existing);
  }

  const timeSeries: FinancialTimeSeriesPoint[] = Array.from(bucketMap.values()).map((b) => ({
    label: b.label,
    isoDate: b.isoDate,
    received: toFixedMoney(b.received),
    pending: toFixedMoney(b.pending),
    disbursed: toFixedMoney(b.disbursed),
  }));

  const approvedMilestoneAmount = toFixedMoney(approvedMilestoneDec);
  const invoicedAmount = toFixedMoney(invoicedDec);
  const pendingPaymentAmount = toFixedMoney(pendingPaymentDec);
  const receivedPaymentAmount = toFixedMoney(receivedPaymentDec);
  const pendingPayoutAmount = toFixedMoney(pendingPayoutDec);
  const completedPayoutAmount = toFixedMoney(completedPayoutDec);
  const pendingEarningsAmount = toFixedMoney(pendingEarningsDec);

  const hasFinancialData =
    approvedMilestoneAmount > 0 ||
    invoicedAmount > 0 ||
    pendingPaymentAmount > 0 ||
    receivedPaymentAmount > 0 ||
    pendingPayoutAmount > 0 ||
    completedPayoutAmount > 0 ||
    pendingEarningsAmount > 0;

  return {
    range,
    currency,
    approvedMilestoneAmount,
    invoicedAmount,
    pendingPaymentAmount,
    receivedPaymentAmount,
    pendingPayoutAmount,
    completedPayoutAmount,
    pendingEarningsAmount,
    hasFinancialData,
    timeSeries,
  };
}
