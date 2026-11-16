'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminAdjustPoints } from '@/app/actions/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    MAX_ADMIN_CREDIT,
    rewardNumber,
    validateCredit,
    type CreditRequest,
    type CreditReceipt,
} from '@/lib/reward-users'

export function AdjustPointsForm({
    userId,
    customerName,
    currentBalance,
}: {
    userId: string
    customerName: string
    currentBalance: number
}) {
    const router = useRouter()
    const [amount, setAmount] = useState(''),
        [note, setNote] = useState('')
    const [review, setReview] = useState<CreditRequest | null>(null)
    const [pending, setPending] = useState(false),
        [uncertain, setUncertain] = useState(false)
    const [error, setError] = useState(''),
        [receipt, setReceipt] = useState<CreditReceipt | null>(null)
    const inFlight = useRef(false)
    function prepare(event: React.FormEvent) {
        event.preventDefault()
        const request = {
            requestId: crypto.randomUUID(),
            userId,
            amount: Number(amount),
            note: note.trim(),
            expectedBalance: currentBalance,
        }
        try {
            validateCredit(request)
            setError('')
            setReview(request)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Check the credit details.')
        }
    }
    async function confirm() {
        if (!review || inFlight.current) return
        inFlight.current = true
        setPending(true)
        setError('')
        try {
            const result = await adminAdjustPoints(review)
            if (!result.success) {
                setError(result.message)
                setUncertain(result.uncertain)
                if (!result.uncertain) {
                    setReview(null)
                    router.refresh()
                }
                return
            }
            setReceipt(result.receipt)
            setReview(null)
            setUncertain(false)
            setAmount('')
            setNote('')
            router.refresh()
        } catch {
            setUncertain(true)
            setError('Unable to confirm this credit. Retry the same request or reload and check the history.')
        } finally {
            inFlight.current = false
            setPending(false)
        }
    }
    return (
        <section aria-label="Credit coins" className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Credit M Coins</h2>
            {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </p>
            )}
            {receipt ? (
                <div role="status" className="space-y-3 text-sm">
                    <p className="font-semibold text-emerald-800">
                        Credited {rewardNumber(receipt.amount)} coins.
                    </p>
                    <p>
                        Balance after credit: <strong>{rewardNumber(receipt.balance_after)}</strong>
                    </p>
                    <p className="text-xs text-slate-500 break-all">Receipt: {receipt.id}</p>
                    <a href={`/admin/rewards/users/${userId}`} className="inline-block underline">
                        Reload for another credit
                    </a>
                </div>
            ) : review ? (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Review credit</h3>
                    <dl className="space-y-3 text-sm">
                        <div>
                            <dt className="text-xs text-slate-500">Customer</dt>
                            <dd className="font-semibold break-words">{customerName}</dd>
                            <dd className="mt-1 break-all text-xs text-slate-500">{userId}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                            <dt>Available balance</dt>
                            <dd className="tabular-nums">{rewardNumber(review.expectedBalance)}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                            <dt>Credit</dt>
                            <dd className="font-semibold tabular-nums">+{rewardNumber(review.amount)}</dd>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2 border-t pt-3">
                            <dt>Balance after credit</dt>
                            <dd className="font-semibold tabular-nums">
                                {rewardNumber(review.expectedBalance + review.amount)}
                            </dd>
                        </div>
                    </dl>
                    <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm">
                        {review.note}
                    </p>
                    <Button
                        disabled={pending}
                        onClick={confirm}
                        className="w-full bg-pink-700 text-white hover:bg-pink-800"
                    >
                        {pending ? 'Confirming…' : uncertain ? 'Retry same credit' : 'Confirm credit'}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={pending || uncertain}
                        className="w-full"
                        onClick={() => {
                            setReview(null)
                            setError('')
                        }}
                    >
                        Edit credit
                    </Button>
                    {uncertain && (
                        <a href={`/admin/rewards/users/${userId}`} className="block text-xs underline">
                            Reload and check transaction history
                        </a>
                    )}
                </div>
            ) : (
                <form onSubmit={prepare} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Credit 1–{rewardNumber(MAX_ADMIN_CREDIT)} whole coins. Each credit records your
                        identity and reason.
                    </p>
                    <label className="block space-y-2 text-xs font-medium text-slate-600">
                        Coins to credit
                        <Input
                            aria-label="Coins to credit"
                            type="number"
                            min="1"
                            max={MAX_ADMIN_CREDIT}
                            step="1"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            required
                            className="h-10 border-slate-200"
                        />
                    </label>
                    <label className="block space-y-2 text-xs font-medium text-slate-600">
                        Reason
                        <textarea
                            aria-label="Credit reason"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            minLength={3}
                            maxLength={500}
                            required
                            className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                        />
                    </label>
                    <p className="text-xs text-slate-500">{note.length}/500 characters</p>
                    <Button
                        type="submit"
                        disabled={pending || !amount || note.trim().length < 3}
                        className="w-full bg-slate-900 text-white"
                    >
                        Review credit
                    </Button>
                </form>
            )}
        </section>
    )
}
