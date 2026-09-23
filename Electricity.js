import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Zap, Trash2 } from "lucide-react";
import { api, rupees, dateLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const today = () => new Date().toISOString().slice(0, 10);

export default function Electricity() {
  const [rooms, setRooms] = useState([]);
  const [readings, setReadings] = useState([]);
  const [forms, setForms] = useState({});

  const load = useCallback(async () => {
    try {
      const [r, rd] = await Promise.all([
        api.get("/rooms", { params: { status: "occupied" } }),
        api.get("/readings"),
      ]);
      setRooms(r.data);
      setReadings(rd.data);
    } catch (e) {
      toast.error("Data load nahi hua");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lastReadingFor = (roomId) => {
    const list = readings
      .filter((r) => r.room_id === roomId)
      .sort((a, b) =>
        (a.reading_date || a.month) > (b.reading_date || b.month) ? -1 : 1
      );
    return list[0];
  };

  const setField = (roomId, field, value) => {
    setForms((prev) => ({ ...prev, [roomId]: { ...prev[roomId], [field]: value } }));
  };

  const saveReading = async (room) => {
    const f = forms[room.id] || {};
    if (f.current === "" || f.current === null || f.current === undefined) {
      toast.error("Vartman (aaj ka) unit daalein");
      return;
    }
    const last = lastReadingFor(room.id);
    try {
      await api.post("/readings", {
        room_id: room.id,
        current_units: Number(f.current),
        reading_date: f.date || today(),
        rate_per_unit: Number(f.rate ?? (last ? last.rate_per_unit : 10)),
        notes: f.notes || "",
      });
      toast.success(`Room ${room.room_number} ki bijli entry save ho gayi`);
      setForms((prev) => ({ ...prev, [room.id]: { date: today(), current: "", rate: f.rate, notes: "" } }));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save nahi hua");
    }
  };

  const saveOpening = async (room) => {
    const f = forms[room.id] || {};
    if (f.opening === "" || f.opening === null || f.opening === undefined) {
      toast.error("Shuruaati (starting) unit daalein");
      return;
    }
    try {
      await api.post("/readings", {
        room_id: room.id,
        current_units: Number(f.opening),
        previous_units: Number(f.opening),
        reading_date: f.date || today(),
        rate_per_unit: Number(f.rate ?? 10),
        notes: "Shuruaati reading (kiraedar aaya)",
      });
      toast.success(`Room ${room.room_number} ki shuruaati unit save ho gayi`);
      setForms((prev) => ({ ...prev, [room.id]: { date: today(), opening: "", current: "", rate: f.rate } }));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save nahi hua");
    }
  };

  const removeReading = async (id) => {
    try {
      await api.delete(`/readings/${id}`);
      toast.success("Entry delete ho gayi");
      load();
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold font-display">Bijli (Electricity)</h2>
        <p className="text-sm text-slate-500">
          Sirf aaj ka meter reading aur date daalein — purana reading app khud le lega, bill ban jayega
        </p>
      </div>

      {rooms.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500" data-testid="bijli-no-rooms-msg">
          Koi aage (occupied) room nahi hai —{" "}
          <Link to="/rooms" className="text-emerald-700 font-medium underline">
            Rooms me kirayedaar jodein
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {rooms.map((room) => {
          const last = lastReadingFor(room.id);
          const hasPrior = !!last;
          const prev = last ? Number(last.current_units) : 0;
          const rate = forms[room.id]?.rate ?? (last ? last.rate_per_unit : 10);
          const f = forms[room.id] || { date: today(), current: "", opening: "", notes: "" };
          const units = Math.max(Number(f.current || 0) - prev, 0);
          const amount = Math.round(units * Number(rate || 0) * 100) / 100;
          return (
            <div key={room.id} data-testid={`reading-row-${room.id}`} className="rounded-2xl border bg-white p-4 card-lift">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="font-semibold text-sm">
                  <Zap className="w-4 h-4 inline text-amber-500 mr-1" />
                  Room {room.room_number} · {room.tenant_name || "-"}
                </p>
                <p className="text-xs text-slate-400" data-testid={`reading-prev-info-${room.id}`}>
                  {hasPrior ? (
                    <>Pichhla reading: <b>{prev}</b> ({dateLabel(last.reading_date || `${last.month}-01`)})</>
                  ) : (
                    <span className="text-amber-600 font-medium">Pehli baar — shuruaati unit daalein</span>
                  )}
                </p>
              </div>

              {!hasPrior ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-800 mb-2">
                    Jab kiraedar aaya tab meter me jitni reading thi (jaise pichhla kiraedar 50 unit chhod gaya) — wahi shuruaati unit daalein. Is par koi bill nahi banega; agli baar se sirf naya reading daalna hoga.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Shuruaati unit (starting) *</Label>
                      <Input
                        type="number"
                        data-testid={`reading-opening-input-${room.id}`}
                        value={f.opening ?? ""}
                        placeholder="jaise 50"
                        onChange={(e) => setField(room.id, "opening", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date (kiraedar aaya)</Label>
                      <Input
                        type="date"
                        data-testid={`reading-opening-date-${room.id}`}
                        value={f.date || today()}
                        onChange={(e) => setField(room.id, "date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rate (₹/unit)</Label>
                      <Input
                        type="number"
                        data-testid={`reading-rate-input-${room.id}`}
                        value={rate}
                        onChange={(e) => setField(room.id, "rate", e.target.value)}
                      />
                    </div>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 w-full"
                      onClick={() => saveOpening(room)}
                      data-testid={`reading-opening-save-btn-${room.id}`}
                    >
                      Shuru unit save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Aaj ka unit (vartman) *</Label>
                    <Input
                      type="number"
                      data-testid={`reading-current-input-${room.id}`}
                      value={f.current}
                      placeholder="meter reading"
                      onChange={(e) => setField(room.id, "current", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      data-testid={`reading-date-input-${room.id}`}
                      value={f.date || today()}
                      onChange={(e) => setField(room.id, "date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rate (₹/unit)</Label>
                    <Input
                      type="number"
                      data-testid={`reading-rate-input-${room.id}`}
                      value={rate}
                      onChange={(e) => setField(room.id, "rate", e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Bill</p>
                    <p className="font-bold font-display text-lg" data-testid={`reading-amount-${room.id}`}>
                      {rupees(amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{units} unit × ₹{rate || 0}</p>
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 w-full"
                    onClick={() => saveReading(room)}
                    data-testid={`reading-save-btn-${room.id}`}
                  >
                    Save
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saari bijli entries</CardTitle>
          <CardDescription>Ye sab room ke khate (bakaya) me jud jaati hain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {readings.length === 0 && (
            <p className="text-sm text-slate-500" data-testid="no-readings-msg">
              Abhi koi bijli entry nahi hui.
            </p>
          )}
          {readings
            .slice()
            .sort((a, b) => ((a.reading_date || a.month) > (b.reading_date || b.month) ? -1 : 1))
            .map((rd) => {
              const room = rooms.find((r) => r.id === rd.room_id);
              return (
                <div
                  key={rd.id}
                  data-testid={`saved-reading-${rd.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      Room {room?.room_number || "-"} · {dateLabel(rd.reading_date || `${rd.month}-01`)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rd.previous_units} → {rd.current_units} = {rd.units_consumed} unit × ₹{rd.rate_per_unit}
                      {rd.notes ? ` · ${rd.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{rupees(rd.amount)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => removeReading(rd.id)}
                      data-testid={`reading-delete-btn-${rd.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
