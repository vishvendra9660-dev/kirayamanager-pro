import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import { api, rupees, dateLabel, monthLabel, currentMonth } from "@/lib/api";
import { Button } from "@/components/ui/button";

const firstOfMonth = (ym) => `${ym}-01`;

export default function Report() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("all");
  const [startDate, setStartDate] = useState(firstOfMonth(currentMonth()));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/rooms", { params: { status: "occupied" } }).then((r) => setRooms(r.data)).catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      if (roomId !== "all") params.room_id = roomId;
      const res = await api.get("/report", { params });
      setData(res.data);
    } catch (e) {
      setData({ error: true });
    }
    setLoading(false);
  }, [startDate, endDate, roomId]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 print:bg-white print:p-0" data-testid="report-page">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 no-print">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" /> Report banayein
            </h2>
            <Link to="/">
              <Button variant="ghost" size="sm" data-testid="report-back-btn">
                <ArrowLeft className="w-4 h-4 mr-1" /> Wapas
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Room</label>
              <select
                data-testid="report-room-select"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
              >
                <option value="all">Saare rooms (sabhi)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} · {r.tenant_name || "-"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Start date</label>
              <input
                type="date"
                data-testid="report-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">End date</label>
              <input
                type="date"
                data-testid="report-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
                onClick={generate}
                disabled={loading}
                data-testid="report-generate-btn"
              >
                {loading ? "Ban raha hai..." : "Report banayein"}
              </Button>
            </div>
          </div>
        </div>

        {data && !data.error && (
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-10 print:rounded-none print:shadow-none">
            <div className="flex items-start justify-between gap-3 border-b-2 border-[#0F172A] pb-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold font-display">Room Hisaab</h1>
                <p className="text-sm text-slate-500">
                  Report · {dateLabel(data.start_date)} se {dateLabel(data.end_date)} tak
                  {roomId !== "all" && rooms.find((r) => r.id === roomId)
                    ? ` · Room ${rooms.find((r) => r.id === roomId).room_number}`
                    : " · Saare rooms"}
                </p>
                <p className="text-[11px] text-slate-400">Banaya gaya: {dateLabel(data.generated_at)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center print:hidden">
                <span className="text-white font-bold font-display">RH</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Rent (period)", value: rupees(data.totals.rent) },
                { label: "Bijli (period)", value: rupees(data.totals.bijli) },
                { label: "Jama (period)", value: rupees(data.totals.paid) },
                { label: "Kul Bakaya (aaj)", value: rupees(data.totals.pending) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-lg font-bold font-display">{s.value}</p>
                  <p className="text-[11px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto" data-testid="report-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 border-b">
                    <th className="py-2 px-2">Room</th>
                    <th className="py-2 px-2">Kirayedaar</th>
                    <th className="py-2 px-2 text-right">Mahine</th>
                    <th className="py-2 px-2 text-right">Rent</th>
                    <th className="py-2 px-2 text-right">Bijli</th>
                    <th className="py-2 px-2 text-right">Jama</th>
                    <th className="py-2 px-2 text-right">Bakaya</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.room_id} className="border-b" data-testid={`report-row-${r.room_number}`}>
                      <td className="py-2 px-2 font-medium">{r.room_number}</td>
                      <td className="py-2 px-2">{r.tenant_name || "-"}</td>
                      <td className="py-2 px-2 text-right">{r.months}</td>
                      <td className="py-2 px-2 text-right">{rupees(r.rent)}</td>
                      <td className="py-2 px-2 text-right">{r.bijli ? rupees(r.bijli) : "-"}</td>
                      <td className="py-2 px-2 text-right text-emerald-700">{r.paid ? rupees(r.paid) : "-"}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${r.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {rupees(r.balance)}
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        Is period me koi occupied room nahi mila.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#0F172A] font-bold">
                      <td className="py-2 px-2" colSpan={3}>Total</td>
                      <td className="py-2 px-2 text-right">{rupees(data.totals.rent)}</td>
                      <td className="py-2 px-2 text-right">{rupees(data.totals.bijli)}</td>
                      <td className="py-2 px-2 text-right">{rupees(data.totals.paid)}</td>
                      <td className="py-2 px-2 text-right">{rupees(data.totals.pending)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {data.payments_detail && data.payments_detail.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold font-display text-sm mb-2">
                  Payment history (is period ki) — kab · kitna · kaise
                </p>
                <div className="space-y-1.5">
                  {data.payments_detail.map((pm) => (
                    <p key={pm.id} className="text-sm border-b pb-1.5" data-testid={`report-payment-${pm.id}`}>
                      {dateLabel(pm.paid_date)} · Room {pm.room_number} ·{" "}
                      <b>{rupees(pm.amount)}</b> · {pm.method ? pm.method.toUpperCase() : "CASH"}
                      {pm.notes ? ` · ${pm.notes}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-6 text-center">
              Ye report Room Hisaab app se banayi gayi hai
            </p>
          </div>
        )}

        {data && data.error && (
          <p className="text-sm text-slate-500 bg-white rounded-xl p-6">Report load nahi hua</p>
        )}

        {data && !data.error && (
          <div className="flex gap-2 no-print">
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => window.print()} data-testid="report-print-btn">
              <Printer className="w-4 h-4" /> Print / PDF save karein
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
