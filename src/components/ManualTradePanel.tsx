import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Toast from '@/components/Toast'

interface ManualTradePanelProps {
  onSend: (payload: { command: string; quantity?: number }) => Promise<any>
}

const ManualTradePanel: React.FC<ManualTradePanelProps> = ({ onSend }) => {
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState<string | null>(null)

  const send = async (cmd: string) => {
    const resp = await onSend({ command: cmd, quantity: qty })
    setToast(resp?.success ? `Sent ${cmd}` : 'Failed')
  }

  return (
    <Card className="bg-trading-card/40 backdrop-blur-lg border p-4 relative">
      {toast && <Toast type="success" message={toast} onClose={()=>setToast(null)} />}
      <CardHeader className="pb-2"><h2 className="text-lg font-semibold">Manual Test Trade</h2></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span>Qty</span>
          <input type="number" value={qty} min={1} onChange={e=>setQty(parseInt(e.target.value)||1)} className="w-20 text-black" />
        </div>
        <div className="flex gap-2">
          <button onClick={()=>send('go_long')} className="bg-green-600 px-3 py-1 rounded">Test Long</button>
          <button onClick={()=>send('go_short')} className="bg-red-600 px-3 py-1 rounded">Test Short</button>
          <button onClick={()=>send('close_position')} className="bg-gray-600 px-3 py-1 rounded">Close</button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ManualTradePanel 