import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import { CreateAssignmentInput, SubmitAssignmentInput, GradeSubmissionInput } from './assignments.schema.js';
import {
  Assignment,
  AssignmentSubmission,
  StudentProfile,
  TeacherProfile,
  SchoolClass,
  User,
} from '../../models/index.js';

export class AssignmentsService {
  static async listAssignments(
    tenantId: string,
    userRole: Role,
    userId: string,
    filters: { className?: string; subject?: string }
  ) {
    const filter: any = { tenantId };

    if (filters.subject) {
      filter.subjectName = new RegExp(`^${filters.subject.trim()}$`, 'i');
    }

    let studentProfileId: string | null = null;
    if (userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ tenantId, userId });
      if (student) {
        if (student.classId) filter.classId = student.classId;
        studentProfileId = student.id;
      }
    }

    if (filters.className) {
      filter.className = new RegExp(`^${filters.className.trim()}$`, 'i');
    }

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });

    const results = await Promise.all(
      assignments.map(async (a) => {
        const cls = await SchoolClass.findById(a.classId);
        const teacher = await TeacherProfile.findById(a.teacherId);
        const teacherUser = teacher ? await User.findById(teacher.userId) : null;
        const submissions = await AssignmentSubmission.find({ assignmentId: a.id });

        const studentSubmission = studentProfileId
          ? submissions.find((s) => s.studentId === studentProfileId)
          : null;

        return {
          id: a.id,
          schoolId: a.tenantId,
          title: a.title,
          description: a.description,
          className: cls ? cls.name : a.className || '',
          classId: a.classId,
          subject: a.subjectName,
          teacherId: a.teacherId,
          teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() : 'Teacher',
          dueDate: a.dueDate.toISOString(),
          createdAt: a.createdAt.toISOString(),
          attachmentName: a.attachmentName || undefined,
          attachmentUrl: a.attachmentUrl || undefined,
          submissionsCount: submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'GRADED').length,
          totalStudentsCount: submissions.length,
          mySubmission: studentSubmission
            ? {
                id: studentSubmission.id,
                status: studentSubmission.status,
                content: studentSubmission.content,
                attachmentName: studentSubmission.attachmentName,
                attachmentUrl: studentSubmission.attachmentUrl,
                submittedAt: studentSubmission.submittedAt?.toISOString(),
                gradedAt: studentSubmission.gradedAt?.toISOString(),
                teacherRemarks: studentSubmission.teacherRemarks,
                grade: studentSubmission.grade,
              }
            : undefined,
        };
      })
    );

    return results;
  }

  static async getAssignment(id: string, tenantId: string) {
    const a = await Assignment.findOne({ _id: id, tenantId });

    if (!a) {
      throw new AppError('Assignment not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const cls = await SchoolClass.findById(a.classId);
    const teacher = await TeacherProfile.findById(a.teacherId);
    const teacherUser = teacher ? await User.findById(teacher.userId) : null;
    const submissions = await AssignmentSubmission.find({ assignmentId: a.id });

    const formattedSubmissions = await Promise.all(
      submissions.map(async (s) => {
        const student = await StudentProfile.findById(s.studentId);
        const studentUser = student ? await User.findById(student.userId) : null;

        return {
          id: s.id,
          assignmentId: s.assignmentId,
          studentId: s.studentId,
          studentUserId: student ? student.userId : '',
          studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}`.trim() : 'Student',
          rollNumber: student ? student.rollNumber : '',
          content: s.content || '',
          status: s.status,
          attachmentName: s.attachmentName || undefined,
          attachmentUrl: s.attachmentUrl || undefined,
          fileAttachmentName: s.attachmentName || undefined,
          fileAttachmentData: s.attachmentUrl || undefined,
          submittedAt: s.submittedAt?.toISOString() || null,
          gradedAt: s.gradedAt?.toISOString() || null,
          checkedAt: s.gradedAt?.toISOString() || null,
          teacherRemarks: s.teacherRemarks || undefined,
          grade: s.grade || undefined,
        };
      })
    );

    return {
      id: a.id,
      schoolId: a.tenantId,
      title: a.title,
      description: a.description,
      className: cls ? cls.name : a.className || '',
      classId: a.classId,
      subject: a.subjectName,
      teacherId: a.teacherId,
      teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() : 'Teacher',
      dueDate: a.dueDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      attachmentName: a.attachmentName || undefined,
      attachmentUrl: a.attachmentUrl || undefined,
      submissions: formattedSubmissions,
    };
  }

  static async createAssignment(tenantId: string, teacherUserId: string, input: CreateAssignmentInput) {
    let teacher = await TeacherProfile.findOne({
      tenantId,
      $or: [{ _id: teacherUserId }, { userId: teacherUserId }],
    });

    if (!teacher) {
      teacher = await TeacherProfile.findById(teacherUserId);
    }

    if (!teacher) {
      throw new AppError('Teacher profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    let standard = '10';
    let section = 'A';
    const trimmed = input.className.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      standard = parts[0].trim();
      section = parts[1].trim().toUpperCase();
    } else {
      standard = trimmed;
    }

    let schoolClass = await SchoolClass.findOne({
      tenantId,
      name: new RegExp(`^${trimmed}$`, 'i'),
    });

    if (!schoolClass) {
      schoolClass = await SchoolClass.create({
        tenantId,
        name: trimmed,
        standard,
        section,
      });
    }

    const assignment = await Assignment.create({
      tenantId,
      teacherId: teacher.id,
      classId: schoolClass.id,
      className: schoolClass.name,
      subjectName: input.subject.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      dueDate: new Date(input.dueDate),
      attachmentName: input.attachmentName || null,
      attachmentUrl: input.attachmentUrl || input.attachmentData || null,
    });

    const students = await StudentProfile.find({ tenantId, classId: schoolClass.id });

    if (students.length > 0) {
      await AssignmentSubmission.insertMany(
        students.map((s) => ({
          assignmentId: assignment.id,
          studentId: s.id,
          status: 'PENDING',
        }))
      );
    }

    return this.getAssignment(assignment.id, tenantId);
  }

  static async deleteAssignment(id: string, tenantId: string) {
    const a = await Assignment.findOne({ _id: id, tenantId });

    if (!a) {
      throw new AppError('Assignment not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await Assignment.findByIdAndDelete(id);
    await AssignmentSubmission.deleteMany({ assignmentId: id });

    return { success: true, message: 'Assignment deleted successfully' };
  }

  static async submitAssignment(
    assignmentId: string,
    studentUserId: string,
    tenantId: string,
    input: SubmitAssignmentInput
  ) {
    let student = await StudentProfile.findOne({ tenantId, userId: studentUserId });
    if (!student) {
      student = await StudentProfile.findById(studentUserId);
    }

    if (!student) {
      throw new AppError('Student profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, tenantId });
    if (!assignment) {
      throw new AppError('Assignment not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const attachmentUrl = input.attachmentUrl || input.fileAttachmentData || input.attachmentData || null;
    const attachmentName = input.attachmentName || input.fileAttachmentName || null;

    let submission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId: student.id,
    });

    if (submission) {
      submission.content = input.content || null;
      submission.attachmentUrl = attachmentUrl;
      submission.attachmentName = attachmentName;
      submission.status = 'SUBMITTED';
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        assignmentId,
        studentId: student.id,
        content: input.content || null,
        attachmentUrl,
        attachmentName,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      });
    }

    const studentUser = await User.findById(student.userId);

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}`.trim() : 'Student',
      content: submission.content,
      status: submission.status,
      attachmentName: submission.attachmentName,
      attachmentUrl: submission.attachmentUrl,
      submittedAt: submission.submittedAt?.toISOString(),
    };
  }

  static async gradeSubmission(
    submissionId: string,
    tenantId: string,
    input: GradeSubmissionInput
  ) {
    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission) {
      throw new AppError('Submission not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    submission.grade = input.grade;
    submission.teacherRemarks = input.teacherRemarks || null;
    submission.status = (input.status as any) || 'GRADED';
    submission.gradedAt = new Date();
    await submission.save();

    const student = await StudentProfile.findById(submission.studentId);
    const studentUser = student ? await User.findById(student.userId) : null;

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      studentName: studentUser ? `${studentUser.firstName} ${studentUser.lastName}`.trim() : 'Student',
      grade: submission.grade,
      teacherRemarks: submission.teacherRemarks,
      status: submission.status,
      gradedAt: submission.gradedAt?.toISOString(),
      checkedAt: submission.gradedAt?.toISOString(),
    };
  }
}
