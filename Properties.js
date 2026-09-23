import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, MapPin } from "lucide-react";
import { api } from "@/lib/api";
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

const IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1782814271825-63cc2bc1ce49?crop=entropy&cs=srgb&fm=jpg&q=85",
];

const emptyForm = { name: "", address: "", notes: "" };

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.get("/properties"), api.get("/rooms")]);
      setProperties(p.data);
      setRooms(r.data);
    } catch (e) {
      toast.error("Data load nahi hua");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, address: p.address, notes: p.notes });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Property ka naam daalein");
      return;
    }
    try {
      if (editing) await api.put(`/properties/${editing.id}`, form);
      else await api.post("/properties", form);
      toast.success(editing ? "Property update ho gayi" : "Property add ho gayi");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error("Save nahi hua");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/properties/${id}`);
      toast.success("Property delete ho gayi");
      load();
    } catch (e) {
      toast.error("Delete nahi hua");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display">Properties</h2>
          <p className="text-sm text-slate-500">Aapki saari buildings/plots</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" data-testid="add-property-btn">
              <Plus className="w-4 h-4" /> Property Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Property Edit Karein" : "Nayi Property"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Property ka naam *</Label>
                <Input
                  data-testid="property-name-input"
                  placeholder="Jaise: Shanti Kunj"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pata / Address</Label>
                <Input
                  data-testid="property-address-input"
                  placeholder="Gali, sheher"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Note (optional)</Label>
                <Input
                  data-testid="property-notes-input"
                  placeholder="Koi extra jaankari"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} data-testid="property-cancel-btn">
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save} data-testid="property-save-btn">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 && (
        <p className="text-sm text-slate-500" data-testid="no-properties-msg">
          Koi property nahi hai. Pehli property add karein.
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p, i) => {
          const propRooms = rooms.filter((r) => r.property_id === p.id);
          const occupied = propRooms.filter((r) => r.status === "occupied").length;
          return (
            <div
              key={p.id}
              data-testid={`property-card-${p.id}`}
              className="rounded-2xl border bg-white overflow-hidden card-lift"
            >
              <div className="h-36 overflow-hidden bg-slate-100">
                <img
                  src={IMAGES[i % IMAGES.length]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold font-display">{p.name}</h3>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`property-edit-btn-${p.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <ConfirmDelete
                      label="Delete"
                      title={`${p.name} delete karein?`}
                      description="Iske saare rooms, bijli aur rent record bhi delete ho jayenge."
                      onConfirm={() => remove(p.id)}
                      testid={`property-delete-btn-${p.id}`}
                    />
                  </div>
                </div>
                {p.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {p.address}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                    {propRooms.length} rooms
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {occupied} aage
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                    {propRooms.length - occupied} khali
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
