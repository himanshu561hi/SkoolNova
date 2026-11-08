import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('DigiSchool ERP Full Integration Test Suite', async (t) => {
  const app = await buildApp();
  await app.ready();

  let adminToken = '';
  let managerToken = '';
  let teacherToken = '';
  let studentToken = '';
  let schoolId = '';
  let studentProfileId = '';
  let teacherProfileId = '';
  let assignmentId = '';
  let examId = '';
  let subjectId = '';
  let leaveId = '';

  await t.test('1. System Health Check', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
  });

  await t.test('2. Super Admin Login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@digischool.com', password: '123456' },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    adminToken = body.data.accessToken;
    assert.equal(body.data.user.role, 'SUPER_ADMIN');
  });

  await t.test('3. Onboard School & Manager Transactionally', async () => {
    const schoolName = `Cambridge Academy ${Date.now()}`;
    const managerEmail = `mgr_${Date.now()}@cambridge.edu`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        schoolName,
        managerFirstName: 'David',
        managerLastName: 'Miller',
        managerEmail,
        managerPassword: 'Manager@123',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    schoolId = body.data.id;
    assert.ok(schoolId);

    // Login as Manager
    const mgrLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: managerEmail, password: 'Manager@123' },
    });
    assert.equal(mgrLogin.statusCode, 200);
    managerToken = JSON.parse(mgrLogin.payload).data.accessToken;
  });

  await t.test('4. Provision Teacher and Student Accounts', async () => {
    // Create Teacher
    const teacherEmail = `teacher_${Date.now()}@cambridge.edu`;
    const tchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/teachers',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        fullName: 'Dr. Sarah Connor',
        email: teacherEmail,
        phone: '9876543210',
        employeeId: `EMP-${Date.now()}`,
        department: 'Science',
        subject: 'Physics',
        qualification: 'M.Sc., B.Ed.',
        experienceYears: 5,
        joiningDate: '2023-01-10',
        password: 'Teacher@123',
      },
    });
    assert.equal(tchRes.statusCode, 201);
    teacherProfileId = JSON.parse(tchRes.payload).data.id;

    // Login as Teacher
    const tchLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: teacherEmail, password: 'Teacher@123' },
    });
    assert.equal(tchLogin.statusCode, 200);
    teacherToken = JSON.parse(tchLogin.payload).data.accessToken;

    // Create Student
    const studentEmail = `student_${Date.now()}@cambridge.edu`;
    const stuRes = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        firstName: 'John',
        lastName: 'Doe',
        email: studentEmail,
        className: 'Class 10-A',
        rollNumber: '1',
        password: 'Student@123',
      },
    });
    assert.equal(stuRes.statusCode, 201);
    studentProfileId = JSON.parse(stuRes.payload).data.id;

    // Login as Student
    const stuLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: studentEmail, password: 'Student@123' },
    });
    assert.equal(stuLogin.statusCode, 200);
    studentToken = JSON.parse(stuLogin.payload).data.accessToken;
  });

  await t.test('5. Timetable Collision Prevention', async () => {
    // Slot 1
    const slot1 = await app.inject({
      method: 'POST',
      url: '/api/v1/timetable/slots',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        className: 'Class 10-A',
        day: 'Monday',
        periodIndex: 0,
        teacherId: teacherProfileId,
        subject: 'Physics',
      },
    });
    assert.equal(slot1.statusCode, 200);

    // Collision Attempt: Same teacher, same day, same period, different class
    const collision = await app.inject({
      method: 'POST',
      url: '/api/v1/timetable/slots',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        className: 'Class 10-B',
        day: 'Monday',
        periodIndex: 0,
        teacherId: teacherProfileId,
        subject: 'Physics',
      },
    });
    assert.equal(collision.statusCode, 409);
  });

  await t.test('6. Attendance 15-Day Lock and Logging', async () => {
    const today = new Date().toISOString().split('T')[0];
    const okAtt = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance/students',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        date: today,
        className: 'Class 10-A',
        subject: 'Physics',
        periodIndex: 0,
        records: [{ studentId: studentProfileId, status: 'PRESENT' }],
      },
    });
    assert.equal(okAtt.statusCode, 200);

    // Locked Attendance: 30 days in past
    const lockedAtt = await app.inject({
      method: 'POST',
      url: '/api/v1/attendance/students',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        date: '2025-01-01',
        className: 'Class 10-A',
        subject: 'Physics',
        periodIndex: 0,
        records: [{ studentId: studentProfileId, status: 'PRESENT' }],
      },
    });
    assert.equal(lockedAtt.statusCode, 400);
  });

  await t.test('7. Assignment Lifecycle: Create, Submit, Grade', async () => {
    const due = new Date(Date.now() + 5 * 86400000).toISOString();
    const createAssn = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        title: 'Kinematics Problems',
        description: 'Complete numericals 1-5',
        className: 'Class 10-A',
        subject: 'Physics',
        dueDate: due,
      },
    });
    assert.equal(createAssn.statusCode, 201);
    assignmentId = JSON.parse(createAssn.payload).data.id;

    // Student submits
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submit`,
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        content: 'Completed problems',
        attachmentName: 'answers.pdf',
        attachmentUrl: '/api/v1/uploads/answers.pdf',
      },
    });
    assert.equal(submitRes.statusCode, 200);

    // Teacher grades
    const assnDetails = await app.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentId}`,
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    const subId = JSON.parse(assnDetails.payload).data.submissions[0].id;

    const gradeRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assignments/submissions/${subId}/grade`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        grade: 'A',
        teacherRemarks: 'Well done',
      },
    });
    assert.equal(gradeRes.statusCode, 200);
  });

  await t.test('8. Examination and Admit Card Governance', async () => {
    const createExm = await app.inject({
      method: 'POST',
      url: '/api/v1/exams',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Term 1 Exam',
        className: 'Class 10-A',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        subjects: [
          {
            subjectName: 'Physics',
            date: '2026-12-02',
            startTime: '09:00 AM',
            endTime: '12:00 PM',
          },
        ],
      },
    });
    assert.equal(createExm.statusCode, 201);
    const exm = JSON.parse(createExm.payload).data;
    examId = exm.id;
    subjectId = exm.subjects[0].id;

    // Teacher uploads marks
    const marksRes = await app.inject({
      method: 'POST',
      url: `/api/v1/exams/${examId}/subjects/${subjectId}/marks`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        marks: [{ studentId: studentProfileId, marksObtained: 95, maxMarks: 100 }],
      },
    });
    assert.equal(marksRes.statusCode, 200);

    // Student fetches admit card
    const cardRes = await app.inject({
      method: 'GET',
      url: `/api/v1/exams/${examId}/admit-card`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    assert.equal(cardRes.statusCode, 200);
    const card = JSON.parse(cardRes.payload).data;
    assert.equal(card.rollNumber, '1');
  });

  await t.test('9. Multi-Level Leave Application', async () => {
    // Student files leave
    const applyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leaves',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        subject: 'Family function',
        description: 'Attending wedding out of town',
        startDate: '2026-11-15',
        endDate: '2026-11-17',
      },
    });
    assert.equal(applyRes.statusCode, 201);
    leaveId = JSON.parse(applyRes.payload).data.id;

    // Teacher reviews & forwards
    const tchFwd = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leaves/${leaveId}/review`,
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        status: 'PENDING_MANAGER',
        remark: 'Forwarded with recommendation',
      },
    });
    assert.equal(tchFwd.statusCode, 200);

    // Manager gives final approval
    const mgrAppr = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leaves/${leaveId}/review`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        status: 'APPROVED',
        remark: 'Approved by principal',
      },
    });
    assert.equal(mgrAppr.statusCode, 200);
    assert.equal(JSON.parse(mgrAppr.payload).data.status, 'APPROVED');
  });

  await t.test('10. Notifications and Dashboard Aggregations', async () => {
    // Create broadcast notification
    const notifRes = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Holiday Notice',
        message: 'School will remain closed on Friday.',
        type: 'notice',
        targetRole: 'ALL',
      },
    });
    assert.equal(notifRes.statusCode, 201);

    // Student checks unread count
    const unread = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    assert.equal(unread.statusCode, 200);
    assert.ok(JSON.parse(unread.payload).data.unreadCount >= 1);

    // Manager dashboard stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
      headers: { authorization: `Bearer ${managerToken}` },
    });
    assert.equal(statsRes.statusCode, 200);
    const stats = JSON.parse(statsRes.payload).data;
    assert.ok(stats.length > 0);
  });

  await app.close();
});

