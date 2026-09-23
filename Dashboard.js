import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  DoorOpen,
  Users,
  CircleAlert,
  CircleCheck,
  IndianRupee,
  MessageCircle,
  Printer,
} from "lucide-react";
import { api, rupees, currentMonth, monthLabel, waLink, lastMonths } from "@/lib/api";
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

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [payDialog, setPayDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard", { params: { month } });
      setData(res.data);
    } catch (e) {
      toast.error("Data load nahi hua");
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayDialog = (d) => {
    setPayDialog({
      room_id: d.room_id,
      room_number: d.room_number,
      amount: Math.max(d.balance, 0),
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
      setPayDialog(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save nahi hua");
    }
  };

  if (!data) {
    return <div className="p-6 text-sm text-slate-400">Load ho raha hai...</div>;
  }

  const waText = (d) =>
    `Namaste ${d.tenant_name || "Ji"}, aapke room ${d.room_number} (${d.property_name}) ka ${monthLabel(month)} ka rent ${rupees(d.rent_this_month)} + bijli ${rupees(d.elec_this_month)} hai.\n` +
    `Kul bakaya: ${rupees(d.balance)}\n` +
    `Kripya jaldi payment kar dein. Dhanyavaad!`;

  const stats = [
    { label: "Kul Rooms", value: data.rooms_total, icon: DoorOpen, cls: "text-slate-700", testid: "stat-total-rooms" },
    { label: "Aage (Occupied)", value: data.occupied_count, icon: Users, cls: "text-emerald-600", testid: "stat-occupied" },
    { label: "Khali Rooms", value: data.vacant_count, icon: CircleAlert, cls: "text-amber-600", testid: "stat-vacant" },
    { label: "Is Mahine Jama", value: rupees(data.collected), icon: CircleCheck, cls: "text-emerald-600", testid: "stat-collected" },
    { label: "Kul Bakaya", value: rupees(data.pending), icon: IndianRupee, cls: "text-rose-600", testid: "stat-pending" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display">Dashboard</h2>
          <p className="text-sm text-slate-500">{monthLabel(month)} ka poora hisaab</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/report">
            <Button variant="outline" className="gap-1.5" data-testid="report-btn">
              <Printer className="w-4 h-4" /> Report
            </Button>
          </Link>
          <select
            data-testid="month-picker"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-10 rounded-lg border border-input bg-white px-3 text-sm font-medium"
        >
          {lastMonths(12).map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} data-testid={s.testid} className="card-lift">
            <CardContent className="p-4">
              <s.icon className={`w-4 h-4 mb-2 ${s.cls}`} />
              <p className="text-xl md:text-2xl font-bold font-display">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.vacant_count > 0 && (
        <div
          data-testid="vacant-banner"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <CircleAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {data.vacant_count} room khali hain
              </p>
              <p className="text-xs text-amber-700">Naya kirayedaar dhundne ka time hai</p>
            </div>
          </div>
          <Link to="/rooms">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
              data-testid="vacant-rooms-view-btn"
            >
              Khali rooms dekhein
            </Button>
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Is mahine ke reminders</CardTitle>
          <CardDescription>
            {monthLabel(month)} — jin rooms ka rent ya bijli baaki hai. WhatsApp par yaad dilayein.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.dues.length === 0 && (
            <p className="text-sm text-slate-500" data-testid="no-dues-msg">
              Sab badhiya! Is mahine koi payment baaki nahi hai.
            </p>
          )}
          {data.dues.map((d) => (
            <div
              key={d.room_id}
              data-testid={`due-row-${d.room_id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 card-lift"
            >
              <div>
                <p className="font-semibold text-sm">
                  Room {d.room_number} · {d.tenant_name || "Kirayedaar nahi"}
                </p>
                <p className="text-xs text-slate-500">{d.property_name}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
                    Is mahine rent {rupees(d.rent_this_month)}
                  </Badge>
                  {d.elec_this_month > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                      Bijli {rupees(d.elec_this_month)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-right mr-1">
                  <p className="text-xs text-slate-400">Kul bakaya</p>
                  <p className="font-bold text-rose-600" data-testid={`due-balance-${d.room_id}`}>
                    {rupees(d.balance)}
                  </p>
                </div>
                {d.tenant_phone && (
                  <a
                    href={waLink(d.tenant_phone, waText(d))}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`whatsapp-reminder-btn-${d.room_id}`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  </a>
                )}
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid={`rent-paid-quick-btn-${d.room_id}`}
                  onClick={() => openPayDialog(d)}
                >
                  Payment Jama
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
