import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Props {
  open: boolean
  secret: string
  label?: string
  onClose: () => void
}

export default function SecretRevealModal({ open, secret, label, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
    }
  }, [open])

  if (!open) return null

  async function handleCopy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">One-time secret</p>
            <h3 className="mt-1 text-xl font-semibold">{label ?? 'Webhook secret generated'}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Copy this secret now. It will not be shown again.
            </p>
          </div>
          <Badge variant="secondary">Shown once</Badge>
        </div>

        <div className="mt-5 rounded-xl border bg-muted/40 p-4 font-mono text-sm break-all">
          {secret}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy secret'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
