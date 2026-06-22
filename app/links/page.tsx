import { redirect } from 'next/navigation'

export default function PaymentLinksPage() {
  redirect('/dashboard?tab=payment-links')
}
