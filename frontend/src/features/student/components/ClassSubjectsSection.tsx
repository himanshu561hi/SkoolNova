import { useState, useEffect } from "react";
import { BookOpen, Plus, X, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getClassSubjectsAsync, saveClassSubjects, getClassesAsync, saveClasses } from "../services/class-subjects.service";

const STANDARD_SUBJECTS = [
  "English", "Hindi", "Mathematics", "Science", "Social Science",
  "Physics", "Chemistry", "Biology", "Computer Science",
  "Accountancy", "Business Studies", "Economics", "History", "Geography",
  "Physical Education", "Art & Craft", "EVS", "Moral Science", "Computer"
];

export default function ClassSubjectsSection() {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER" || user?.role === "SCHOOL_MANAGER";

  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [classes, setClasses] = useState<string[]>([]);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  const toggleExpand = (cls: string) => {
    setExpandedClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };
  const [newClassName, setNewClassName] = useState("");
  const [isAddingClass, setIsAddingClass] = useState(false);

  useEffect(() => {
    // Load existing data from DB
    const loadData = async () => {
      const [loadedClasses, loadedMapping] = await Promise.all([
        getClassesAsync(user?.schoolId),
        getClassSubjectsAsync(user?.schoolId),
      ]);
      setClasses(loadedClasses);
      setMapping(loadedMapping);
    };
    loadData();
  }, [user?.schoolId]);

const handleAddClass = () => {
  if (!newClassName.trim()) return;
  const clsName = newClassName.trim();
  if (classes.includes(clsName)) {
    toast.error(`Class ${clsName} already exists`);
    return;
  }
  const updated = [...classes, clsName];
  setClasses(updated);
  // Initialize empty subjects for the new class
  setMapping(prev => {
    const newMapping = { ...prev, [clsName]: [] };
    saveClassSubjects(newMapping, user?.schoolId);
    return newMapping;
  });
  saveClasses(updated, user?.schoolId);
  setNewClassName("");
  setIsAddingClass(false);
  toast.success(`Class ${clsName} added successfully`);
};

  const handleDeleteClass = (cls: string) => {
    if (confirm(`Are you sure you want to delete Class ${cls}? All its assigned subjects will be removed.`)) {
      const updatedClasses = classes.filter(c => c !== cls);
      setClasses(updatedClasses);
      saveClasses(updatedClasses, user?.schoolId);
      
      setMapping(prev => {
        const next = { ...prev };
        delete next[cls];
        saveClassSubjects(next, user?.schoolId);
        return next;
      });
      
      toast.success(`Class ${cls} deleted`);
    }
  };

  const handleAddSubject = (cls: string, subject: string) => {
    if (!subject.trim()) return;
    
    setMapping(prev => {
      const classSubs = prev[cls] || [];
      if (classSubs.includes(subject)) {
        toast.error(`${subject} is already added to Class ${cls}`);
        return prev;
      }
      
      const newMapping = {
        ...prev,
        [cls]: [...classSubs, subject]
      };
      
      saveClassSubjects(newMapping, user?.schoolId);
      toast.success(`${subject} added to Class ${cls}`);
      return newMapping;
    });
    
    setNewSubject("");
  };

  const handleRemoveSubject = (cls: string, subject: string) => {
    setMapping(prev => {
      const classSubs = prev[cls] || [];
      const newMapping = {
        ...prev,
        [cls]: classSubs.filter(s => s !== subject)
      };
      
      saveClassSubjects(newMapping, user?.schoolId);
      toast.info(`${subject} removed from Class ${cls}`);
      return newMapping;
    });
};
  const handleClearAllSubjects = () => {
    if (!isManager) return;
    if (confirm('Are you sure you want to remove all subjects from all classes?')) {
      const emptyMapping: Record<string, string[]> = {};
      setMapping(emptyMapping);
      saveClassSubjects(emptyMapping, user?.schoolId);
      toast.success('All subjects cleared');
    }
  };
  


  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Class Subject Mapping
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Assign subjects to specific classes. These subjects will be available when scheduling exams for the class.
          </p>
        </div>
        {isManager && (
<div className="flex flex-nowrap gap-2">
  <button
    onClick={() => setIsAddingClass(true)}
    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-primary-700 transition shadow-md flex items-center justify-center gap-2"
  >
    <Plus className="w-5 h-5" /> Add New Class
  </button>
  <button
    onClick={handleClearAllSubjects}
    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-base font-medium hover:bg-red-800 transition shadow-md flex items-center justify-center gap-2"
  >
    <Trash2 className="w-5 h-5" /> Clear All Subjects
  </button>
</div>
        )}
      </div>

      <div className="p-4 md:p-6">
        {isAddingClass && (
          <div className="mb-6 p-5 border border-primary/30 bg-primary/5 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <h4 className="font-bold text-primary whitespace-nowrap">New Class Name:</h4>
            <input 
              type="text" 
              placeholder="e.g. 10-B, BCA, B.Tech..." 
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="flex-1 w-full border border-primary/20 rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-slate-800"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
                className="flex-1 sm:flex-none bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
              >
                Save
              </button>
              <button 
                onClick={() => { setIsAddingClass(false); setNewClassName(""); }}
                className="flex-1 sm:flex-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {classes.map(cls => {
            const subjects = mapping[cls] || [];
            
            return (
              <div key={cls} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    Class {cls}
                    <button
                      onClick={() => toggleExpand(cls)}
                      className="md:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={expandedClasses.includes(cls) ? "Collapse" : "Expand"}
                    >
                      {expandedClasses.includes(cls) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </h4>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold">
                      {subjects.length} Subjects
                    </span>
                    {isManager && (
                      <button 
                        onClick={() => handleDeleteClass(cls)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                        title={`Delete Class ${cls}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col flex-1 ${expandedClasses.includes(cls) ? 'flex' : 'hidden md:flex'}`}>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {subjects.length === 0 ? (
                      <span className="text-sm text-slate-400 italic py-2">No subjects assigned</span>
                    ) : (
                      subjects.map(subject => (
                        <div key={subject} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-semibold flex items-center gap-2 group mb-1">
                          {subject}
                          {isManager && (
                            <button
                              onClick={() => handleRemoveSubject(cls, subject)}
                              className="opacity-70 hover:opacity-100 hover:text-red-500 transition-colors rounded-full"
                              aria-label={`Remove ${subject} from class ${cls}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {editingClass === cls ? (
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex gap-2">
                        <input
                          list="standard-subjects"
                          className="flex-1 border border-slate-300 dark:border-slate-700 rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary focus:outline-none dark:bg-slate-800"
                          placeholder="Type subject name..."
                          value={newSubject}
                          onChange={e => setNewSubject(e.target.value)}
                        />
                        <datalist id="standard-subjects">
                          {STANDARD_SUBJECTS.map(s => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                        <button
                          onClick={() => handleAddSubject(cls, newSubject)}
                          disabled={!newSubject}
                          className="bg-primary text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-primary-700 transition shadow-md flex items-center justify-center gap-2 min-w-[36px]"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingClass(null); setNewSubject(""); }}
                          className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 min-w-[36px] flex items-center justify-center"
                          aria-label="Cancel subject assignment"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    isManager && (
                      <button
                        onClick={() => setEditingClass(cls)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors mt-auto"
                      >
                        <Plus className="w-4 h-4" /> Assign Subject
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
