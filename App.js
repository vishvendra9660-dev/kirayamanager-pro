import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import "@/App.css";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import Rooms from "@/pages/Rooms";
import Electricity from "@/pages/Electricity";
import Khata from "@/pages/Khata";
import TenantPortal from "@/pages/TenantPortal";
import Report from "@/pages/Report";
import { Toaster } from "@/components/ui/sonner";

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/tenant" element={<TenantPortal />} />
          <Route path="/report" element={<Report />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/bijli" element={<Electricity />} />
                  <Route path="/rent" element={<Khata />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
