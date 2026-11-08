import { Role } from '../../config/constants.js';
import {
  Tenant,
  User,
  StudentProfile,
  TeacherProfile,
  StudentAttendance,
  TeacherAttendance,
  LeaveApplication,
  TimetableSlot,
  ExamSubject,
  AssignmentSubmission,
  ExamClass,
  Notification,
} from '../../models/index.js';

export class DashboardService {
  static async getStats(tenantId: string | null, userRole: Role, userId: string) {
    if (userRole === 'SUPER_ADMIN') {
      const [totalSchools, activeSchools, inactiveSchools, totalUsers] = await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'ACTIVE' }),
        Tenant.countDocuments({ status: 'INACTIVE' }),
        User.countDocuments(),
      ]);

      return [
        {
          id: 'total-schools',
          label: 'Total Registered Schools',
          value: totalSchools.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Across all regions',
        },
        {
          id: 'active-schools',
          label: 'Active Schools',
          value: activeSchools.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Live active tenants',
        },
        {
          id: 'inactive-schools',
          label: 'Inactive Schools',
          value: inactiveSchools.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Deactivated accounts',
        },
        {
          id: 'total-users',
          label: 'Total Platform Users',
          value: totalUsers.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'All system roles',
        },
      ];
    }

    if (!tenantId) {
      return [];
    }

    if (
      userRole === 'SCHOOL_MANAGER' ||
      (userRole as any) === 'MANAGER' ||
      (userRole as any) === 'PRINCIPAL' ||
      (userRole as any) === 'DIRECTOR'
    ) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const todayDate = new Date(todayStr + 'T00:00:00Z');

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayDate = new Date(yesterdayStr + 'T00:00:00Z');

      const [totalStudents, totalTeachers, todayAttLogs, yestAttLogs, pendingLeaves] = await Promise.all([
        StudentProfile.countDocuments({ tenantId }),
        TeacherProfile.countDocuments({ tenantId }),
        StudentAttendance.find({ tenantId, date: todayDate }),
        StudentAttendance.find({ tenantId, date: yesterdayDate }),
        LeaveApplication.countDocuments({ tenantId, status: 'PENDING_MANAGER' }),
      ]);

      const calcPct = (logs: any[]) => {
        if (logs.length === 0) return null;
        const present = logs.filter((l) => l.status === 'PRESENT' || l.status === 'LATE').length;
        return (present / logs.length) * 100;
      };

      const todayPct = calcPct(todayAttLogs);
      const yestPct = calcPct(yestAttLogs);

      let attValue = todayPct !== null ? `${Math.round(todayPct)}%` : '0%';
      let attChange = '0%';
      let attChangeType: 'increase' | 'decrease' | 'neutral' = 'neutral';

      if (todayPct !== null && yestPct !== null) {
        const diff = todayPct - yestPct;
        attChange = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
        attChangeType = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'neutral';
      }

      return [
        {
          id: 'total-students',
          label: 'Total Students',
          value: totalStudents.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Enrolled pupils',
        },
        {
          id: 'total-teachers',
          label: 'Total Teachers',
          value: totalTeachers.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Active faculty',
        },
        {
          id: 'school-revenue',
          label: 'Pending Leaves',
          value: pendingLeaves.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Awaiting manager approval',
        },
        {
          id: 'today-attendance',
          label: 'Today Attendance',
          value: attValue,
          change: attChange,
          changeType: attChangeType,
          description: 'vs. Yesterday',
        },
      ];
    }

    if (userRole === 'TEACHER') {
      const teacher = await TeacherProfile.findOne({ tenantId, userId });
      const teacherId = teacher ? teacher.id : '';

      const [assignedSlots, pendingPapers, studentLeaves] = await Promise.all([
        TimetableSlot.find({ tenantId, teacherId }),
        ExamSubject.countDocuments({
          teacherId,
          paperStatus: { $in: ['PENDING', 'REJECTED'] },
        }),
        LeaveApplication.countDocuments({
          tenantId,
          role: 'STUDENT',
          status: 'PENDING_TEACHER',
        }),
      ]);

      const distinctClasses = Array.from(new Set(assignedSlots.map((s) => s.className || s.classId)));

      return [
        {
          id: 'students-taught',
          label: 'Students Taught',
          value: (assignedSlots.length * 35).toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Across scheduled classes',
        },
        {
          id: 'active-classes',
          label: 'Active Classes',
          value: distinctClasses.length.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Scheduled in timetable',
        },
        {
          id: 'pending-papers',
          label: 'Pending Papers',
          value: pendingPapers.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Exam papers to upload',
        },
        {
          id: 'student-leaves',
          label: 'Leave Requests',
          value: studentLeaves.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Awaiting teacher review',
        },
      ];
    }

    if (userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ tenantId, userId });
      if (!student) return [];

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(Date.UTC(currentYear, 0, 1));

      const [attLogs, pendingAssignments, upcomingExams, myLeaves] = await Promise.all([
        StudentAttendance.find({ tenantId, studentId: student.id, date: { $gte: startOfYear } }),
        AssignmentSubmission.countDocuments({ studentId: student.id, status: 'PENDING' }),
        ExamClass.countDocuments({ classId: student.classId }),
        LeaveApplication.countDocuments({ tenantId, applicantUserId: userId }),
      ]);

      const attPct =
        attLogs.length > 0
          ? Math.round(
              (attLogs.filter((l) => l.status === 'PRESENT' || l.status === 'LATE').length / attLogs.length) * 100
            )
          : 100;

      return [
        {
          id: 'my-attendance',
          label: 'Attendance Rate',
          value: `${attPct}%`,
          change: '0%',
          changeType: 'neutral',
          description: 'Academic session average',
        },
        {
          id: 'pending-assignments',
          label: 'Pending Homework',
          value: pendingAssignments.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Assignments to submit',
        },
        {
          id: 'upcoming-exams',
          label: 'Upcoming Exams',
          value: upcomingExams.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Scheduled for your class',
        },
        {
          id: 'my-leaves',
          label: 'My Leaves',
          value: myLeaves.toString(),
          change: '0%',
          changeType: 'neutral',
          description: 'Submitted requests',
        },
      ];
    }

    return [];
  }

  static async getAttendanceChart(
    tenantId: string | null,
    userRole: Role,
    userId: string,
    daysCount = 7
  ) {
    if (!tenantId) return [];

    const days = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const targetDate = new Date(dateStr + 'T00:00:00Z');

      let label = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (daysCount > 14) {
        label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }

      const [stuLogs, tchLogs] = await Promise.all([
        StudentAttendance.find({ tenantId, date: targetDate }),
        TeacherAttendance.find({ tenantId, date: targetDate }),
      ]);

      let stuPct = 0;
      if (stuLogs.length > 0) {
        const present = stuLogs.filter((l) => l.status === 'PRESENT' || l.status === 'LATE').length;
        stuPct = Math.round((present / stuLogs.length) * 100);
      }

      let tchPct = 0;
      if (tchLogs.length > 0) {
        const presentT = tchLogs.filter((l) => l.status === 'PRESENT' || l.status === 'HALF_DAY').length;
        tchPct = Math.round((presentT / tchLogs.length) * 100);
      }

      days.push({ label, attendance: stuPct, teachers: tchPct });
    }

    return days;
  }

  static async getRecentActivities(tenantId: string | null) {
    if (!tenantId) return [];

    const notifications = await Notification.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(6);

    return notifications.map((n, idx) => {
      const diffMs = Date.now() - n.createdAt.getTime();
      const diffMins = Math.round(diffMs / 60000);
      let timeStr = `${diffMins} mins ago`;
      if (diffMins <= 0) timeStr = 'Just now';
      else if (diffMins >= 1440) timeStr = `${Math.round(diffMins / 1440)} days ago`;
      else if (diffMins >= 60) timeStr = `${Math.round(diffMins / 60)} hours ago`;

      return {
        id: idx + 1,
        title: n.message || n.title,
        time: timeStr,
      };
    });
  }
}
