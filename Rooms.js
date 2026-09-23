import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Phone, CalendarDays, DoorOpen, KeyRound, Eye } from "lucide-react";
import { api, rupees, dateLabel } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/Confirm";
import { RoomDetail } from "@/components/RoomDetail";

const emptyForm = {
  property_id: "",
  room_number: "",
  rent_amount: "",
  security_deposit: "",
  status: "vacant",
  tenant_name: "",
  tenant_phone: "",
  tenant_pin: "",
  start_date: "",
  notes: "",
};

export default function Rooms() {
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detailRoom, setDetailRoom] = useState(null);
  const [payDialog, setPayDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, r, l] = await Promise.all([
        api.get("/properties"),
        api.get("/rooms"),
        api.get("/ledger"),
      ]);
      setProperties(p.data);
      setRooms(r.data);
      setLedger(l.data);
    } catch (e) {
      toast.error("Data load nahi hua");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, property_id: properties[0]?.id || "" });
    setOpen(true);
  };

  const openEdit = (room) => {
    setEditing(room);
    setForm({
      property_id: room.property_id,
      room_number: room.room_number,
      rent_amount: room.rent_amount,
      security_deposit: room.security_deposit,
      status: room.status,
      tenant_name: room.tenant_name,
      tenant_phone: room.tenant_phone,
      start_date: room.start_date ? room.start_date.slice(0, 10) : "",
      tenant_pin: room.tenant_pin || "",
      notes: room.notes,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.property_id) {
      toast.error("Property chunein (pehle property add karein)");
      return;
    }
    if (!form.room_number.trim()) {
      toast.error("Room number daalein");
      return;
    }
    try {
      const payload = {
        ...form,
        rent_amount: Number(form.rent_amount || 0),
        security_deposit: Number(form.security_deposit || 0),
      };
      if (editing) await api.put(`/rooms/${editing.id}`, payload);
      else await api.post("/rooms", payload);
      toast.success(editing ? "Room update ho gaya" : "Room add ho gaya");
      setOpen(false);
      load();
    } catch (e) {
      toast.error("Save nahi hua");
    }
  };

  const vacate = async (room) => {
    try {
      await api.post(`/rooms/${room.id}/vacate`);
      toast.success(`Room ${room.room_number} khali mark ho gaya`);
      load();
    } catch (e) {
      toast.error("Update nahi hua");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/rooms/${id}`);
      toast.success("Room delete ho gaya");
      load();
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  const openPay = (room, balance) => {
    setDetailRoom(null);
    setPayDialog({
      room_id: room.id,
      room_number: room.room_number,
      amount: Math.max(balance, 0),
      method: "cash",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  };

  const savePayment = async () => {
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

  const visible = filter === "all" ? rooms : rooms.filter((r) => r.property_id === filter);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display">Rooms</h2>
          <p className="text-sm text-slate-500">Kirayedaar aur khali rooms ka record</p>
        </div>
        {properties.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" data-testid="add-room-btn" onClick={openAdd}>
                <Plus className="w-4 h-4" /> Room Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Room Edit Karein" : "Naya Room"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Property *</Label>
                  <select
                    data-testid="room-property-select"
                    value={form.property_id}
                    onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                  >
                    <option value="">-- chunein --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Room number *</Label>
                    <Input
                      data-testid="room-number-input"
                      placeholder="101"
                      value={form.room_number}
                      onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <select
                      data-testid="room-status-select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
                    >
                      <option value="occupied">Aage (Occupied)</option>
                      <option value="vacant">Khali (Vacant)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kiraya (₹/mahina)</Label>
                    <Input
                      type="number"
                      data-testid="room-rent-input"
                      placeholder="5000"
                      value={form.rent_amount}
                      onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Security (₹)</Label>
                    <Input
                      type="number"
                      data-testid="room-deposit-input"
                      placeholder="10000"
                      value={form.security_deposit}
                      onChange={(e) => setForm({ ...form, security_deposit: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kirayedaar ka naam</Label>
                    <Input
                      data-testid="room-tenant-name-input"
                      placeholder="Ramesh Kumar"
                      value={form.tenant_name}
                      onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      data-testid="room-tenant-phone-input"
                      placeholder="9876543210"
                      value={form.tenant_phone}
                      onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Room starting date</Label>
                    <Input
                      type="date"
                      data-testid="room-start-date-input"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tenant PIN (4 digit)</Label>
                    <Input
                      data-testid="room-pin-input"
                      placeholder="1234"
                      maxLength={4}
                      value={form.tenant_pin}
                      onChange={(e) =>
                        setForm({ ...form, tenant_pin: e.target.value.replace(/\D/g, "").slice(0, 4) })
                      }
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 -mt-2">
                  Tenant apna khata "Kirayedaar Portal" par phone + is PIN se dekh sakta hai (sirf apna)
                </p>
                <div className="space-y-1.5">
                  <Label>Note (optional)</Label>
                  <Input
                    data-testid="room-notes-input"
                    placeholder="Koi extra baat"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} data-testid="room-cancel-btn">
                  Cancel
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save} data-testid="room-save-btn">
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {properties.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500" data-testid="rooms-no-property-msg">
          Pehle property add karein —{" "}
          <Link to="/properties" className="text-emerald-700 font-medium underline">
            Properties par jayein
          </Link>
        </div>
      )}

      <div className="flex gap-2 flex-wrap" data-testid="room-filters">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          data-testid="property-filter-all"
          onClick={() => setFilter("all")}
        >
          Sab
        </Button>
        {properties.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={filter === p.id ? "default" : "outline"}
            data-testid={`property-filter-${p.id}`}
            onClick={() => setFilter(p.id)}
          >
            {p.name}
          </Button>
        ))}
      </div>

      {visible.length === 0 && properties.length > 0 && (
        <p className="text-sm text-slate-500" data-testid="no-rooms-msg">
          Koi room nahi hai. Room add karein.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((room) => {
          const prop = properties.find((p) => p.id === room.property_id);
          const vacant = room.status === "vacant";
          return (
            <div
              key={room.id}
              data-testid={`room-card-${room.id}`}
              className={cn(
                "rounded-2xl border bg-white p-5 card-lift",
                vacant ? "border-amber-300 border-dashed" : "border-slate-200"
              )}
            >
              <div
                className="flex items-start justify-between gap-2 cursor-pointer"
                onClick={() => setDetailRoom(room)}
                data-testid={`room-open-detail-${room.id}`}
              >
                <div>
                  <p className="font-bold font-display text-lg flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-slate-400" />
                    Room {room.room_number}
                  </p>
                  <p className="text-xs text-slate-500">{prop?.name || ""}</p>
                </div>
                {vacant ? (
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-300" data-testid={`room-status-badge-${room.id}`}>
                    KHALI
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200" data-testid={`room-status-badge-${room.id}`}>
                    AAGE
                  </Badge>
                )}
              </div>

              {vacant ? (
                <p className="text-sm text-amber-700 mt-4">Ye room khali hai</p>
              ) : (
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="font-medium">{room.tenant_name || "Kirayedaar nahi"}</p>
                  {room.tenant_phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {room.tenant_phone}
                    </p>
                  )}
                  {room.start_date && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" /> Shuru: {dateLabel(room.start_date)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3" /> Kiraya: {rupees(room.rent_amount)} / mahina
                    {room.security_deposit > 0 && <> · Security: {rupees(room.security_deposit)}</>}
                  </p>
                  {(() => {
                    const l = ledger.find((x) => x.room_id === room.id);
                    if (!l) return null;
                    return l.balance > 0 ? (
                      <p
                        className="text-xs font-semibold text-rose-600"
                        data-testid={`room-balance-${room.id}`}
                      >
                        Bakaya: {rupees(l.balance)}
                      </p>
                    ) : (
                      <p
                        className="text-xs font-semibold text-emerald-600"
                        data-testid={`room-balance-${room.id}`}
                      >
                        Hisaab clear
                      </p>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center gap-1 mt-4 pt-3 border-t flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => setDetailRoom(room)} data-testid={`room-detail-btn-${room.id}`}>
                  <Eye className="w-4 h-4" /> Detail
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(room)} data-testid={`room-edit-btn-${room.id}`}>
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
                {!vacant && (
                  <ConfirmDelete
                    label="Khali Kiya"
                    title={`Room ${room.room_number} khali karein?`}
                    description="Kirayedaar hat jayega. Uska purana khata Khata page ke 'Purane Kirayedaar' me save rahega aur room fresh khata ke saath khali ho jayega."
                    onConfirm={() => vacate(room)}
                    testid={`room-vacate-btn-${room.id}`}
                  />
                )}
                <ConfirmDelete
                  label="Delete"
                  title={`Room ${room.room_number} delete karein?`}
                  description="Iska bijli aur rent record bhi delete ho jayega."
                  onConfirm={() => remove(room.id)}
                  testid={`room-delete-btn-${room.id}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <RoomDetail
        roomId={detailRoom?.id}
        open={!!detailRoom}
        onClose={() => setDetailRoom(null)}
        onChanged={load}
        onAddPayment={openPay}
      />

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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={savePayment} data-testid="payment-save-btn">
              Jama karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
