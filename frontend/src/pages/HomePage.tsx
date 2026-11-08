import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Building2,
  Users,
  Calendar,
  Clock,
  ClipboardCheck,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  ChevronRight,
  BarChart3,
  Bell,
  School,
  Award,
  FileCheck2,
  Check,
  Zap,
  TrendingUp,
  Send,
  FileText,
  UserCheck,
  Sparkles,
  ArrowUpRight,
  BookMarked,
  Laptop,
  ExternalLink,
} from "lucide-react";
import { ROUTE_PATHS } from "@/app/router/routePaths";
import { useAuthStore } from "@/features/auth/store/authStore";
import { submitInquiry } from "@/features/superadmin/services/inquiry.service";
import { toast } from "sonner";

/* =========================================================================
   FEATURE DATA DEFINITION
   Strictly following the user's reference card style & responsive rule:
   - Phone: 1 card per row (grid-cols-1)
   - Laptop: 2 cards per row (md:grid-cols-2)
   - Bigger screens: 3 cards per row (xl:grid-cols-3)
   ========================================================================= */

interface SchoolFeature {
  id: string;
  category: string;
  title: string;
  badge: string;
  icon: typeof GraduationCap;
  iconBg: string;
  iconColor: string;
  description: string;
  chips: string[];
  highlights: string[];
}

const SCHOOL_FEATURES: SchoolFeature[] = [
  {
    id: "student-admissions",
    category: "STUDENT INFORMATION SYSTEM",
    title: "Student Admissions & Records",
    badge: "Active & Live",
    icon: GraduationCap,
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    iconColor: "text-emerald-600",
    description:
      "Manage student profiles from registration to graduation. Automatically generates sequential roll numbers per class section, stores guardian details, and organizes academic history.",
    chips: ["Student Lifecycle", "Sequential Roll Numbers", "Section Allocation", "Guardian Directory"],
    highlights: [
      "Automated roll number allocation by class and section",
      "Centralized student records with parent emergency contacts",
      "Instant filtering by grade standard, section, and status",
      "One-click roster export to spreadsheet formats",
    ],
  },
  {
    id: "smart-attendance",
    category: "ATTENDANCE & DISCIPLINE",
    title: "Period-wise Smart Attendance",
    badge: "Active & Live",
    icon: ClipboardCheck,
    iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
    iconColor: "text-sky-600",
    description:
      "Subject teachers take attendance period by period, while faculty log daily campus presence. Enforces an automated 15-day retrospective lock to eliminate backdated tampering.",
    chips: ["Period Attendance", "15-Day Edit Lock", "Staff Check-in", "Headcount Tracking"],
    highlights: [
      "Period-level tracking captures attendance per subject lecture",
      "15-day retrospective lock protects records from tampering",
      "Future-date prevention ensures entries represent actual days",
      "Real-time attendance percentage visible to leadership",
    ],
  },
  {
    id: "timetable-scheduling",
    category: "ACADEMIC TIMETABLE",
    title: "Conflict-Free Timetable Engine",
    badge: "Active & Live",
    icon: Clock,
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    iconColor: "text-amber-600",
    description:
      "Intelligent scheduling software that guarantees zero teacher double-booking and room clashes across all school standards throughout the standard 6-period school day.",
    chips: ["Conflict Prevention", "Teacher Workload Grid", "Class Matrix", "Period Sync"],
    highlights: [
      "Collision engine blocks double-booking faculty across classes",
      "Standard 6 daily academic periods structure pre-configured",
      "Dedicated weekly schedule grids for both classes and teachers",
      "Instant schedule reassignment with real-time validation",
    ],
  },
  {
    id: "examination-system",
    category: "ASSESSMENT & EVALUATION",
    title: "Examinations, Marks & Admit Cards",
    badge: "Active & Live",
    icon: Award,
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100",
    iconColor: "text-purple-600",
    description:
      "Complete examination governance: schedule wizard, question paper review and approval pipeline, subject marks entry, and fee-clearance verified student admit cards.",
    chips: ["Paper Approval", "Marks Entry", "Admit Card Clearance", "Grade Compilation"],
    highlights: [
      "Question paper workflow: Submitted → Reviewed → Approved",
      "Role-restricted marks capture with maximum score validation",
      "Automatic fee dues clearance verification before hall ticket download",
      "Printable examination admit cards with student roll and seat number",
    ],
  },
  {
    id: "digital-assignments",
    category: "DIGITAL CLASSROOM",
    title: "Homework & Assignment Evaluation",
    badge: "Active & Live",
    icon: BookOpen,
    iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
    iconColor: "text-rose-600",
    description:
      "Teachers publish homework with submission deadlines and reference materials. Students submit digital documents online, and teachers grade them with constructive remarks.",
    chips: ["Homework Hub", "Document Submissions", "Scoring & Remarks", "Deadline Tracking"],
    highlights: [
      "Class and subject-targeted homework publishing with deadlines",
      "Students attach document files directly from phone or laptop",
      "Teacher evaluation suite with numerical marks and remarks",
      "Submission tracking with clear on-time vs late indicators",
    ],
  },
  {
    id: "leave-approvals",
    category: "LEAVE MANAGEMENT",
    title: "Multi-Tier Leave Workflow",
    badge: "Active & Live",
    icon: FileCheck2,
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    iconColor: "text-indigo-600",
    description:
      "Formal leave requests with a two-tier approval chain for students (Class Teacher recommendation followed by Principal approval) and direct Principal sign-off for faculty.",
    chips: ["Two-Tier Approval", "Medical Proofs", "Decision Notes", "Status Alerts"],
    highlights: [
      "Student leaves routed automatically: Class Teacher first, then Principal",
      "Faculty leave requests submitted directly to the School Principal",
      "Medical certificate attachment support for medical leaves",
      "Transparent audit history with decision notes and date stamps",
    ],
  },
  {
    id: "faculty-management",
    category: "FACULTY & STAFF",
    title: "Faculty & Teacher Management",
    badge: "Active & Live",
    icon: Users,
    iconBg: "bg-teal-50 text-teal-600 border border-teal-100",
    iconColor: "text-teal-600",
    description:
      "Maintain a verified staff directory with unique employee IDs, subject specializations, assigned class sections, and designated Class Teacher responsibilities.",
    chips: ["Staff Directory", "Employee IDs", "Subject Specialization", "Class Teachers"],
    highlights: [
      "Unique Employee ID verification with secure individual logins",
      "Subject mapping across multiple secondary and primary standards",
      "Class Teacher designation for automated attendance and leave routing",
      "Employment status toggles with instant access control",
    ],
  },
  {
    id: "academic-curriculum",
    category: "ACADEMIC STRUCTURE",
    title: "Curriculum & Class Catalog",
    badge: "Active & Live",
    icon: School,
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
    iconColor: "text-blue-600",
    description:
      "Configure your school's academic hierarchy: grade standards (Grade 1 to 12), section divisions (A, B, C), and subject catalog linked to allocated teachers.",
    chips: ["Grade Standards", "Section Rosters", "Subject Catalog", "Faculty Allocation"],
    highlights: [
      "Dynamic creation of grade standards and section divisions",
      "Curriculum catalog covering core subjects, labs, and electives",
      "Class-subject teacher allocation with vacancy checks",
      "Structured foundation for timetable generation and exam scheduling",
    ],
  },
  {
    id: "multi-campus-admin",
    category: "CAMPUS & GROUP GOVERNANCE",
    title: "Multi-Branch & Campus Administration",
    badge: "Active & Live",
    icon: Building2,
    iconBg: "bg-slate-100 text-slate-800 border border-slate-200",
    iconColor: "text-slate-800",
    description:
      "Educational societies and school trusts can administer multiple campuses from a single executive dashboard with complete data privacy between branches and OTP safeguards.",
    chips: ["Multi-Campus", "Branch Isolation", "Principal Provisioning", "OTP Deletion Guard"],
    highlights: [
      "Strict data isolation between different branches of an institution",
      "One-click school branch onboarding with Principal account creation",
      "Instant branch activation and suspension controls",
      "OTP verification guard to prevent accidental campus deletion",
    ],
  },
];

/* =========================================================================
   HOW IT WORKS — STEP-BY-STEP WORKFLOW
   ========================================================================= */

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "School Setup & Branch Onboarding",
    description:
      "Register the school branch with official contact information, address, and academic code. The primary Principal / School Manager account is initialized instantly.",
  },
  {
    step: "02",
    title: "Curriculum & Class Configuration",
    description:
      "Define your academic structure: grade standards (Class 1–12), sections (A, B, C), curriculum subjects, and standard daily period schedules.",
  },
  {
    step: "03",
    title: "Enroll Faculty & Students",
    description:
      "Add faculty members with subject specializations and enroll students. The system automatically creates sequential class roll numbers and unique employee IDs.",
  },
  {
    step: "04",
    title: "Daily Classroom Operations",
    description:
      "Faculty access their conflict-free weekly timetable, log period attendance, distribute homework with document attachments, and review student leave requests.",
  },
];

/* =========================================================================
   REAL VALUE PROPOSITION FOR SCHOOLS
   ========================================================================= */

const SCHOOL_BENEFITS = [
  {
    title: "Zero Timetable Clashes",
    description:
      "Our collision prevention engine mathematically guarantees that no teacher is ever assigned to two classrooms during the same academic period.",
    icon: Clock,
  },
  {
    title: "Tamper-Proof Attendance Registers",
    description:
      "A strict 15-day edit lock prevents retroactive modification of attendance records, ensuring strict discipline and audit compliance.",
    icon: Lock,
  },
  {
    title: "Fee Clearance-Linked Admit Cards",
    description:
      "Automated clearance checks ensure students only receive official examination hall tickets once their administrative dues are cleared.",
    icon: Award,
  },
  {
    title: "100% Paperless School Campus",
    description:
      "Eliminate physical paperwork for admissions, period attendance registers, question paper reviews, and student leave letters.",
    icon: Zap,
  },
  {
    title: "Transparent Parent-School Trust",
    description:
      "Parents and students receive immediate clarity on attendance percentages, upcoming examination dates, and homework feedback.",
    icon: UserCheck,
  },
  {
    title: "Multi-Campus Administration",
    description:
      "Govern an entire network of school branches from a unified executive console, keeping each campus's database strictly isolated.",
    icon: Building2,
  },
];

/* =========================================================================
   FAQ
   ========================================================================= */

const FAQ_ITEMS = [
  {
    question: "How long does it take to onboard our school onto SkoolNova ERP?",
    answer:
      "A typical school can be fully operational within a few hours. The administrative team sets up grade standards, subjects, and period timings, and enrolls teachers and students with auto-generated credentials.",
  },
  {
    question: "How does the system prevent teacher scheduling conflicts?",
    answer:
      "When allocating a period slot in the timetable, SkoolNova verifies that the assigned teacher is not already booked in another class for that weekday and period. If a clash exists, the system blocks the allocation immediately.",
  },
  {
    question: "What is the 15-day attendance lock rule?",
    answer:
      "To prevent backdated tampering of school attendance, attendance records older than 15 days cannot be edited or modified. This preserves regulatory compliance and official audit validity.",
  },
  {
    question: "Can an educational trust manage multiple school branches?",
    answer:
      "Yes. SkoolNova is built on a multi-tenant architecture. School trustees can manage multiple campus branches while each school's faculty, students, and records remain completely isolated.",
  },
  {
    question: "Can students submit homework digitally?",
    answer:
      "Yes. Students can view active homework, check deadlines, and attach document files. Teachers can evaluate these submissions, assign marks, and write constructive remarks directly through their portal.",
  },
];

/* =========================================================================
   MAIN HOME PAGE COMPONENT
   ========================================================================= */

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Inquiry form state
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentCount, setStudentCount] = useState("500-1500");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !school.trim() || !email.trim()) {
      toast.error("Please fill in your name, school name, and email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitInquiry({
        name: name.trim(),
        schoolName: school.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        studentCount,
        message: notes.trim() || undefined,
      });

      toast.success("Thank you! Your school inquiry has been recorded. Our team will contact you shortly.");
      setName("");
      setSchool("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch {
      toast.error("Failed to submit inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* =====================================================================
          NAVIGATION BAR (Minimalist, Crisp & Professional)
          ===================================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LOGO */}
          <Link to={ROUTE_PATHS.HOME} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-950">SkoolNova</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">ERP</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5 hidden sm:block">Campus Management System</p>
            </div>
          </Link>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
            <a href="#benefits" className="hover:text-slate-950 transition-colors">School Benefits</a>
            <a href="#workflow" className="hover:text-slate-950 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">FAQ</a>
            <a href="#inquiry" className="hover:text-slate-950 transition-colors">Contact</a>
          </nav>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={ROUTE_PATHS.DASHBOARD}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to={ROUTE_PATHS.LOGIN}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-950 transition"
                >
                  Sign In
                </Link>
                <a
                  href="#inquiry"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-sm"
                >
                  <span>Book Demo</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          HERO SECTION (LEFT: Heading & CTA, RIGHT: School Graphic Scene)
          ===================================================================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 bg-slate-50/60 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* LEFT COLUMN: Headings, Value Proposition & Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Next-Gen Institutional Operating System</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.12]">
                The Complete Management System for Modern Schools
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl">
                Unify student admissions, conflict-free timetable scheduling, period-wise attendance, digital homework, and fee-verified examination admit cards in one intuitive platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={isAuthenticated ? ROUTE_PATHS.DASHBOARD : ROUTE_PATHS.LOGIN}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition"
                >
                  <span>{isAuthenticated ? "Open Dashboard" : "Sign In to Portal"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#inquiry"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm shadow-sm transition"
                >
                  <span>Request School Integration</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              </div>

              {/* Key Trust Metric Strip */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-950">100%</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Paperless Campus</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-950">Zero</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Timetable Clashes</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-slate-950">15-Day</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Attendance Lock</div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: School-Related Visual Graphic & Floating Cards */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Main School Illustration Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-8 relative overflow-hidden">
                  {/* Decorative background glow */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

                  {/* School Graphic Scene Header */}
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Delhi Public Campus</div>
                        <div className="text-[10px] text-slate-400">Academic Session 2026–27</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Session
                    </span>
                  </div>

                  {/* Interactive Classroom & Student Scene Illustration */}
                  <div className="bg-gradient-to-b from-slate-50 to-blue-50/40 rounded-2xl p-6 border border-slate-100 text-center relative mb-5">
                    {/* SVG Graphic Elements */}
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {/* Student Avatar 1 */}
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600">
                        <GraduationCap className="w-6 h-6" />
                      </div>

                      {/* Campus Center Icon */}
                      <div className="w-16 h-16 rounded-3xl bg-slate-950 text-white shadow-lg flex items-center justify-center">
                        <School className="w-8 h-8" />
                      </div>

                      {/* Student Avatar 2 */}
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-purple-600">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">1,842 Active Students Enrolled</h4>
                    <p className="text-xs text-slate-500 mt-1">Across 36 Primary & Senior Secondary Sections</p>
                  </div>

                  {/* Live Student Operation Cards */}
                  <div className="space-y-3">
                    {/* Floating Card 1: Attendance */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                          <ClipboardCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Period 3 Attendance</div>
                          <div className="text-[11px] text-slate-500">Grade 10-A • 42/43 Present</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        97.7%
                      </span>
                    </div>

                    {/* Floating Card 2: Conflict-free Timetable */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Mathematics Lecture</div>
                          <div className="text-[11px] text-slate-500">Dr. R. Sharma • Room 204</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        No Clashes
                      </span>
                    </div>

                    {/* Floating Card 3: Admit Card Clearance */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Final Exam Hall Ticket</div>
                          <div className="text-[11px] text-slate-500">Fee Dues Cleared • Ready</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          WHY SCHOOLS CHOOSE DIGISCHOOL ERP (Benefits)
          ===================================================================== */}
      <section id="benefits" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional Advantages</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mt-2">
              Why Schools Choose SkoolNova ERP
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3 font-normal">
              Designed specifically to resolve the everyday administrative bottlenecks faced by school principals, coordinators, and teachers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCHOOL_BENEFITS.map((b, idx) => {
              const BenefitIcon = b.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-md"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5">
                    <BenefitIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-2">{b.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FEATURES & MODULES SHOWCASE SECTION
          STRICT USER SPECIFICATION:
          - Phone: grid-cols-1 (1 card per row)
          - Laptop: md:grid-cols-2 (2 cards per row)
          - Bigger screens: xl:grid-cols-3 (3 cards per row)
          ===================================================================== */}
      <section id="features" className="py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Core Software Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mt-2">
              Complete Features of SkoolNova ERP
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3 font-normal">
              Every department, classroom, teacher, and student in your school is connected through dedicated, purpose-built modules.
            </p>
          </div>

          {/* 
            GRID ADHERING STRICTLY TO USER'S RESPONSIVE RULE:
            - Phone: grid-cols-1 (1 card per row)
            - Laptop: md:grid-cols-2 (2 cards per row)
            - Bigger screens: xl:grid-cols-3 (3 cards per row)
          */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {SCHOOL_FEATURES.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    {/* Top row: Icon squircle on left, Status badge on right */}
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feature.iconBg}`}>
                        <FeatureIcon className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{feature.badge}</span>
                      </div>
                    </div>

                    {/* Category eyebrow */}
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      {feature.category}
                    </div>

                    {/* Module Title */}
                    <h3 className="text-xl font-bold text-slate-950 mb-3 tracking-tight">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed font-normal mb-6">
                      {feature.description}
                    </p>

                    {/* Capability Bullets */}
                    <ul className="space-y-2 mb-6 border-t border-slate-100 pt-4">
                      {feature.highlights.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Chips */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {feature.chips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          HOW IT WORKS (Chronological 4-Step Lifecycle)
          ===================================================================== */}
      <section id="workflow" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Implementation Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mt-2">
              How SkoolNova Operates in Your School
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3 font-normal">
              A clear, straightforward operational journey from initial campus registration to everyday classroom operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((s, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-300 font-mono mb-4">{s.step}</div>
                  <h3 className="text-base font-bold text-slate-950 mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/70 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Configured via Admin UI</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          INSTITUTIONAL CONSULTATION / INQUIRY FORM (#inquiry)
          Connected to backend /api/v1/inquiries (PostgreSQL DB table)
          ===================================================================== */}
      <section id="inquiry" className="py-20 bg-slate-50/70 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Institutional Inquiries</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mt-2">
              Integrate SkoolNova in Your Institution
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Connect with our school solutions team to schedule an onboarding consultation or request a custom deployment demo.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm">
            <form onSubmit={handleInquiry} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Administrator / Principal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    School / Institution Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delhi Public Academy"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="principal@delhipublic.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Total Student Strength
                  </label>
                  <select
                    value={studentCount}
                    onChange={(e) => setStudentCount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition bg-white"
                  >
                    <option value="under-500">Under 500 Students</option>
                    <option value="500-1500">500 – 1,500 Students</option>
                    <option value="1500-3000">1,500 – 3,000 Students</option>
                    <option value="above-3000">3,000+ Students (Multi-Branch)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Special Requirements or Questions (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us about specific needs (e.g. multiple branch locations, custom grading scales)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm transition resize-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Strictly confidential. Inquiries are stored directly in the database for the school leadership team.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAQ SECTION
          ===================================================================== */}
      <section id="faq" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Common Questions</span>
            <h2 className="text-3xl font-bold text-slate-950 tracking-tight mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-slate-950 transition text-sm sm:text-base"
                  >
                    <span>{item.question}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-90 text-slate-950" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FOOTER (Clean, Professional, Zero Tech Jargon)
          ===================================================================== */}
      <footer className="bg-slate-950 text-slate-400 py-12 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            {/* Logo & Product of Code-A-Nova */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold shadow-sm">
                <School className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">SkoolNova ERP</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  A Product of{" "}
                  <a
                    href="https://code-a-nova.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-200 font-semibold hover:text-white underline decoration-slate-600 transition"
                  >
                    Code-A-Nova
                  </a>
                </span>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#benefits" className="hover:text-white transition">Benefits</a>
              <a href="#workflow" className="hover:text-white transition">How It Works</a>
              <a href="#inquiry" className="hover:text-white transition">Inquiry</a>
              <a
                href="https://code-a-nova.online"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition inline-flex items-center gap-1"
              >
                <span>Code-A-Nova</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <Link to={ROUTE_PATHS.LOGIN} className="hover:text-white transition">Sign In</Link>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>All Systems Operational</span>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} SkoolNova ERP. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <span>An enterprise product developed by</span>
              <a
                href="https://code-a-nova.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 font-semibold hover:text-white underline decoration-slate-600 transition flex items-center gap-1"
              >
                <span>Code-A-Nova</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
