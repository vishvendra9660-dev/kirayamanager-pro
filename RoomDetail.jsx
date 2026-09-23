import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Zap, CircleCheck, Plus } from "lucide-react";
import { api, rupees, monthLabel, dateLabel, methodLabel } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const RoomDetail = ({ roomId, open, onClose, onChanged, onAddPayment }) => {
  const [data, setData] = useState(null);

  const load = async () => {
    if (!roomId) return;
    try {
      const res = await api.get(`/rooms/${roomId}/detail`);
      setData(res.data);
    } catch (e) {
      toast.error("Room detail load nahi hua");
    }
  };

  useEffect(() => {
    if (open && roomId) {
      setData(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomId]);

  const deletePayment = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Payment hata di gayi");
      load();
      onChanged && onChanged();
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  const deleteReading = async (id) => {
    try {
      await api.delete(`/readings/${id}`);
      toast.success("Bijli entry hata di gayi");
      load();
      onChanged && onChanged();
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data ? `Room ${data.room.room_number} — poora hisaab` : "Load ho raha hai..."}
          </DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-5" data-testid="room-detail-view">
            <div className="rounded-xl border bg-slate-50 p-3 text-sm">
              <p className="font-semibold">
                {data.room.tenant_name || "Kirayedaar nahi"}
                {data.room.status === "vacant" && (
                  <Badge className="ml-2 bg-amber-100 text-amber-800 border border-amber-300">KHALI</Badge>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {data.property_name}
                {data.room.tenant_phone && <> · {data.room.tenant_phone}</>}
                {data.room.start_date && <> · Shuru: {dateLabel(data.room.start_date)}</>}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="rounded-lg bg-white p-2">
                  <p className="text-[11px] text-slate-400">Kul jur</p>
                  <p className="font-bold text-sm">{rupees(data.summary.total_billed)}</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="text-[11px] text-slate-400">Kul jama</p>
                  <p className="font-bold text-sm text-emerald-700">{rupees(data.summary.total_paid)}</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="text-[11px] text-slate-400">Bakaya</p>
                  <p className={`font-bold text-sm ${data.summary.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {rupees(data.summary.balance)}
                  </p>
                </div>
              </div>
              {onAddPayment && data.room.status === "occupied" && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 w-full mt-3"
                  size="sm"
                  onClick={() => onAddPayment(data.room, data.summary.balance)}
                  data-testid="room-detail-pay-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Payment jama karo
                </Button>
              )}
            </div>

            <div>
              <p className="font-semibold font-display text-sm mb-2">Mahine-dar-mahine khata</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b">
                      <th className="py-2 pr-3">Mahina</th>
                      <th className="py-2 pr-3">Rent</th>
                      <th className="py-2 pr-3">Bijli</th>
                      <th className="py-2 pr-3">Jama</th>
                      <th className="py-2">Bakaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-slate-400 text-center">
                          Abhi koi mahina charge nahi hua
                        </td>
                      </tr>
                    )}
                    {data.rows.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{monthLabel(row.month)}</td>
                        <td className="py-2 pr-3">{rupees(row.rent)}</td>
                        <td className="py-2 pr-3">{row.bijli ? rupees(row.bijli) : "-"}</td>
                        <td className="py-2 pr-3 text-emerald-600">{row.paid ? rupees(row.paid) : "-"}</td>
                        <td className={`py-2 font-semibold ${row.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {rupees(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-semibold font-display text-sm mb-2">
                <Zap className="w-4 h-4 inline text-amber-500 mr-1" /> Bijli entries
              </p>
              <div className="space-y-2">
                {data.readings.length === 0 && (
                  <p className="text-sm text-slate-500" data-testid="detail-no-readings">
                    Koi bijli entry nahi.
                  </p>
                )}
                {data.readings.map((rd) => (
                  <div
                    key={rd.id}
                    data-testid={`detail-reading-${rd.id}`}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {rupees(rd.amount)} · {rd.units_consumed} unit
                      </p>
                      <p className="text-xs text-slate-500">
                        {dateLabel(rd.reading_date || `${rd.month}-01`)} · {rd.previous_units} → {rd.current_units} @ ₹{rd.rate_per_unit}
                        {rd.notes ? ` · ${rd.notes}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => deleteReading(rd.id)}
                      data-testid={`detail-reading-delete-${rd.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold font-display text-sm mb-2">
                <CircleCheck className="w-4 h-4 inline text-emerald-500 mr-1" /> Payment history
              </p>
              <div className="space-y-2">
                {data.payments.length === 0 && (
                  <p className="text-sm text-slate-500" data-testid="detail-no-payments">
                    Koi payment nahi.
                  </p>
                )}
                {data.payments
                  .slice()
                  .reverse()
                  .map((pm) => (
                    <div
                      key={pm.id}
                      data-testid={`detail-payment-${pm.id}`}
                      className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {rupees(pm.amount)} · {methodLabel(pm.method)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {dateLabel(pm.paid_date)}
                          {pm.notes ? ` · ${pm.notes}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50"
                        onClick={() => deletePayment(pm.id)}
                        data-testid={`detail-payment-delete-${pm.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
