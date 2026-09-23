import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CircleCheck, IndianRupee, BookOpen, Plus, Trash2, Archive } from "lucide-react";
import { api, rupees, monthLabel, dateLabel, methodLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Khata() {
  const [ledger, setLedger] = useState([]);
  const [archives, setArchives] = useState([]);
  const [archiveDetail, setArchiveDetail] = useState(null);
  const [detail, setDetail] = useState(null);
  const [payDialog, setPayDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [res, arch] = await Promise.all([api.get("/ledger"), api.get("/past_tenants")]);
      setLedger(res.data);
      setArchives(arch.data);
    } catch (e) {
      toast.error("Data load nahi hua");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (roomId) => {
    try {
      const res = await api.get(`/ledger/${roomId}`);
      setDetail(res.data);
    } catch (e) {
      toast.error("Khata load nahi hua");
    }
  };

  const openPayDialog = (roomId, balance, roomNumber) => {
    setPayDialog({
      room_id: roomId,
      room_number: roomNumber,
      amount: Math.max(balance, 0),
      method: "cash",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  };

  const savePay = async () => {
    try {
      await api.post("/payments", {
        room_id: payDialog.room_id,
        amount: Number(payDialog.amount || 0),
        method: payDialog.method,
        paid_date: payDialog.date,
        notes: payDialog.notes,
      });
      toast.success(`Room ${payDialog.room_number} ki payment jama ho gayi`);
      const roomId = payDialog.room_id;
      setPayDialog(null);
      load();
      if (detail?.summary?.room_id === roomId) openDetail(roomId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save nahi hua");
    }
  };

  const deletePayment = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Payment hata di gayi");
      load();
      if (detail) openDetail(detail.summary.room_id);
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  const occupied = ledger.filter((l) => l.status === "occupied");
  const totalBakaya = occupied.reduce((s, l) => s + (l.balance > 0 ? l.balance : 0), 0);
  const totalPaid = occupied.reduce((s, l) => s + l.total_paid, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold font-display">Khata</h2>
        <p className="text-sm text-slate-500">
          Har room ka total bakaya — rent har mahine apne aap judta rahta hai
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card data-testid="khata-total-bakaya" className="border-rose-100">
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="w-5 h-5 text-rose-600" />
            <div>
              <p className="text-xl font-bold font-display">{rupees(totalBakaya)}</p>
              <p className="text-xs text-slate-500">Kul bakaya (sab rooms)</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="khata-total-paid" className="border-emerald-100">
          <CardContent className="p-4 flex items-center gap-3">
            <CircleCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xl font-bold font-display">{rupees(totalPaid)}</p>
              <p className="text-xs text-slate-500">Kul jama (sab rooms)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {occupied.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500" data-testid="khata-no-rooms-msg">
          Koi aage (occupied) room nahi hai —{" "}
          <Link to="/rooms" className="text-emerald-700 font-medium underline">
            Rooms me kirayedaar jodein
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupied.map((l) => (
          <div
            key={l.room_id}
            data-testid={`khata-card-${l.room_id}`}
            className="rounded-2xl border bg-white p-5 card-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold font-display text-lg">Room {l.room_number}</p>
                <p className="text-xs text-slate-500">
                  {l.property_name} · {l.tenant_name || "-"}
                </p>
              </div>
              {l.balance > 0 ? (
                <Badge className="bg-rose-50 text-rose-700 border border-rose-200">BAAKI</Badge>
              ) : (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CLEAR
                </Badge>
              )}
            </div>
            <div className="mt-3 space-y-1">
              <p
                className={`text-2xl font-bold font-display ${
                  l.balance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
                data-testid={`khata-balance-${l.room_id}`}
              >
                {rupees(l.balance)}
              </p>
              <p className="text-xs text-slate-500">
                {l.months_billed} mahine · Rent {rupees(l.rent_amount)}/mahina · Bijli total{" "}
                {rupees(l.bijli_billed)}
              </p>
              <p className="text-xs text-slate-500">Jama hua: {rupees(l.total_paid)}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openDetail(l.room_id)}
                data-testid={`khata-detail-btn-${l.room_id}`}
              >
                <BookOpen className="w-4 h-4 mr-1" /> Khata dekhein
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openPayDialog(l.room_id, l.balance, l.room_number)}
                data-testid={`khata-pay-btn-${l.room_id}`}
              >
                <Plus className="w-4 h-4 mr-1" /> Payment
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purane Kirayedaar</CardTitle>
          <CardDescription>
            Khali hue rooms ke kirayedaaron ka purana khata — kab aaye, kab gaye, kitna jama hua
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {archives.length === 0 && (
            <p className="text-sm text-slate-500" data-testid="no-archives-msg">
              Abhi koi purana kirayedaar nahi hai. Jab koi room "Khali Kiya" hoga, uska khata yahan save rahega.
            </p>
          )}
          {archives.map((a) => (
            <div
              key={a.id}
              data-testid={`archive-row-${a.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {a.tenant_name || "Kirayedaar"} · Room {a.room_number}
                </p>
                <p className="text-xs text-slate-500">
                  {a.property_name} · {monthLabel((a.start_date || "").slice(0, 7))} —{" "}
                  {monthLabel((a.end_date || "").slice(0, 7))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Jama / Bakaya</p>
                  <p className="font-semibold">
                    {rupees(a.total_paid)} /{" "}
                    <span className={a.balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                      {rupees(a.balance)}
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setArchiveDetail(a)}
                  data-testid={`archive-detail-btn-${a.id}`}
                >
                  <Archive className="w-4 h-4 mr-1" /> Khata
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Room {detail?.summary?.room_number} ka khata</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-[11px] text-slate-400">Kul Jur (rent+bijli)</p>
                  <p className="font-bold text-sm">{rupees(detail.summary.total_billed)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[11px] text-slate-400">Kul Jama</p>
                  <p className="font-bold text-sm text-emerald-700">
                    {rupees(detail.summary.total_paid)}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2">
                  <p className="text-[11px] text-slate-400">Bakaya</p>
                  <p className="font-bold text-sm text-rose-700">{rupees(detail.summary.balance)}</p>
                </div>
              </div>

              <div className="overflow-x-auto" data-testid="ledger-table">
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
                    {detail.rows.map((row) => (
                      <tr key={row.month} className="border-b last:border-0" data-testid={`ledger-row-${row.month}`}>
                        <td className="py-2 pr-3 font-medium">{monthLabel(row.month)}</td>
                        <td className="py-2 pr-3">{rupees(row.rent)}</td>
                        <td className="py-2 pr-3">{row.bijli ? rupees(row.bijli) : "-"}</td>
                        <td className="py-2 pr-3 text-emerald-600">
                          {row.paid ? rupees(row.paid) : "-"}
                        </td>
                        <td
                          className={`py-2 font-semibold ${
                            row.balance > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {rupees(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold font-display">Payment history</p>
                {detail.payments.length === 0 && (
                  <p className="text-sm text-slate-500" data-testid="no-payments-msg">
                    Koi payment nahi hui.
                  </p>
                )}
                {detail.payments.map((pm) => (
                  <div
                    key={pm.id}
                    data-testid={`payment-row-${pm.id}`}
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
                      data-testid={`payment-delete-btn-${pm.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
                onClick={() =>
                  openPayDialog(detail.summary.room_id, detail.summary.balance, detail.summary.room_number)
                }
                data-testid="detail-pay-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Payment jama karo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveDetail} onOpenChange={(o) => !o && setArchiveDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {archiveDetail?.tenant_name || "Kirayedaar"} · Room {archiveDetail?.room_number} — purana khata
            </DialogTitle>
          </DialogHeader>
          {archiveDetail && (
            <div className="space-y-3 text-sm" data-testid="archive-detail-view">
              <p className="text-slate-500 text-xs">
                {monthLabel((archiveDetail.start_date || "").slice(0, 7))} se{" "}
                {monthLabel((archiveDetail.end_date || "").slice(0, 7))} tak · Rent{" "}
                {rupees(archiveDetail.rent_amount)}/mahina · Jama {rupees(archiveDetail.total_paid)} · Bakaya{" "}
                {rupees(archiveDetail.balance)}
              </p>
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
                    {archiveDetail.rows.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{monthLabel(row.month)}</td>
                        <td className="py-2 pr-3">{rupees(row.rent)}</td>
                        <td className="py-2 pr-3">{row.bijli ? rupees(row.bijli) : "-"}</td>
                        <td className="py-2 pr-3 text-emerald-600">{row.paid ? rupees(row.paid) : "-"}</td>
                        <td
                          className={`py-2 font-semibold ${
                            row.balance > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {rupees(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold font-display">Payment history</p>
                {archiveDetail.payments.map((pm) => (
                  <p key={pm.id} className="border-b pb-1.5">
                    {dateLabel(pm.paid_date)} · {methodLabel(pm.method)} ·{" "}
                    <b>{rupees(pm.amount)}</b>
                    {pm.notes ? ` · ${pm.notes}` : ""}
                  </p>
                ))}
                {archiveDetail.payments.length === 0 && (
                  <p className="text-slate-500">Koi payment record nahi hai.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment jama — Room {payDialog?.room_number}</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rakam (₹) — adhoori payment bhi chalegi</Label>
                <Input
                  type="number"
                  data-testid="payment-amount-input"
                  value={payDialog.amount}
                  onChange={(e) => setPayDialog({ ...payDialog, amount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Madhiyam</Label>
                  <select
                    data-testid="payment-method-select"
                    value={payDialog.method}
                    onChange={(e) => setPayDialog({ ...payDialog, method: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="netbanking">NetBanking</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    data-testid="payment-date-input"
                    value={payDialog.date}
                    onChange={(e) => setPayDialog({ ...payDialog, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Input
                  data-testid="payment-note-input"
                  placeholder="Jaise: September ka rent"
                  value={payDialog.notes}
                  onChange={(e) => setPayDialog({ ...payDialog, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)} data-testid="payment-cancel-btn">
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={savePay} data-testid="payment-save-btn">
              Jama karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
