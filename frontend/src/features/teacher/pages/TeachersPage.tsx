import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { toast } from "sonner";

import { SearchX, Plus, Pencil, Trash2, Eye } from "lucide-react";

import DataTable from "@/components/ui/DataTable";

import SearchBar from "@/components/shared/SearchBar";

import Pagination from "@/components/ui/Pagination";

import Button from "@/components/ui/Button";

import ConfirmModal from "@/components/ui/ConfirmModal";

import RowsPerPageSelect from "@/components/ui/RowsPerPageSelect";

import StatusBadge from "@/components/ui/StatusBadge";

import { useTableSearch } from "@/hooks/useTableSearch";

import AddTeacherModal from "../components/AddTeacherModal";

import EditTeacherModal from "../components/EditTeacherModal";

import TeacherActionCell from "../components/TeacherActionCell";

import TeacherAttendance from "../components/TeacherAttendance";

import TeacherDetails from "../components/TeacherDetails";
import TeacherFilters from "../components/TeacherFilters";
import ManagerAssignments from "../../assignments/components/ManagerAssignments";

import { useTeacherFilters } from "../hooks/useTeacherFilters";

import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "../services/teacher.service";

import { useAuthStore } from "@/features/auth/store/authStore";

import type { Teacher } from "../types/teacher.types";

const DEFAULT_ITEMS_PER_PAGE = 5;

export const TeachersPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const user = useAuthStore(state => state.user);

  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<"DIRECTORY" | "ATTENDANCE" | "ASSIGNMENTS">("DIRECTORY");

  /* ========================= */
  /* FETCH TEACHERS */
  /* ========================= */

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const data = await getTeachers(user?.schoolId);
        setTeachers(data || []);
      } catch (err: any) {
        console.error("Failed to load teachers from backend:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadTeachers();
  }, [user?.schoolId]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsAddModalOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("action");
      setSearchParams(nextParams, { replace: true });
    }
  }, []);

  /* ========================= */
  /* SEARCH & FILTERS */
  /* ========================= */

  const { searchQuery, setSearchQuery, filteredData: searchFilteredData } = useTableSearch({
    data: teachers,

    searchableKeys: [
      "fullName",
      "email",
      "department",
      "subject",
      "employeeId",
    ],
  });

  const {
    selectedStatus,
    setSelectedStatus,
    selectedDepartment,
    setSelectedDepartment,
    selectedSubject,
    setSelectedSubject,
    experienceRange,
    setExperienceRange,
    departments,
    subjects,
    filteredTeachers,
  } = useTeacherFilters(searchFilteredData);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  /* ========================= */
  /* ADD TEACHER */
  /* ========================= */

  const handleAddTeacher = async (newTeacher: Teacher) => {
    try {
      const created = await createTeacher(newTeacher);
      setTeachers((previous) => [created, ...previous]);
      toast.success("Teacher added successfully");
    } catch (error: any) {
      console.error("Failed to add teacher:", error);
      toast.error(error?.message || "Failed to add teacher");
    }
  };

  /* ========================= */
  /* DELETE TEACHER */
  /* ========================= */

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteTeacher(teacherId);
      setTeachers((previous) =>
        previous.filter((teacher) => teacher.id !== teacherId),
      );
      toast.success("Teacher deleted successfully");
    } catch (error) {
      toast.error("Failed to delete teacher");
    }
  };

  /* ========================= */
  /* UPDATE TEACHER */
  /* ========================= */

  const handleUpdateTeacher = async (updatedTeacher: Teacher) => {
    try {
      const saved = await updateTeacher(updatedTeacher);
      setTeachers((previous) =>
        previous.map((teacher) =>
          teacher.id === saved.id ? saved : teacher,
        ),
      );
      toast.success("Teacher updated successfully");
      setEditingTeacher(null);
    } catch (error) {
      toast.error("Failed to update teacher");
    }
  };

  /* ========================= */
  /* PAGINATION */
  /* ========================= */

  const paginatedTeachers = useMemo(() => {
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

    const safePage = (totalPages > 0 && currentPage > totalPages) ? 1 : currentPage;

    const startIndex = (safePage - 1) * itemsPerPage;

    return filteredTeachers.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredTeachers, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Teachers</h1>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {teachers.length} Records
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage teacher records and staff data.
            </p>
          </div>

          {/* RIGHT */}
          {activeTab === "DIRECTORY" && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchBar
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              {/* Mobile-only + button */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex md:hidden items-center justify-center rounded-full bg-primary text-white w-10 h-10 shrink-0 shadow-md"
                aria-label="Add Teacher"
              >
                <Plus className="w-5 h-5" />
              </button>
              {/* Desktop: rows select + add button */}
              <div className="hidden md:flex items-center gap-2">
                <RowsPerPageSelect value={itemsPerPage} onChange={setItemsPerPage} />
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition shadow-md flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add Teacher
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================= */}
      {/* TABS */}
      {/* ========================= */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        <button
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "DIRECTORY"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          onClick={() => setActiveTab("DIRECTORY")}
        >
          Teacher Directory
        </button>
        <button
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "ATTENDANCE"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          onClick={() => setActiveTab("ATTENDANCE")}
        >
          Attendance
        </button>
        <button
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "ASSIGNMENTS"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
          onClick={() => setActiveTab("ASSIGNMENTS")}
        >
          All Assignments
        </button>
      </div>

      {activeTab === "DIRECTORY" ? (
        <div className="space-y-4">
          {/* FILTERS */}
          <TeacherFilters
            departments={departments}
            subjects={subjects}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedDepartment={selectedDepartment}
            setSelectedDepartment={setSelectedDepartment}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            experienceRange={experienceRange}
            setExperienceRange={setExperienceRange}
          />

          {/* ========================= */}
          {/* MOBILE CARD VIEW */}
          {/* ========================= */}
          {/* ========================= */}
          {/* DATA TABLE (Handles both mobile and desktop) */}
          {/* ========================= */}
          <DataTable
            data={paginatedTeachers}
            loading={loading}
            selectable={true}
            renderExpandedRow={(row) => <TeacherDetails row={row} />}
            renderMobileCard={(teacher, isSelected, onSelect) => (
              <div
                className={`bg-white dark:bg-slate-800 border ${
                  isSelected ? "border-primary ring-1 ring-primary" : "border-slate-200 dark:border-slate-700"
                } rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative`}
              >
                <div className="absolute top-4 right-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </div>
                
                {/* Card Header */}
                <div className="flex items-start gap-3 mb-3 pr-8">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center shrink-0">
                    {teacher.fullName?.charAt(0)?.toUpperCase() ?? "T"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{teacher.fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{teacher.email}</p>
                  </div>
                  <StatusBadge
                    label={teacher.status}
                    variant={teacher.status === "ACTIVE" ? "success" : "danger"}
                  />
                </div>

                {/* Card Details */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-slate-400 text-xs">Employee ID</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{teacher.employeeId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Department</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{teacher.department}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Subject</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{teacher.subject}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Experience</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{teacher.experienceYears} yrs</p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setEditingTeacher(teacher)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition min-h-[40px]"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingTeacherId(teacher.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 transition min-h-[40px]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                  <button
                    onClick={() => setEditingTeacher(teacher)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition min-h-[40px]"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                </div>
              </div>
            )}
            emptyMessage={
              searchQuery ? "No teachers found" : "No teacher records available"
            }
            emptyDescription={
              searchQuery
                ? "Try searching with another name, subject, or department."
                : "Teachers added to your school will appear here."
            }
            emptyIcon={<SearchX className="h-10 w-10" />}
            columns={[
              { key: "fullName", header: "Teacher" },
              { key: "employeeId", header: "Employee ID" },
              { key: "department", header: "Department" },
              { key: "subject", header: "Subject" },
              {
                key: "status",
                header: "Status",
                render: (value) => (
                  <StatusBadge
                    label={String(value)}
                    variant={value === "ACTIVE" ? "success" : "danger"}
                  />
                ),
              },
              {
                key: "id",
                header: "Actions",
                sortable: false,
                render: (_, row) => (
                  <TeacherActionCell
                    row={row}
                    onEdit={setEditingTeacher}
                    onDelete={setDeletingTeacherId}
                  />
                ),
              },
            ]}
          />

          {/* PAGINATION */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(filteredTeachers.length / itemsPerPage))}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : activeTab === "ATTENDANCE" ? (
        <TeacherAttendance teachers={teachers} />
      ) : (
        <ManagerAssignments />
      )}

      {/* ========================= */}
      {/* ADD MODAL */}
      {/* ========================= */}

      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTeacher={handleAddTeacher}
      />

      {/* ========================= */}
      {/* EDIT MODAL */}
      {/* ========================= */}

      <EditTeacherModal
        teacher={editingTeacher}
        onClose={() => setEditingTeacher(null)}
        onUpdateTeacher={handleUpdateTeacher}
      />

      {/* ========================= */}
      {/* DELETE CONFIRM MODAL */}
      {/* ========================= */}

      <ConfirmModal
        isOpen={Boolean(deletingTeacherId)}
        title="Delete Teacher"
        message="Are you sure you want to delete this teacher? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => setDeletingTeacherId(null)}
        onConfirm={() => {
          if (deletingTeacherId) {
            handleDeleteTeacher(deletingTeacherId);

            setDeletingTeacherId(null);
          }
        }}
      />
    </div>
  );
};

export default TeachersPage;
