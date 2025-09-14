import { useEffect, useRef, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Users, Plus, Pencil, Trash2, Building2, ChevronRight, Shield } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ApiResponse, Worker, Site, User } from "@shared/api";

export default function WorkerManagement() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedForemanId, setSelectedForemanId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", fatherName: "", designation: "", dailyWage: "", phone: "", aadhar: "" });
  const [form, setForm] = useState({
    name: "",
    fatherName: "",
    designation: "",
    phone: "",
    aadhar: "",
  });
  const isForeman = user?.role === "foreman";
  const isAdmin = user?.role === "admin";

  const didFetchRef = useRef(false);
  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    if (!isForeman) return;
    const loadWorkers = async () => {
      if (!user?.siteId) return;
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`/api/workers/site/${user.siteId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: ApiResponse<Worker[]> = await res.json();
        if (data.success && data.data) setWorkers(data.data);
      } finally {
        setLoading(false);
      }
    };
    loadWorkers();
  }, [user?.siteId, isForeman]);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const load = async () => {
      setLoading(true);
      try {
        const [u, s] = await Promise.all([
          fetch("/api/admin/users", { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r=>r.json()) as Promise<ApiResponse<User[]>>,
          fetch("/api/sites").then(r=>r.json()) as Promise<ApiResponse<Site[]>>,
        ]);
        if (u.success && u.data) setUsersList(u.data);
        if (s.success && s.data) setSites(s.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedSiteId) return;
    const token = localStorage.getItem("auth_token");
    const loadWorkers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workers/site/${selectedSiteId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data: ApiResponse<Worker[]> = await res.json();
        if (data.success && data.data) setWorkers(data.data);
      } finally {
        setLoading(false);
      }
    };
    loadWorkers();
  }, [isAdmin, selectedSiteId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForeman) return;
    const token = localStorage.getItem("auth_token");
    const designation = form.designation.trim();
    const payload = {
      name: form.name.trim(),
      fatherName: form.fatherName.trim(),
      ...(designation ? { designation } : {}),
      dailyWage: 0,
      phone: form.phone ? form.phone.trim() : undefined,
      aadhar: form.aadhar ? form.aadhar.trim() : undefined,
    };
    const res = await fetch("/api/workers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<Worker> = await res.json();
    if (res.ok && data.success && data.data) {
      setWorkers([data.data, ...workers]);
      setForm({ name: "", fatherName: "", designation: "", dailyWage: "", phone: "", aadhar: "" });
    } else {
      console.error("Add worker failed", data);
    }
  };

  const startEdit = (w: Worker) => {
    setEditingId(w.id);
    setEditForm({ name: w.name, fatherName: w.fatherName, designation: w.designation, dailyWage: String(w.dailyWage), phone: w.phone || "", aadhar: w.aadhar || "" });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const payload = {
      name: editForm.name.trim(),
      fatherName: editForm.fatherName.trim(),
      designation: editForm.designation.trim(),
      dailyWage: Number(editForm.dailyWage),
      phone: editForm.phone ? editForm.phone.trim() : undefined,
      aadhar: editForm.aadhar ? editForm.aadhar.trim() : undefined,
    };
    const res = await fetch(`/api/workers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    const data: ApiResponse<Worker> = await res.json();
    if (res.ok && data.success && data.data) {
      setWorkers(workers.map(w => (w.id === id ? data.data : w)));
      setEditingId(null);
    } else {
      console.error("Update worker failed", data);
    }
  };

  const deleteWorker = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/workers/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.ok) {
      setWorkers(workers.filter(w => w.id !== id));
    } else {
      console.error("Delete worker failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">श्रमिक जोड़ें</h1>
        <p className="text-gray-600">श्रमिक विवरण जोड़ें/संपादित करें</p>
      </div>

      {isForeman && (
        <Card>
          <CardContent className="p-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full h-12 text-base rounded-xl">श्रमिक जोड़ें</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg">नया श्रमिक जोड़ें</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">नाम</Label>
                    <Input id="name" required value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="fatherName">पिता ���ा नाम</Label>
                    <Input id="fatherName" required value={form.fatherName} onChange={(e)=>setForm({ ...form, fatherName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="designation">पद (वैकल्पिक)</Label>
                    <Input id="designation" placeholder="उदा. Mason, Helper" value={form.designation} onChange={(e)=>setForm({ ...form, designation: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="phone">फोन (वैकल्पिक)</Label>
                    <Input id="phone" value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="aadhar">आधार (वैकल्पिक)</Label>
                    <Input id="aadhar" value={form.aadhar} onChange={(e)=>setForm({ ...form, aadhar: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit">सेव करें</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> श्रमिक सूची
          </CardTitle>
          <CardDescription>आपकी साइट के श्रमिक</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : workers.length === 0 ? (
            <div className="text-gray-500">No workers found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>नाम</TableHead>
                    <TableHead>पिता का नाम</TableHead>
                    <TableHead>फोन</TableHead>
                    <TableHead className="w-40 text-right">एक्शन</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id}>
                      {editingId === w.id ? (
                        <>
                          <TableCell><Input value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} /></TableCell>
                          <TableCell><Input value={editForm.fatherName} onChange={(e)=>setEditForm({...editForm, fatherName: e.target.value})} /></TableCell>
                          <TableCell><Input value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone: e.target.value})} /></TableCell>
                          <TableCell className="text-right space-x-2">
                            <ConfirmDialog
                              title="परिवर्तन सहेजें?"
                              description="क्या आप इस श्रमिक के बदलाव सहेजना चाहते हैं?"
                              confirmText="सेव करें"
                              cancelText="रद्द करें"
                              onConfirm={() => saveEdit(w.id)}
                              trigger={<Button size="sm">सेव</Button>}
                            />
                            <Button size="sm" variant="outline" onClick={cancelEdit}>रद्द करें</Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{w.name}</TableCell>
                          <TableCell>{w.fatherName}</TableCell>
                          <TableCell>{w.phone || "उपलब्ध नहीं"}</TableCell>
                          <TableCell className="text-right space-x-3">
                            {isForeman && (
                              <>
                                <Button size="sm" variant="outline" className="rounded-xl px-2" onClick={()=>startEdit(w)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <ConfirmDialog
                                  title="श्रमिक हटाएं?"
                                  description="क्या आप इस श्रमिक को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।"
                                  confirmText="हटाएं"
                                  cancelText="��द्द करें"
                                  onConfirm={() => deleteWorker(w.id)}
                                  trigger={<Button size="sm" variant="destructive" className="rounded-xl px-2"><Trash2 className="h-4 w-4" /></Button>}
                                />
                              </>
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
