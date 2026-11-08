import { useState, useEffect } from "react";
import DashboardHeader from "../components/DashboardHeader";
import { Building2, Plus, School, Users, CheckCircle2 } from "lucide-react";
import AddSchoolModal from "../../superadmin/components/AddSchoolModal";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { getSchools, type SchoolEntry } from "../../superadmin/services/school.service";

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await getSchools();
      setSchools(data || []);
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolAdded = () => {
    loadSchools();
    setIsModalOpen(false);
    toast.success("School and Manager created successfully!");
  };

  const activeCount = schools.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <DashboardHeader
          title="Super Admin Dashboard"
          subtitle="Manage all registered schools and tenants from one centralized location."
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus className="h-5 w-5" />
          Add New School
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Schools</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{loading ? "..." : schools.length}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Tenants</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{loading ? "..." : activeCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
            <Users className="h-7 w-7 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Managers</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{loading ? "..." : schools.length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <School className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">School Management Hub</h2>
        <p className="text-slate-500 max-w-lg mb-6">
          Access the dedicated schools portal to register new schools, manage manager credentials, and toggle subscription statuses for all tenants.
        </p>
        <Link
          to="/schools"
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary/20"
        >
          Manage Schools
        </Link>
      </div>

      {isModalOpen && (
        <AddSchoolModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSchoolAdded}
        />
      )}
    </div>
  );
}
