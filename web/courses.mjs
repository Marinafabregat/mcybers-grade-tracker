export const courses = [
  { id: 'AS', name: 'Application Security', page: 3, mode: 'assignment',
    parts: [['t1', 'Test 1', 20], ['t2', 'Test 2', 20], ['assignment', 'Assignment and presentation', 30], ['lab', 'SecDevOps lab', 30]] },
  { id: 'CSMAGT', name: 'Cybersecurity Management', page: 2, mode: 'reports',
    parts: [['reports', 'Report average', 60], ['peer', 'Peer assessment', 20], ['attendance', 'Attendance grade', 10], ['debates', 'Debates and participation', 10]] },
  { id: 'DPROT', name: 'Data Protection', page: 3,
    parts: [['final', 'Final exam', 40], ['work', 'Lab assignments and reports', 60]] },
  { id: 'MALW', name: 'Malware', page: 4,
    parts: [['final', 'Final exam', 30], ['lab', 'Lab exercises', 20], ['project', 'Project', 30], ['presentations', 'Presentations', 20]] },
  { id: 'NS', name: 'Network Security', page: 5,
    parts: [['midterm', 'Midterm exam', 30], ['final', 'Final exam', 40], ['class', 'Attendance and in-class performance', 10], ['work', 'Assignments', 20]] },
  { id: 'TMA', name: 'Network Traffic Monitoring and Analysis', page: 3,
    parts: [['midterm', 'Midterm exam', 20], ['final', 'Final exam', 30], ['project', 'Lab / project', 40], ['participation', 'Participation', 10]] },
];

export function partsFor(course, draft) {
  if (course.id === 'MALW' && draft.detail) {
    const [finalExam, , project, presentations] = course.parts;

    return [
      finalExam,
      ['lab1', 'Lab 1', 6],
      ['lab2', 'Lab 2', 6],
      ['lab3', 'Lab 3', 6],
      ['lab4', 'Lab 4', 2],
      project,
      presentations,
    ];
  }
  if (course.mode === 'assignment' && draft.detail) {
    const [t1, t2, , lab] = course.parts;
    return [t1, t2, ['content', 'Assignment · Content', 12],
      ['delivery', 'Assignment · Presentation', 9],
      ['questions', 'Assignment · Knowledge and questions', 9], lab];
  }
  if (course.mode === 'reports' && draft.detail && reportCount(draft.count)) {
    const reports = Array.from({ length: Number(draft.count) }, (_, i) =>
      ['report' + (i + 1), 'Report ' + (i + 1), 60 / Number(draft.count)]);
    return [...reports, ...course.parts.slice(1)];
  }
  return course.parts;
}

export function reportCount(value) {
  return /^\d{1,2}$/.test(value ?? '') && Number(value) >= 1 && Number(value) <= 50;
}

export function parseMark(value, max = 10) {
  const input = (value ?? '').trim();
  if (!input) return null;
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(input)) return NaN;
  const number = Number(input.replace(',', '.'));
  return number <= max ? number : NaN;
}

export function calculate(parts, grades) {
  let points = 0;
  let weight = 0;
  const pending = [];
  for (const part of parts) {
    const mark = parseMark(grades[part[0]]);
    if (mark === null || Number.isNaN(mark)) {
      pending.push(part);
    } else {
      points += mark * part[2] / 100;
      weight += part[2];
    }
  }
  const remaining = pending.reduce((total, part) => total + part[2], 0);
  return { points, weight, pending, remaining, maximum: Math.min(10, points + remaining / 10) };
}

export function needed(target, points, weight) {
  const gap = target - points;
  if (gap <= 1e-9) return { kind: 'reached' };
  if (gap > weight / 10 + 1e-9) return { kind: 'impossible' };
  return { kind: 'grade', value: Math.ceil(gap * 10000 / weight - 1e-8) / 100 };
}

export const fmt = (value, digits = 2) => value.toLocaleString('en-GB', { maximumFractionDigits: digits });
