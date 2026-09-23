import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { House, LogOut, CircleCheck, IndianRupee, RefreshCw, Smartphone } from "lucide-react";
import { api, rupees, monthLabel, dateLabel, methodLabel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TenantPortal() {
  const [token, setToken] = useState(() => localStorage.getItem("tenant_token"));
  const [khata, setKhata] = useState(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const loadKhata = useCallback(async (t) => {
    try {
      const res = await api.get("/tenant/khata", { headers: { Authorization: `Bearer ${t}` } });
      setKhata(res.data);
    } catch (e) {
      localStorage.removeItem("tenant_token");
      setToken(null);
      setKhata(null);
    }
  }, []);

  useEffect(() => {
    if (token) loadKhata(token);
  }, [token, loadKhata]);

  const login = async () => {
    if (!phone.trim() || !pin.trim()) {
      toast.error("Phone aur PIN dono daalein");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/tenant/login", { phone, pin });
      localStorage.setItem("tenant_token", res.data.token);
      setToken(res.data.token);
      toast.success(`Swagat ${res.data.tenant_name || "ji"}!`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Login fail hua");
    }
    setBusy(false);
  };

  const logout = () => {
    localStorage.removeItem("tenant_token");
    setToken(null);
    setKhata(null);
  };

  const doInstall = async () => {
    if (installEvt) {
      installEvt.prompt();
      setInstallEvt(null);
    } else {
      toast.info("Chrome menu (⋮) kholkar 'Add to Home screen' chunein — app jaisa icon ban jayega");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0F172A] text-white px-4 py-3 flex items-center gap-3 grain-overlay">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
          <House className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h1 className="font-display font-bold leading-tight">Kirayedaar Portal</h1>
          <p className="text-[11px] text-white/60">Sirf apna khata dekhein</p>
        </div>
        <button
          onClick={doInstall}
          data-testid="tenant-install-btn"
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" /> App install
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {!token && (
          <Card className="mt-8">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold font-display">Apna hisaab dekhein</h2>
                <p className="text-sm text-slate-500">
                  Apna registered phone number aur 4-digit PIN daalein (PIN aapke malik ne diya hoga)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input
                  type="tel"
                  data-testid="tenant-phone-input"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>4-digit PIN</Label>
                <Input
                  data-testid="tenant-pin-input"
                  placeholder="••••"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 w-full"
                onClick={login}
                disabled={busy}
                data-testid="tenant-login-btn"
              >
                {busy ? "Login ho raha hai..." : "Login karein"}
              </Button>
            </CardContent>
          </Card>
        )}

        {token && khata && (
          <div className="mt-6 space-y-5" data-testid="tenant-khata-view">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  {khata.tenant_name || "Kirayedaar"} · Room {khata.room_number}
                </p>
                <p
                  className={`text-3xl font-bold font-display ${
                    khata.summary.balance > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                  data-testid="tenant-balance"
                >
                  {rupees(khata.summary.balance)}
                </p>
                <p className="text-xs text-slate-500">
                  {khata.summary.balance > 0 ? "Kul bakaya" : "Hisaab clear"} · Rent{" "}
                  {rupees(khata.summary.rent_amount)}/mahina
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => loadKhata(token)} data-testid="tenant-refresh-btn">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-200"
                  onClick={logout}
                  data-testid="tenant-logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-rose-100">
                <CardContent className="p-3 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-rose-600" />
                  <div>
                    <p className="font-bold">{rupees(khata.summary.total_billed)}</p>
                    <p className="text-[11px] text-slate-500">Kul jur (rent + bijli)</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-100">
                <CardContent className="p-3 flex items-center gap-2">
                  <CircleCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-bold">{rupees(khata.summary.total_paid)}</p>
                    <p className="text-[11px] text-slate-500">Kul jama aapka</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <p className="font-semibold font-display text-sm mb-2">Mahine-dar-mahine khata</p>
              <div className="overflow-x-auto" data-testid="tenant-table">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b">
                      <th className="py-2 pr-3">Mahina</th>
                      <th className="py-2 pr-3">Rent</th>
                      <th className="py-2 pr-3">Bijli</th>
                      <th className="py-2 pr-3">Aapka jama</th>
                      <th className="py-2">Bakaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khata.rows.map((row) => (
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
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <p className="font-semibold font-display text-sm mb-2">
                Aapki payment history (kab · kitna · kaise)
              </p>
              <div className="space-y-2">
                {khata.payments.length === 0 && (
                  <p className="text-sm text-slate-500" data-testid="tenant-no-payments-msg">
                    Koi payment record nahi hai.
                  </p>
                )}
                {khata.payments
                  .slice()
                  .reverse()
                  .map((pm) => (
                    <div
                      key={pm.id}
                      data-testid={`tenant-payment-row-${pm.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
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
                      <CircleCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {token && !khata && (
          <p className="mt-8 text-sm text-slate-400" data-testid="tenant-loading-msg">
            Khata load ho raha hai...
          </p>
        )}
      </main>
    </div>
  );
}
