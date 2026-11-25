import { courses, partsFor, reportCount, parseMark, calculate, needed, fmt } from './courses.mjs';

const nav = document.querySelector('#courses');
const view = document.querySelector('#course');
const loading = document.querySelector('#loading');
const layout = document.querySelector('#layout');
const drafts = new Map();
const saved = new Map();
const scenarios = new Map();
let current = courses[0];
let saving = false;

const blank = () => ({ grades: {}, detail: false, count: '', attendance: '', target: '' });
const dirty = id => JSON.stringify(drafts.get(id)) !== saved.get(id);

window.addEventListener('beforeunload', event => {
  if (courses.some(course => drafts.has(course.id) && dirty(course.id))) {
    event.preventDefault();
    event.returnValue = '';
  }
});

function markField(id, label, hint = '', extra = '') {
  return `<label class="field" for="${id}"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span>
    <input id="${id}" type="text" inputmode="decimal" maxlength="6" autocomplete="off" placeholder="—" ${extra}></label>`;
}

function renderNav() {
  nav.innerHTML = courses.map(course => `<button type="button" data-course="${course.id}"
    ${course === current ? 'aria-current="true"' : ''}><span class="course-code">${course.id}</span>
    <span class="course-name">${course.name}</span><span class="nav-meta"></span></button>`).join('');
  syncNav();
}

function syncNav() {
  for (const course of courses) {
    const button = nav.querySelector(`[data-course="${course.id}"] .nav-meta`);
    const draft = drafts.get(course.id);
    const { points, weight, pending } = calculate(partsFor(course, draft), draft.grades);
    const waitingCount = course.mode === 'reports' && draft.detail && !reportCount(draft.count);
    button.textContent = waitingCount || !weight ? '—' : pending.length ? fmt(weight, 1) + ' %' : fmt(points, 3) + ' / 10';
    button.title = pending.length ? 'Graded weight' : 'Weighted grade';
    button.classList.toggle('unsaved', dirty(course.id));
  }
}

function renderCourse() {
  const draft = drafts.get(current.id);
  const isReports = current.mode === 'reports';
  const isAS = current.mode === 'assignment';
  const isMalware = current.id === 'MALW';
  const needsCount = isReports && draft.detail && !reportCount(draft.count);
  const parts = partsFor(current, draft);

  view.innerHTML = `
    <div class="heading"><h2>${current.name}</h2></div>
    <div class="metrics" id="metrics"></div>
    <div class="columns">
      <section class="panel" aria-labelledby="marks">
        <div class="panel-heading"><h3 id="marks">Your grades</h3><p>Enter grades out of 10. Leave pending items blank.</p></div>
        ${isReports || isAS || isMalware ? `<label class="switch"><input type="checkbox" id="detail">
          ${isReports ? 'Enter each report separately' :
            isMalware ? 'Break down the lab grades' : 'Break down the assignment and presentation'}</label>` : ''}
        ${isReports && draft.detail ? `<form class="count-form" id="count-form">
          <label for="count">Total number of reports</label><div><input id="count" inputmode="numeric" maxlength="2" placeholder="1–50" required>
          <button class="secondary" type="submit">Apply</button></div><small>All reports have equal weight.</small>
          <p class="field-error" id="count-error" role="status"></p></form>` : ''}
        <div class="marks-list">${parts.filter(([id]) => !needsCount || id !== 'reports')
          .map(([id, label, weight]) => markField('mark-' + id, label, fmt(weight, 3) + ' %')).join('')}</div>
        ${isReports ? `<div class="attendance">
          ${markField('attendance', 'Actual attendance', 'Percentage · 80% minimum required')}
          <p id="attendance-status"></p></div>` : ''}
        <div class="save-row"><button type="button" class="primary" id="save">Save grades</button><span id="save-status" role="status"></span></div>
      </section>
      <section class="panel goals" aria-labelledby="goal-title">
        <div class="panel-heading"><h3 id="goal-title">What grade do you need?</h3></div>
        <div id="simulation" class="simulation"></div>
        ${markField('target', 'Custom target', 'Optional · out of 10')}
        <div id="targets"></div>
        <p class="help" id="goal-help"></p>
      </section>
    </div>`;

  view.querySelector('#target').value = draft.target;
  if (isReports) view.querySelector('#attendance').value = draft.attendance;
  if (isReports && draft.detail) view.querySelector('#count').value = draft.count;
  if (isReports || isAS || isMalware) view.querySelector('#detail').checked = draft.detail;
  for (const [id] of parts) {
    const input = view.querySelector('#mark-' + id);
    if (input) input.value = draft.grades[id] ?? '';
  }
  update();
}

function update() {
  const draft = drafts.get(current.id);
  const parts = partsFor(current, draft);
  const { points, weight, pending, maximum } = calculate(parts, draft.grades);
  const missingCount = current.mode === 'reports' && draft.detail && !reportCount(draft.count);
  const attendance = parseMark(draft.attendance, 100);
  const custom = parseMark(draft.target);
  const countEdited = view.querySelector('#count') && view.querySelector('#count').value !== draft.count;
  let invalid = missingCount || countEdited;
  for (const input of view.querySelectorAll('.field input')) {
    const error = Number.isNaN(parseMark(input.value, input.id === 'attendance' ? 100 : 10));
    input.setAttribute('aria-invalid', String(error));
    invalid ||= error;
  }
  const metrics = view.querySelector('#metrics');
  const range = pending.length ? fmt(points, 5) + '–' + fmt(maximum, 5) : fmt(points, 5);
  const stats = [
    [pending.length ? 'Points earned' : 'Weighted grade', missingCount ? '—' : fmt(points, 5), '/ 10'],
    ['Graded weight', missingCount ? '—' : fmt(weight, 2), '%'],
    [pending.length ? 'Possible final range' : 'Assessment', missingCount ? '—' :
      pending.length ? range : 'Complete', pending.length ? '/ 10' : ''],
  ];
  if (pending.length && weight) stats[1].push('Average for graded work: ' + fmt(points * 100 / weight) + ' / 10');
  metrics.innerHTML = stats.map(([label, value, unit, note]) => `<div class="metric">
    <span>${label}</span><strong>${value} <small>${unit}</small></strong>${note ? `<span>${note}</span>` : ''}</div>`).join('');
  metrics.style.setProperty('--progress', Math.min(100, missingCount ? 0 : weight) + '%');

  if (current.mode === 'reports') {
    const status = view.querySelector('#attendance-status');
    status.textContent = Number.isNaN(attendance) ? 'Enter a percentage between 0 and 100.' :
      attendance === null ? 'Attendance minimum not yet verified.' :
      attendance < 80 ? 'Below the required minimum.' : 'You meet the attendance minimum.';
    status.className = attendance < 80 && attendance !== null ? 'warning' : '';
  }
  const save = view.querySelector('#save');
  save.disabled = invalid || saving || !dirty(current.id);
  view.querySelector('#save-status').textContent = saving ? 'Saving…' :
    countEdited ? 'Apply the report count.' : missingCount ? 'Enter the number of reports.' : invalid ? 'Check the marked fields. Use up to two decimal places.' :
      dirty(current.id) ? 'Unsaved changes' : 'No pending changes';

  const scenario = scenarios.get(current.id);
  const selected = pending.find(([id]) => id === scenario.part);
  const canChoose = !missingCount && pending.length > 1;
  const sim = view.querySelector('#simulation');
  const signature = canChoose ? pending.map(([id]) => id).join() : '';
  if (sim.dataset.signature !== signature) {
    sim.dataset.signature = signature;
    sim.innerHTML = canChoose ? `<label for="part">Calculate for</label><select id="part">
      <option value="">All pending items</option>${pending.map(([id, label]) =>
        `<option value="${id}">${label}</option>`).join('')}</select>
      ${markField('assumption', 'Grade for other pending items', 'Simulation value')}` : '';
    if (canChoose) sim.querySelector('#assumption').value = scenario.assumption;
  }
  if (canChoose) {
    sim.querySelector('#part').value = selected?.[0] ?? '';
    sim.querySelector('#assumption').parentElement.hidden = !selected;
  }

  const assumption = parseMark(scenario.assumption);
  if (canChoose) sim.querySelector('#assumption').setAttribute('aria-invalid', String(Number.isNaN(assumption)));
  const scoped = canChoose && selected;
  const known = scoped ? points + (assumption ?? 0) * (pending.reduce((sum, part) => sum + part[2], 0) - selected[2]) / 100 : points;
  const scope = scoped ? selected[2] : pending.reduce((sum, part) => sum + part[2], 0);
  const targets = [['Pass', 5], ['Good', 7], ['Excellent', 9]];
  if (custom !== null && !Number.isNaN(custom)) targets.push(['Custom', custom]);
  const help = view.querySelector('#goal-help');
  help.textContent = missingCount ? 'Apply the total number of reports to calculate targets.' :
    scoped && (assumption === null || Number.isNaN(assumption)) ? 'Enter a valid grade for the other pending items.' :
    scoped ? 'Minimum grade for ' + selected[1] + ' with the stated assumption.' :
    pending.length === 1 ? 'Minimum grade for ' + pending[0][1] + '.' :
    pending.length ? 'Minimum weighted average across pending items.' : 'Assessment complete.';
  const attendanceUnconfirmed = current.mode === 'reports' && !(attendance >= 80);
  if (attendanceUnconfirmed) {
    help.textContent += ' Grade targets are subject to the 80% attendance minimum.';
  }

  view.querySelector('#targets').innerHTML = targets.map(([label, target]) => {
    let result = { kind: 'waiting' };
    if (!missingCount && (!scoped || (assumption !== null && !Number.isNaN(assumption)))) {
      result = needed(target, known, scope);
    }
    const display = { reached: attendanceUnconfirmed ? 'Grade reached' : 'Reached', impossible: 'Not achievable', waiting: '—' };
    const message = result.kind === 'grade' ? fmt(result.value) + ' / 10' : display[result.kind];
    return `<div class="target"><div><strong>${label}</strong><small>${fmt(target)} / 10</small></div>
      <span class="${result.kind}">${message}</span></div>`;
  }).join('');
  syncNav();
}

nav.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || saving) return;
  current = courses.find(course => course.id === button.dataset.course);
  for (const item of nav.querySelectorAll('button')) item.removeAttribute('aria-current');
  button.setAttribute('aria-current', 'true');
  renderCourse();
});

view.addEventListener('input', event => {
  const { id, value } = event.target;
  const draft = drafts.get(current.id);
  if (id.startsWith('mark-')) draft.grades[id.slice(5)] = value;
  else if (id === 'target' || id === 'attendance') draft[id] = value;
  else if (id === 'assumption') scenarios.get(current.id).assumption = value;
  else if (id === 'count') view.querySelector('#count-error').textContent = '';
  else return;
  update();
});

view.addEventListener('change', event => {
  if (event.target.id === 'detail') {
    drafts.get(current.id).detail = event.target.checked;
    renderCourse();
    view.querySelector('#detail').focus();
  }
  if (event.target.id === 'part') {
    scenarios.get(current.id).part = event.target.value;
    update();
  }
});

view.addEventListener('submit', event => {
  event.preventDefault();
  const count = view.querySelector('#count').value;
  if (!reportCount(count)) {
    view.querySelector('#count-error').textContent = 'Enter a whole number between 1 and 50.';
    return;
  }
  drafts.get(current.id).count = String(Number(count));
  renderCourse();
  view.querySelector('#count').focus();
});

view.addEventListener('click', async event => {
  if (event.target.id !== 'save' || saving) return;
  const id = current.id;
  const payload = JSON.stringify(drafts.get(id));
  saving = true;
  update();
  let failure = false;
  try {
    const response = await fetch('/api/grades/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    saved.set(id, payload);
  } catch {
    failure = true;
  } finally {
    saving = false;
    update();
    if (failure || !dirty(id)) {
      view.querySelector('#save-status').textContent = failure ? 'Could not save. You can try again.' : 'Grades saved';
    }
  }
});

try {
  const response = await fetch('/api/grades');
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const stored = await response.json();
  for (const course of courses) {
    const draft = stored[course.id] ?? blank();
    drafts.set(course.id, draft);
    saved.set(course.id, JSON.stringify(draft));
    scenarios.set(course.id, { part: '', assumption: '7' });
  }
  renderNav();
  renderCourse();
  loading.hidden = true;
  layout.hidden = false;
} catch {
  loading.textContent = 'Could not load grades. Check that the server is running, then reload.';
}