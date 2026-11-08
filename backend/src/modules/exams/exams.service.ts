import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import {
  CreateExamInput,
  UpdatePaperStatusInput,
  EnterMarksInput,
  ToggleAdmitApprovalInput,
} from './exams.schema.js';
import {
  Exam,
  ExamClass,
  ExamSubject,
  AdmitCardClearance,
  ExamMark,
  StudentProfile,
  TeacherProfile,
  SchoolClass,
  Tenant,
  User,
} from '../../models/index.js';

export class ExamsService {
  static async listExams(tenantId: string, userRole: Role, userId: string) {
    let studentClassId: string | null = null;
    let studentProfileId: string | null = null;

    if (userRole === 'STUDENT') {
      const student = await StudentProfile.findOne({ tenantId, userId });
      if (student) {
        studentClassId = student.classId || null;
        studentProfileId = student.id;
      }
    }

    const exams = await Exam.find({ tenantId }).sort({ startDate: -1 });

    const results = await Promise.all(
      exams.map(async (e) => {
        const examClasses = await ExamClass.find({ examId: e.id });
        const classNames: string[] = [];
        for (const ec of examClasses) {
          const sc = await SchoolClass.findById(ec.classId);
          if (sc) classNames.push(sc.name);
        }

        const subjects = await ExamSubject.find({ examId: e.id }).sort({ date: 1 });
        const formattedSubjects = await Promise.all(
          subjects.map(async (s) => {
            const sc = await SchoolClass.findById(s.classId);
            const teacher = s.teacherId ? await TeacherProfile.findById(s.teacherId) : null;
            const teacherUser = teacher ? await User.findById(teacher.userId) : null;

            return {
              id: s.id,
              subjectName: s.subjectName,
              className: sc ? sc.name : s.className || '',
              date: s.date.toISOString().split('T')[0],
              startTime: s.startTime,
              endTime: s.endTime,
              teacherId: s.teacherId || null,
              teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() : undefined,
              paperPdfUrl: s.paperPdfUrl || null,
              paperStatus: s.paperStatus,
              rejectionReason: s.rejectionReason || undefined,
              marksUploaded: s.marksUploaded,
            };
          })
        );

        let isApproved = false;
        if (studentProfileId) {
          const clearance = await AdmitCardClearance.findOne({
            examId: e.id,
            studentId: studentProfileId,
          });
          isApproved = Boolean(clearance && clearance.approved && !clearance.feeDue);
        }

        return {
          id: e.id,
          schoolId: e.tenantId,
          title: e.title,
          className: classNames[0] || 'General',
          classes: classNames.length > 0 ? classNames : e.classes || ['General'],
          startDate: e.startDate.toISOString().split('T')[0],
          endDate: e.endDate.toISOString().split('T')[0],
          status: e.status,
          isAdmitCardApproved: isApproved,
          subjects: formattedSubjects,
          createdAt: e.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async getExam(tenantId: string, examId: string) {
    const e = await Exam.findOne({ _id: examId, tenantId });

    if (!e) {
      throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const examClasses = await ExamClass.find({ examId: e.id });
    const classNames: string[] = [];
    for (const ec of examClasses) {
      const sc = await SchoolClass.findById(ec.classId);
      if (sc) classNames.push(sc.name);
    }

    const subjects = await ExamSubject.find({ examId: e.id }).sort({ date: 1 });
    const formattedSubjects = await Promise.all(
      subjects.map(async (s) => {
        const sc = await SchoolClass.findById(s.classId);
        const teacher = s.teacherId ? await TeacherProfile.findById(s.teacherId) : null;
        const teacherUser = teacher ? await User.findById(teacher.userId) : null;

        return {
          id: s.id,
          subjectName: s.subjectName,
          className: sc ? sc.name : s.className || '',
          date: s.date.toISOString().split('T')[0],
          startTime: s.startTime,
          endTime: s.endTime,
          teacherId: s.teacherId || null,
          teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() : undefined,
          paperPdfUrl: s.paperPdfUrl || null,
          paperStatus: s.paperStatus,
          rejectionReason: s.rejectionReason || undefined,
          marksUploaded: s.marksUploaded,
        };
      })
    );

    return {
      id: e.id,
      schoolId: e.tenantId,
      title: e.title,
      className: classNames[0] || 'General',
      classes: classNames.length > 0 ? classNames : e.classes || ['General'],
      startDate: e.startDate.toISOString().split('T')[0],
      endDate: e.endDate.toISOString().split('T')[0],
      status: e.status,
      subjects: formattedSubjects,
      createdAt: e.createdAt.toISOString(),
    };
  }

  static async createExam(tenantId: string, input: CreateExamInput) {
    const classNames =
      input.classes && input.classes.length > 0
        ? input.classes
        : input.className
        ? [input.className]
        : ['Class 10-A'];

    const startDate = new Date(input.startDate + 'T00:00:00Z');
    const endDate = new Date(input.endDate + 'T00:00:00Z');

    const newExam = await Exam.create({
      tenantId,
      title: input.title.trim(),
      name: input.title.trim(),
      classes: classNames,
      startDate,
      endDate,
      status: input.status || 'UPCOMING',
    });

    for (const clsName of classNames) {
      let sc = await SchoolClass.findOne({
        tenantId,
        name: new RegExp(`^${clsName.trim()}$`, 'i'),
      });

      if (!sc) {
        sc = await SchoolClass.create({
          tenantId,
          name: clsName.trim(),
          standard: '10',
          section: 'A',
        });
      }

      await ExamClass.create({
        examId: newExam.id,
        classId: sc.id,
      });

      for (const sub of input.subjects) {
        let teacherProfileId: string | null = null;
        if (sub.teacherId) {
          const t = await TeacherProfile.findOne({
            tenantId,
            $or: [{ _id: sub.teacherId }, { userId: sub.teacherId }],
          });
          teacherProfileId = t?.id || null;
        }

        await ExamSubject.create({
          examId: newExam.id,
          classId: sc.id,
          className: sc.name,
          subjectName: sub.subjectName.trim(),
          date: new Date(sub.date + 'T00:00:00Z'),
          startTime: sub.startTime,
          endTime: sub.endTime,
          teacherId: teacherProfileId,
          paperStatus: 'PENDING',
          marksUploaded: false,
        });
      }

      const students = await StudentProfile.find({ tenantId, classId: sc.id });
      for (const stu of students) {
        await AdmitCardClearance.create({
          examId: newExam.id,
          studentId: stu.id,
          approved: true,
          feeDue: false,
        });
      }
    }

    return this.getExam(tenantId, newExam.id);
  }

  static async deleteExam(tenantId: string, examId: string) {
    const e = await Exam.findOne({ _id: examId, tenantId });

    if (!e) {
      throw new AppError('Exam not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await Exam.findByIdAndDelete(examId);
    await ExamClass.deleteMany({ examId });
    await ExamSubject.deleteMany({ examId });
    await AdmitCardClearance.deleteMany({ examId });

    return { success: true, message: 'Exam deleted successfully' };
  }

  static async updatePaperStatus(
    tenantId: string,
    examId: string,
    subjectId: string,
    input: UpdatePaperStatusInput
  ) {
    const subject = await ExamSubject.findOne({ _id: subjectId, examId });

    if (!subject) {
      throw new AppError('Exam subject not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    subject.paperStatus = input.paperStatus as any;
    if (input.paperPdfUrl !== undefined) subject.paperPdfUrl = input.paperPdfUrl;
    if (input.rejectionReason !== undefined) subject.rejectionReason = input.rejectionReason;
    await subject.save();

    return {
      id: subject.id,
      paperStatus: subject.paperStatus,
      paperPdfUrl: subject.paperPdfUrl,
      rejectionReason: subject.rejectionReason,
    };
  }

  static async enterMarks(
    tenantId: string,
    examId: string,
    subjectId: string,
    input: EnterMarksInput,
    graderUserId: string
  ) {
    const subject = await ExamSubject.findOne({ _id: subjectId, examId });

    if (!subject) {
      throw new AppError('Exam subject not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    for (const m of input.marks) {
      let student = await StudentProfile.findOne({
        tenantId,
        $or: [{ _id: m.studentId }, { userId: m.studentId }],
      });

      if (!student) {
        student = await StudentProfile.findById(m.studentId);
      }

      if (!student) continue;

      let mark = await ExamMark.findOne({
        examSubjectId: subject.id,
        studentId: student.id,
      });

      if (mark) {
        mark.marksObtained = m.marksObtained;
        mark.maxMarks = m.maxMarks;
        mark.gradedBy = graderUserId;
        await mark.save();
      } else {
        await ExamMark.create({
          examSubjectId: subject.id,
          studentId: student.id,
          marksObtained: m.marksObtained,
          maxMarks: m.maxMarks,
          gradedBy: graderUserId,
        });
      }
    }

    subject.marksUploaded = true;
    await subject.save();

    return this.getMarks(tenantId, examId, subjectId);
  }

  static async getMarks(tenantId: string, examId: string, subjectId: string) {
    const marks = await ExamMark.find({ examSubjectId: subjectId });

    const results = await Promise.all(
      marks.map(async (m) => {
        const student = await StudentProfile.findById(m.studentId);
        const user = student ? await User.findById(student.userId) : null;

        return {
          id: m.id,
          studentId: m.studentId,
          studentUserId: student ? student.userId : '',
          studentName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
          rollNumber: student ? student.rollNumber : '',
          marksObtained: Number(m.marksObtained),
          maxMarks: Number(m.maxMarks),
          gradedBy: m.gradedBy || '',
          createdAt: m.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async getAdmitCardApprovals(tenantId: string, examId: string) {
    const clearances = await AdmitCardClearance.find({ examId });

    const results = await Promise.all(
      clearances.map(async (c) => {
        const student = await StudentProfile.findById(c.studentId);
        const user = student ? await User.findById(student.userId) : null;
        const cls = student && student.classId ? await SchoolClass.findById(student.classId) : null;

        return {
          studentId: c.studentId,
          studentUserId: student ? student.userId : '',
          studentName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
          className: cls ? cls.name : student?.className || '',
          rollNumber: student ? student.rollNumber : '',
          attendance: 95,
          feeDue: c.feeDue,
          examId: c.examId,
          approved: c.approved,
        };
      })
    );

    return results;
  }

  static async toggleAdmitApproval(
    tenantId: string,
    examId: string,
    studentId: string,
    input: ToggleAdmitApprovalInput,
    reviewerUserId: string
  ) {
    let student = await StudentProfile.findOne({
      tenantId,
      $or: [{ _id: studentId }, { userId: studentId }],
    });

    if (!student) {
      student = await StudentProfile.findById(studentId);
    }

    if (!student) {
      throw new AppError('Student not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    let clearance = await AdmitCardClearance.findOne({
      examId,
      studentId: student.id,
    });

    if (clearance) {
      clearance.approved = input.approved;
      if (input.feeDue !== undefined) clearance.feeDue = input.feeDue;
      clearance.approvedBy = reviewerUserId;
      clearance.approvedAt = new Date();
      await clearance.save();
    } else {
      clearance = await AdmitCardClearance.create({
        examId,
        studentId: student.id,
        approved: input.approved,
        feeDue: input.feeDue || false,
        approvedBy: reviewerUserId,
        approvedAt: new Date(),
      });
    }

    return {
      examId: clearance.examId,
      studentId: clearance.studentId,
      approved: clearance.approved,
      feeDue: clearance.feeDue,
    };
  }

  static async getStudentAdmitCard(tenantId: string, examId: string, studentUserId: string) {
    const student = await StudentProfile.findOne({ tenantId, userId: studentUserId });

    if (!student) {
      throw new AppError('Student profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const clearance = await AdmitCardClearance.findOne({
      examId,
      studentId: student.id,
    });

    if (!clearance || !clearance.approved) {
      throw new AppError(
        'Your admit card has not been approved yet. Please contact the administration.',
        HTTP_STATUS.FORBIDDEN,
        'NOT_APPROVED'
      );
    }

    if (clearance.feeDue) {
      throw new AppError(
        'Your admit card is withheld due to outstanding fees. Please clear dues with the accounts department.',
        HTTP_STATUS.FORBIDDEN,
        'FEE_DUE'
      );
    }

    const exam = await this.getExam(tenantId, examId);
    const tenant = await Tenant.findById(tenantId);
    const user = await User.findById(student.userId);
    const cls = student.classId ? await SchoolClass.findById(student.classId) : null;

    return {
      id: `ac_${exam.id}_${student.id}`,
      examId: exam.id,
      examTitle: exam.title,
      schoolName: tenant ? tenant.name : 'SkoolNova Campus',
      studentId: student.id,
      studentName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
      className: cls ? cls.name : student.className || '',
      rollNumber: student.rollNumber,
      schedule: exam.subjects.filter((s) => s.className === (cls ? cls.name : student.className)),
      isGenerated: true,
      approvedAt: clearance.approvedAt?.toISOString() || new Date().toISOString(),
    };
  }
}
