import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: "", phone: "", blood_group: "",
    emergency_contact_name: "", emergency_contact_phone: "", medical_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        blood_group: user.blood_group || "",
        emergency_contact_name: user.emergency_contact_name || "",
        emergency_contact_phone: user.emergency_contact_phone || "",
        medical_notes: user.medical_notes || "",
      });
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", form);
      setUser(data);
      toast.success("Profile saved", { description: "Your medical info will help responders." });
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-400 grid place-items-center text-white font-display font-black text-xl">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">{user?.name}</h1>
            <p className="text-sm text-slate-500 font-body">{user?.email}</p>
          </div>
        </div>

        <Card className="mt-6 border-slate-200 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="font-display font-bold text-lg text-slate-900">Medical & emergency info</h2>
          </div>
          <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" id="name" value={form.name} onChange={(v)=>setForm({...form,name:v})} testid="profile-name-input"/>
            <Field label="Phone" id="phone" value={form.phone} onChange={(v)=>setForm({...form,phone:v})} testid="profile-phone-input"/>

            <div>
              <Label className="font-body font-semibold text-slate-700">Blood group</Label>
              <Select value={form.blood_group} onValueChange={(v)=>setForm({...form,blood_group:v})}>
                <SelectTrigger className="mt-1.5 h-11 font-body" data-testid="profile-blood-trigger">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Field label="Emergency contact name" id="ec_name" value={form.emergency_contact_name} onChange={(v)=>setForm({...form,emergency_contact_name:v})} testid="profile-ec-name-input"/>
            <Field label="Emergency contact phone" id="ec_phone" value={form.emergency_contact_phone} onChange={(v)=>setForm({...form,emergency_contact_phone:v})} testid="profile-ec-phone-input"/>

            <div className="sm:col-span-2">
              <Label className="font-body font-semibold text-slate-700">Medical notes (allergies, conditions)</Label>
              <Input
                value={form.medical_notes}
                onChange={(e)=>setForm({...form,medical_notes:e.target.value})}
                placeholder="e.g. Penicillin allergy, Type 1 Diabetes"
                data-testid="profile-medical-notes-input"
                className="mt-1.5 h-11 font-body"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button type="submit" disabled={saving} data-testid="profile-save-btn" className="h-11 px-5 font-display font-bold bg-slate-900 hover:bg-slate-800 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Save className="h-4 w-4 mr-2"/>Save profile</>}
              </Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}

function Field({ label, id, value, onChange, testid }) {
  return (
    <div>
      <Label htmlFor={id} className="font-body font-semibold text-slate-700">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        data-testid={testid}
        className="mt-1.5 h-11 font-body"
      />
    </div>
  );
}
