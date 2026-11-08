import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import { ApplyLeaveInput, ReviewLeaveInput } from './leaves.schema.js';
import {
  LeaveApplication,
  StudentProfile,
  TeacherProfile,
  SchoolClass,
  User,
} from '../../models/index.js';

export class LeavesService {
  static async applyLeave(
    tenantId: string,
    applicantUserId: string,
    userRole: Role,
    input: ApplyLeaveInput
  ) {
    let classId: string | null = null;
    let initialStatus: 'PENDING_TEACHER' | 'PENDING_MANAGER' = 'PENDING_MANAGER';

    if (userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ tenantId, userId: applicantUserId });
      if (student) {
        classId = student.classId || null;
      }
      initialStatus = 'PENDING_TEACHER';
    }

    const leave = await LeaveApplication.create({
      tenantId,
      applicantUserId,
      role: userRole,
      classId,
      subject: input.subject.trim(),
      description: input.description.trim(),
      startDate: new Date(input.startDate + 'T00:00:00Z'),
      endDate: new Date(input.endDate + 'T00:00:00Z'),
      documentUrl: input.documentUrl || null,
      status: initialStatus,
    });

    return this.formatLeave(leave);
  }

  static async listLeaves(
    tenantId: string,
    userRole: Role,
    userId: string,
    filters: { scope?: string; status?: string }
  ) {
    const filter: any = { tenantId };

    if (userRole === 'STUDENT') {
      filter.applicantUserId = userId;
    } else if (userRole === 'TEACHER') {
      if (filters.scope === 'my') {
        filter.applicantUserId = userId;
      } else {
        filter.role = 'STUDENT';
      }
    } else {
      // MANAGER / SUPER_ADMIN
      if (filters.scope === 'my') {
        filter.applicantUserId = userId;
      }
    }

    if (filters.status && filters.status !== 'ALL') {
      filter.status = filters.status;
    }

    const leaves = await LeaveApplication.find(filter).sort({ createdAt: -1 });

    const results = await Promise.all(leaves.map((l) => this.formatLeave(l)));
    return results;
  }

  static async reviewLeave(
    tenantId: string,
    leaveId: string,
    reviewerUserId: string,
    reviewerRole: Role,
    input: ReviewLeaveInput
  ) {
    const leave = await LeaveApplication.findOne({ _id: leaveId, tenantId });

    if (!leave) {
      throw new AppError('Leave application not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    if (reviewerRole === 'TEACHER') {
      if (leave.role !== 'STUDENT') {
        throw new AppError('Teachers can only review student leave applications', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
      }

      if (input.status !== 'PENDING_MANAGER' && input.status !== 'REJECTED') {
        throw new AppError(
          'Teachers can either forward to Manager or reject the application',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_STATUS'
        );
      }

      leave.status = input.status as any;
      leave.teacherRemark = input.remark || null;
      leave.reviewedByUserId = reviewerUserId;
      await leave.save();

      return this.formatLeave(leave);
    }

    if (reviewerRole === 'SCHOOL_MANAGER' || (reviewerRole as any) === 'MANAGER' || reviewerRole === 'SUPER_ADMIN') {
      if (input.status !== 'APPROVED' && input.status !== 'REJECTED') {
        throw new AppError(
          'Managers can either approve or reject the leave application',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_STATUS'
        );
      }

      leave.status = input.status as any;
      leave.managerRemark = input.remark || null;
      leave.reviewedByUserId = reviewerUserId;
      await leave.save();

      return this.formatLeave(leave);
    }

    throw new AppError('Unauthorized to review leave applications', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
  }

  private static async formatLeave(l: any) {
    const applicant = await User.findById(l.applicantUserId);
    const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : 'Applicant';

    let className = undefined;
    if (l.classId) {
      const cls = await SchoolClass.findById(l.classId);
      if (cls) className = cls.name;
    }

    let reviewerName = undefined;
    if (l.reviewedByUserId) {
      const reviewer = await User.findById(l.reviewedByUserId);
      if (reviewer) reviewerName = `${reviewer.firstName} ${reviewer.lastName}`.trim();
    }

    return {
      id: l.id,
      applicantId: l.applicantUserId,
      applicantName,
      role: l.role as 'STUDENT' | 'TEACHER',
      className,
      subject: l.subject,
      description: l.description,
      startDate: l.startDate.toISOString().split('T')[0],
      endDate: l.endDate.toISOString().split('T')[0],
      status: l.status,
      appliedOn: l.createdAt.toISOString(),
      documentUrl: l.documentUrl || undefined,
      teacherRemark: l.teacherRemark || undefined,
      managerRemark: l.managerRemark || undefined,
      reviewedBy: reviewerName,
    };
  }
}
