import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
};

export const lastMonths = (n = 12) => {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

export const waLink = (phone, text) => {
  let p = (phone || "").replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
};

export const dateLabel = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const methodLabel = (m) => {
  const map = { cash: "Cash", upi: "UPI", bank: "Bank Transfer", netbanking: "NetBanking", cheque: "Cheque" };
  return map[m] || (m ? m.toUpperCase() : "Cash");
};
