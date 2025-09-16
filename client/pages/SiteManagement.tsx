import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import { Building2, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import { ApiResponse, Site, User } from "@shared/api";

export default function SiteManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    fatherName: "",
    username: "",
    password: "",
    siteId: "",
  });

  const [userForm, setUserForm] = useState({
    role: "site_incharge" as "site_incharge" | "foreman",
    name: "",
    fatherName: "",
    username: "",
    password: "",
    siteId: "",
  });

  const [siteForm, setSiteForm] = useState({
    name: "",
    location: "",
    inchargeId: "",
    foremanIds: [] as string[],
  });

  const siteIncharges = useMemo(
    () => users.filter((u) => u.role === "site_incharge"),
    [users],
  );
  const foremen = useMemo(
    () => users.filter((u) => u.role === "foreman"),
    [users],
  );

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const load = async () => {
      if (isAdmin) {
        const [u, s] = await Promise.all([
          fetch("/api/admin/users", { headers }).then(
            (r) => r.json() as Promise<ApiResponse<User[]>>,
          ),
          fetch("/api/sites", { headers }).then(
            (r) => r.json() as Promise<ApiResponse<Site[]>>,
          ),
        ]);
        if (u.success && u.data) setUsers(u.data);
        if (s.success && s.data) setSites(s.data);
      }
    };
    load();
  }, [isAdmin]);

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(userForm),
    });
    const data: ApiResponse<{ user: User }> = await res.json();
    if (res.ok && data.success && data.data) {
      setUsers([data.data.user, ...users]);
      setUserForm({
        role: "site_incharge",
        name: "",
        fatherName: "",
        username: "",
        password: "",
        siteId: "",
      });
    } else {
      console.error("Create user failed", data);
    }
  };

  const submitSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const token = localStorage.getItem("auth_token");
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(siteForm),
    });
    const data: ApiResponse<Site> = await res.json();
    if (res.ok && data.success && data.data) {
      setSites([data.data, ...sites]);
      setSiteForm({ name: "", location: "", inchargeId: "", foremanIds: [] });
    } else {
      console.error("Create site failed", data);
    }
  };

  const startEdit = (u: User) => {
    setEditingUserId(u.id);
    setEditForm({
      name: u.name,
      fatherName: (u as any).fatherName || "",
      username: u.username,
      password: "",
      siteId: u.siteId || "",
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const saveEdit = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(editForm),
    });
    const data: ApiResponse<{ user: User }> = await res.json();
    if (res.ok && data.success && data.data) {
      setUsers(users.map((u) => (u.id === id ? data.data.user : u)));
      setEditingUserId(null);
    } else {
      console.error("Update user failed", data);
    }
  };

  const deleteUser = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
        <p className="text-gray-600">Only admins can manage sites and users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Site & User Management
        </h1>
        <p className="text-gray-600">
          Create users and sites, assign roles to sites
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create User
          </CardTitle>
          <CardDescription>
            Admin can create Site Incharges and Foremen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submitUser}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="border rounded-md h-10 px-3 w-full"
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({ ...userForm, role: e.target.value as any })
                }
              >
                <option value="site_incharge">Site Incharge</option>
                <option value="foreman">Foreman</option>
              </select>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="fatherName">Father Name (optional)</Label>
              <Input
                id="fatherName"
                value={userForm.fatherName}
                onChange={(e) =>
                  setUserForm({ ...userForm, fatherName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="siteId">Assign to Site (optional)</Label>
              <select
                id="siteId"
                className="border rounded-md h-10 px-3 w-full"
                value={userForm.siteId}
                onChange={(e) =>
                  setUserForm({ ...userForm, siteId: e.target.value })
                }
              >
                <option value="">-- None --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Create Site
          </CardTitle>
          <CardDescription>Assign a Site Incharge and Foremen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitSite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  required
                  value={siteForm.name}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  required
                  value={siteForm.location}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="incharge">Site Incharge</Label>
                <select
                  id="incharge"
                  className="border rounded-md h-10 px-3 w-full"
                  value={siteForm.inchargeId}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, inchargeId: e.target.value })
                  }
                >
                  <option value="">-- None --</option>
                  {siteIncharges.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label>Assign Foremen</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {foremen.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 border rounded p-2"
                  >
                    <input
                      type="checkbox"
                      checked={siteForm.foremanIds.includes(f.id)}
                      onChange={(e) => {
                        setSiteForm((s) => ({
                          ...s,
                          foremanIds: e.target.checked
                            ? [...s.foremanIds, f.id]
                            : s.foremanIds.filter((id) => id !== f.id),
                        }));
                      }}
                    />
                    <span>{f.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit">Create Site</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Site Incharges</CardTitle>
            <CardDescription>Manage Site Incharges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {siteIncharges.length === 0 && (
                <div className="text-gray-500">No site incharges.</div>
              )}
              {siteIncharges.map((u) => (
                <div key={u.id} className="border rounded p-3">
                  {editingUserId === u.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Father Name"
                        value={editForm.fatherName}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            fatherName: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Username"
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm({ ...editForm, username: e.target.value })
                        }
                      />
                      <Input
                        type="password"
                        placeholder="New Password (optional)"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, password: e.target.value })
                        }
                      />
                      <div className="md:col-span-2 flex gap-2 justify-end">
                        <ConfirmDialog
                          title="Save changes?"
                          description="Do you want to save changes for this user?"
                          confirmText="Save"
                          cancelText="Cancel"
                          onConfirm={() => saveEdit(u.id)}
                          trigger={
                            <Button size="sm">
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">
                          {u.username}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete user?"
                          description="Are you sure you want to delete this user? This action cannot be undone."
                          confirmText="Delete"
                          cancelText="Cancel"
                          onConfirm={() => deleteUser(u.id)}
                          trigger={
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foremen</CardTitle>
            <CardDescription>Manage Foremen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {foremen.length === 0 && (
                <div className="text-gray-500">No foremen.</div>
              )}
              {foremen.map((u) => (
                <div key={u.id} className="border rounded p-3">
                  {editingUserId === u.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Father Name"
                        value={editForm.fatherName}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            fatherName: e.target.value,
                          })
                        }
                      />
                      <Input
                        placeholder="Username"
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm({ ...editForm, username: e.target.value })
                        }
                      />
                      <Input
                        type="password"
                        placeholder="New Password (optional)"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, password: e.target.value })
                        }
                      />
                      <div className="md:col-span-2 flex gap-2 justify-end">
                        <ConfirmDialog
                          title="Save changes?"
                          description="Do you want to save changes for this user?"
                          confirmText="Save"
                          cancelText="Cancel"
                          onConfirm={() => saveEdit(u.id)}
                          trigger={
                            <Button size="sm">
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">
                          {u.username}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete user?"
                          description="Are you sure you want to delete this user? This action cannot be undone."
                          confirmText="Delete"
                          cancelText="Cancel"
                          onConfirm={() => deleteUser(u.id)}
                          trigger={
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sites Overview</CardTitle>
          <CardDescription>Site → Incharge → Foremen</CardDescription>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-gray-500">No sites found.</div>
          ) : (
            <div className="space-y-4">
              {sites.map((s) => (
                <div key={s.id} className="p-4 border rounded-lg">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-gray-600">
                    Incharge: {s.inchargeName || "Not assigned"}
                  </div>
                  <div className="mt-2 ml-4 text-sm text-gray-700">
                    <div className="font-medium">Foremen:</div>
                    <ul className="list-disc list-inside">
                      {foremen
                        .filter((f) => f.siteId === s.id)
                        .map((f) => (
                          <li key={f.id}>{f.name}</li>
                        ))}
                      {foremen.filter((f) => f.siteId === s.id).length ===
                        0 && <li className="text-gray-500">None</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
