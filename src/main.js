import { getState, setState, nextId } from './store.js';
import { createClass, createStudent, getStudentById, getClassById, parseClassesBatchFromText } from './data-model.js';
import { assignWavesToStudents, applyWaveAssignment } from './scheduler.js';
import { getRoute, ROUTES, initRouter } from './router.js';
import { renderLandingPage } from './landing.js';

const VIEWS = { classes: 'classes', siblings: 'siblings', schedule: 'schedule' };

function render() {
  const route = getRoute();
  const app = document.getElementById('app');
  if (!app) return;

  if (route === ROUTES.landing) {
    renderLandingPage(app);
    return;
  }

  document.title = 'Planification théâtre — Application';
  const state = getState();
  const view = state.currentView || VIEWS.classes;
  const editingClassId = state.editingClassId || null;

  app.innerHTML = `
    <h1>Représentations théâtre — Planification</h1>
    <nav>
      <a href="#/">Accueil</a>
      <a href="#" data-view="classes" data-active="${view === VIEWS.classes}">Classes</a>
      <a href="#" data-view="siblings" data-active="${view === VIEWS.siblings}">Fratries</a>
      <a href="#" data-view="schedule" data-active="${view === VIEWS.schedule}">Horaires</a>
    </nav>
    <main id="main-content"></main>
  `;

  app.querySelector('nav').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-view]');
    if (!a) return;
    e.preventDefault();
    setState((s) => ({ ...s, currentView: a.dataset.view }));
    render();
  });

  const main = document.getElementById('main-content');
  const editingClassIds = state.editingClassIds ?? [];
  if (view === VIEWS.classes) renderClassesView(main, state, editingClassId, editingClassIds);
  else if (view === VIEWS.siblings) renderSiblingsView(main, state);
  else if (view === VIEWS.schedule) renderScheduleView(main, state);
}

function renderClassesView(container, state, editingClassId, editingClassIds) {
  const { classes } = state;

  // Plusieurs classes en vérification après import (Enregistrer = toast à la place du bloc, puis disparition après 2s)
  if (editingClassIds.length > 0) {
    const toastClassIds = state.toastClassIds ?? [];
    const idsToShow = editingClassIds.filter((id) => getClassById(classes, id));
    container.innerHTML = `<div id="multi-edit-blocks"></div>`;
    const blocksContainer = container.querySelector('#multi-edit-blocks');
    blocksContainer.innerHTML = idsToShow
      .map((id) => {
        if (toastClassIds.includes(id)) {
          return `<div class="class-editor-block class-toast card" data-class-id="${id}"><p class="toast-message">Classe enregistrée</p></div>`;
        }
        const cls = getClassById(classes, id);
        return cls ? renderClassEditorBlock(cls, true) : '';
      })
      .join('');
    idsToShow.forEach((id) => {
      if (toastClassIds.includes(id)) return;
      const cls = getClassById(classes, id);
      if (cls) {
        const block = blocksContainer.querySelector(`.class-editor-block[data-class-id="${id}"]:not(.class-toast)`);
        if (block) bindClassEditor(block, cls, true);
      }
    });
    return;
  }

  // Une seule classe en édition
  if (editingClassId) {
    const cls = getClassById(classes, editingClassId);
    if (cls) {
      container.innerHTML = renderClassEditorBlock(cls, false);
      bindClassEditor(container.querySelector('.class-editor-block'), cls, false);
      return;
    }
  }

  container.innerHTML = `
    <div class="card">
      <h2>Classes</h2>
      <p class="muted mb-2">Créez les classes (niveau, instituteur, liste d'élèves). Les vagues seront attribuées automatiquement lors du planning.</p>
      <div class="flex gap-1 mb-2">
        <button type="button" class="primary" id="btn-new-class">Nouvelle classe</button>
        <button type="button" id="btn-toggle-import">Importer une ou plusieurs classes (texte)</button>
      </div>
      <div id="import-class-block" class="import-block" style="display: none;">
        <label for="import-class-text">Collez une ou plusieurs classes (séparez les classes par <code>---</code> sur une ligne)</label>
        <textarea id="import-class-text" rows="16" placeholder="niveau: CP\ninstituteur: Carine Dupont\nÉlèves:\n- Dubois Joséphine\n- Martin Louis\n---\nniveau: CE1\n..."></textarea>
        <p class="muted mb-1" style="font-size: 0.85rem;">Une classe : <code>niveau:</code>, <code>instituteur:</code>, <code>Élèves:</code> puis <code>- Nom Prénom</code>. Séparez les classes par <code>---</code>.</p>
        <button type="button" class="primary" id="btn-import-class">Créer les classes à partir du texte</button>
        <p id="import-class-error" class="import-error" style="display: none; color: var(--accent); margin-top: 0.5rem;"></p>
      </div>
    </div>
    <div id="classes-list"></div>
  `;

  container.querySelector('#btn-toggle-import').addEventListener('click', () => {
    const block = container.querySelector('#import-class-block');
    block.style.display = block.style.display === 'none' ? 'block' : 'none';
  });

  container.querySelector('#btn-import-class').addEventListener('click', () => {
    const textarea = container.querySelector('#import-class-text');
    const errEl = container.querySelector('#import-class-error');
    errEl.style.display = 'none';
    const parsedList = parseClassesBatchFromText(textarea.value);
    const valid = parsedList.filter((p) => p.niveau || p.teacherName || p.students.length > 0);
    if (valid.length === 0) {
      errEl.textContent = 'Aucune donnée reconnue. Vérifiez le format (niveau:, instituteur:, Élèves:, - Nom Prénom). Séparez les classes par ---.';
      errEl.style.display = 'block';
      return;
    }
    const newClasses = valid.map((parsed) => {
      const students = parsed.students.map((s) => ({
        firstName: s.firstName ?? '',
        lastName: s.lastName ?? '',
        wave: null,
      }));
      return createClass({
        niveau: parsed.niveau,
        teacherName: parsed.teacherName,
        students,
      });
    });
    setState((s) => ({
      ...s,
      classes: [...s.classes, ...newClasses],
      editingClassId: null,
      editingClassIds: newClasses.map((c) => c.id),
    }));
    textarea.value = '';
    container.querySelector('#import-class-block').style.display = 'none';
    render();
  });

  container.querySelector('#btn-new-class').addEventListener('click', () => {
    const newClass = createClass({ niveau: '', teacherName: '', students: [] });
    setState((s) => ({
      ...s,
      classes: [...s.classes, newClass],
      editingClassId: newClass.id,
    }));
    render();
  });

  const listEl = container.querySelector('#classes-list');
  if (classes.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Aucune classe. Cliquez sur "Nouvelle classe". Ou importez vos classes au format texte.</p>';
    return;
  }

  listEl.innerHTML = classes
    .map(
      (c) => `
    <div class="card" data-class-id="${c.id}">
      <div class="flex align-center wrap gap-2" style="justify-content: space-between;">
        <div>
          <h3 class="mb-0">${escapeHtml(c.niveau || 'Sans nom')} — ${escapeHtml(c.teacherName || 'Sans instit')}</h3>
          <p class="muted mb-0" style="font-size: 0.9rem;">${c.students.length} élève(s) · Vagues: ${[...new Set(c.students.filter((s) => s.wave).map((s) => s.wave))].sort().join(', ') || '—'}</p>
        </div>
        <div class="flex gap-1">
          <button type="button" class="edit-class" data-id="${c.id}">Modifier</button>
          <button type="button" class="delete-class danger" data-id="${c.id}">Supprimer</button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  listEl.querySelectorAll('.edit-class').forEach((btn) => {
    btn.addEventListener('click', () => {
      setState((s) => ({ ...s, editingClassId: btn.dataset.id }));
      render();
    });
  });
  listEl.querySelectorAll('.delete-class').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Supprimer cette classe ?')) {
        const id = btn.dataset.id;
        setState((s) => ({
          ...s,
          classes: s.classes.filter((c) => c.id !== id),
          siblingGroups: s.siblingGroups.map((g) => g.filter((sid) => {
            const found = getStudentById(s.classes, sid);
            return !found || found.class.id !== id;
          })).filter((g) => g.length >= 2),
          editingClassId: s.editingClassId === id ? null : s.editingClassId,
          editingClassIds: (s.editingClassIds ?? []).filter((cid) => cid !== id),
        }));
        render();
      }
    });
  });
}

function renderClassEditorBlock(cls, isMulti) {
  const studentsList = cls.students
    .map(
      (s) => `
    <div class="student-row flex align-center gap-2" data-student-id="${s.id}">
      <span>${escapeHtml(s.lastName)} ${escapeHtml(s.firstName)}</span>
      <button type="button" class="remove-student" data-id="${s.id}">Retirer</button>
    </div>
  `
    )
    .join('');

  const cancelBtn = isMulti
    ? ''
    : '<button type="button" class="btn-cancel-edit">Annuler</button>';

  return `
    <div class="class-editor-block card" data-class-id="${cls.id}">
      <h3>${escapeHtml(cls.niveau || 'Classe')} — ${escapeHtml(cls.teacherName || 'Sans instit')}</h3>
      <div class="grid-2 mb-2">
        <div>
          <label>Niveau (ex. CP, CE1)</label>
          <input type="text" class="input-niveau" value="${escapeHtml(cls.niveau)}" placeholder="CP" />
        </div>
        <div>
          <label>Nom de l'instituteur(trice)</label>
          <input type="text" class="input-teacher" value="${escapeHtml(cls.teacherName)}" placeholder="M. Dupont" />
        </div>
      </div>
      <h4 style="margin: 0.5rem 0 0.25rem; font-size: 0.95rem;">Élèves</h4>
      <div class="students-list mb-2">${studentsList || '<p class="empty-state">Aucun élève.</p>'}</div>
      <div class="flex gap-1 mb-2">
        <input type="text" class="new-lastname" placeholder="Nom" style="max-width: 120px;" />
        <input type="text" class="new-firstname" placeholder="Prénom" style="max-width: 120px;" />
        <button type="button" class="primary btn-add-student">Ajouter un élève</button>
      </div>
      <div class="flex gap-1">
        <button type="button" class="primary btn-save-class">Enregistrer</button>
        ${cancelBtn}
      </div>
    </div>
  `;
}

function bindClassEditor(block, cls, isMulti) {
  if (!block) return;
  block.querySelector('.btn-save-class')?.addEventListener('click', () => {
    const niveau = block.querySelector('.input-niveau').value.trim();
    const teacherName = block.querySelector('.input-teacher').value.trim();
    setState((s) => {
      const nextClasses = s.classes.map((c) =>
        c.id === cls.id ? { ...c, niveau, teacherName } : c
      );
      return {
        ...s,
        classes: nextClasses,
        ...(isMulti
          ? { toastClassIds: [...(s.toastClassIds ?? []), cls.id] }
          : { editingClassId: null }),
      };
    });
    if (isMulti) {
      setTimeout(() => {
        setState((s) => ({
          ...s,
          editingClassIds: (s.editingClassIds ?? []).filter((id) => id !== cls.id),
          toastClassIds: (s.toastClassIds ?? []).filter((id) => id !== cls.id),
        }));
        render();
      }, 2000);
    }
    render();
  });

  block.querySelector('.btn-cancel-edit')?.addEventListener('click', () => {
    setState((s) => ({ ...s, editingClassId: null }));
    render();
  });

  block.querySelector('.btn-add-student')?.addEventListener('click', () => {
    const last = block.querySelector('.new-lastname').value.trim();
    const first = block.querySelector('.new-firstname').value.trim();
    if (!first && !last) return;
    const newStudent = createStudent({ firstName: first, lastName: last });
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) =>
        c.id === cls.id ? { ...c, students: [...c.students, newStudent] } : c
      ),
    }));
    block.querySelector('.new-lastname').value = '';
    block.querySelector('.new-firstname').value = '';
    render();
  });

  block.querySelectorAll('.remove-student').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      setState((s) => ({
        ...s,
        classes: s.classes.map((c) =>
          c.id === cls.id ? { ...c, students: c.students.filter((st) => st.id !== id) } : c
        ),
        siblingGroups: s.siblingGroups.map((g) => g.filter((sid) => sid !== id)).filter((g) => g.length >= 2),
      }));
      render();
    });
  });

}

/** Extrait l'ensemble des mots du nom de famille (minuscules). */
function getLastNameWords(lastName) {
  return new Set((lastName || '').trim().split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean));
}

/**
 * Regroupe les élèves qui partagent au moins un mot dans leur nom de famille
 * (ordre ignoré). Union-Find pour les relations transitives (ex. Martin/Martin Dubois,
 * Dubois Martin Lefebvre, Lefebvre Martin Dubois → même groupe).
 */
function computeProposedFamilies(allStudents) {
  const wordToIndices = new Map();
  for (let i = 0; i < allStudents.length; i++) {
    const words = getLastNameWords(allStudents[i].lastName);
    for (const w of words) {
      if (!wordToIndices.has(w)) wordToIndices.set(w, []);
      wordToIndices.get(w).push(i);
    }
  }

  const parent = allStudents.map((_, i) => i);
  const find = (i) => {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  };
  const union = (i, j) => {
    const pi = find(i), pj = find(j);
    if (pi !== pj) parent[pi] = pj;
  };

  for (const indices of wordToIndices.values()) {
    for (let k = 1; k < indices.length; k++) union(indices[0], indices[k]);
  }

  const byRoot = new Map();
  for (let i = 0; i < allStudents.length; i++) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(allStudents[i]);
  }
  return [...byRoot.values()].filter((list) => list.length >= 2);
}

function getFamilyLabel(students) {
  const sets = students.map((s) => getLastNameWords(s.lastName));
  const intersection = sets.reduce((acc, s) => {
    if (acc === null) return new Set(s);
    return new Set([...acc].filter((w) => s.has(w)));
  }, null);
  if (intersection && intersection.size > 0) {
    return [...intersection].sort()[0];
  }
  const first = (students[0].lastName || '').trim().split(/\s+/)[0];
  return first || 'Famille';
}

function renderSiblingsView(container, state) {
  const { classes, siblingGroups, selectedStudentIds = [] } = state;
  const selectedSet = new Set(selectedStudentIds);
  const allStudents = classes.flatMap((c) =>
    c.students.map((s) => ({
      ...s,
      classId: c.id,
      niveau: c.niveau,
      teacherName: c.teacherName,
    }))
  );

  const proposedFamilies = computeProposedFamilies(allStudents);
  const hasProposed = proposedFamilies.length > 0;

  const proposalIdsMatchGroup = (proposalIds, group) => {
    if (proposalIds.length !== group.length) return false;
    const set = new Set(group);
    return proposalIds.every((id) => set.has(id));
  };

  const proposalsCardHtml = hasProposed
    ? `
    <div class="card siblings-section-card">
      <h3>Propositions de fratries</h3>
      <p class="muted mb-2">Fratries proposées par nom de famille (au moins un mot en commun, ex. Martin, Martin Dubois, Dubois Martin, Lefebvre Martin Dubois). Validez en un clic.</p>
      <div class="siblings-proposal-blocks">
        ${proposedFamilies
          .map(
            (students) => {
              const studentIds = students.map((s) => s.id);
              const alreadyAccepted = (siblingGroups || []).some((g) => proposalIdsMatchGroup(studentIds, g));
              return `
          <div class="siblings-proposal-block ${alreadyAccepted ? 'siblings-proposal-block--accepted' : ''}">
            <h4 class="siblings-block-header">Famille ${escapeHtml(getFamilyLabel(students))}</h4>
            <div class="siblings-block-list">
              ${students.map((s) => `<span class="sibling-name-pill">${escapeHtml(s.lastName)} ${escapeHtml(s.firstName)} — ${escapeHtml(s.niveau)}, ${escapeHtml(s.teacherName)}</span>`).join('')}
            </div>
            ${alreadyAccepted ? '<p class="siblings-proposal-accepted mt-1">Déjà enregistrée</p>' : `<button type="button" class="primary btn-save-block-sibling mt-1" data-ids="${studentIds.join(',')}">Enregistrer cette proposition de fratrie</button>`}
          </div>`;
            }
          )
          .join('')}
      </div>
    </div>
  `
    : '';

  const classBlocks = classes.filter((c) => c.students.length > 0);
  const manualCardHtml = `
    <div class="card siblings-section-card">
      <h3>Création manuelle de fratries</h3>
      <p class="muted mb-2">Sélectionnez des enfants dans les classes ci-dessous (quadrillage), puis enregistrez une fratrie.</p>
      ${classBlocks.length === 0 ? '<p class="empty-state">Aucun élève. Créez des classes et des élèves d\'abord.</p>' : `
      <div class="siblings-classes-grid">
        ${classBlocks
          .map(
            (c) => `
          <div class="siblings-class-cell">
            <h4 class="siblings-block-header">${escapeHtml(c.niveau)}, ${escapeHtml(c.teacherName)}</h4>
            <div class="siblings-block-list">
              ${c.students
                .map(
                  (s) => {
                    const sel = selectedSet.has(s.id);
                    return `<button type="button" class="sibling-student-row ${sel ? 'selected' : ''}" data-student-id="${s.id}">${escapeHtml(s.lastName)} ${escapeHtml(s.firstName)}</button>`;
                  }
                )
                .join('')}
            </div>
          </div>`
          )
          .join('')}
      </div>
      <button type="button" class="primary mt-2" id="btn-save-sibling-group" ${(selectedStudentIds || []).length < 2 ? 'disabled' : ''}>Enregistrer la fratrie</button>
      `}
    </div>
  `;

  container.innerHTML = `
    <div class="siblings-page-layout">
      <div class="siblings-left-col">
        <div class="card" style="margin-bottom: 0;">
          <h2>Fratries</h2>
          <p class="muted mb-2">Reliez les enfants d'une même famille pour que les horaires soient générés sans chevauchement.</p>
        </div>
        ${proposalsCardHtml}
        ${manualCardHtml}
      </div>
      <div class="siblings-right-col">
        <div class="card">
          <h3>Fratries enregistrées</h3>
          <div id="sibling-groups-list"></div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.sibling-student-row').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.studentId;
      setState((s) => {
        const prev = s.selectedStudentIds ?? [];
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        return { ...s, selectedStudentIds: next };
      });
      render();
    });
  });

  container.querySelectorAll('.btn-save-block-sibling').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ids = (btn.dataset.ids || '').split(',').filter(Boolean);
      if (ids.length < 2) return;
      setState((s) => ({
        ...s,
        siblingGroups: [...s.siblingGroups, ids],
      }));
      render();
    });
  });

  container.querySelector('#btn-save-sibling-group')?.addEventListener('click', () => {
    const ids = selectedStudentIds || [];
    if (ids.length < 2) return;
    setState((s) => ({
      ...s,
      siblingGroups: [...s.siblingGroups, ids],
      selectedStudentIds: [],
    }));
    render();
  });

  const listEl = container.querySelector('#sibling-groups-list');
  if (siblingGroups.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Aucune fratrie enregistrée. Utilisez les propositions ou la création manuelle à gauche.</p>';
  } else {
    listEl.innerHTML = siblingGroups
      .map(
        (group, idx) => {
          const names = group
            .map((sid) => {
              const found = getStudentById(classes, sid);
              if (!found) return null;
              return `${found.student.lastName} ${found.student.firstName} (${found.class.niveau})`;
            })
            .filter(Boolean);
          return `
        <div class="sibling-group flex align-center wrap gap-2">
          ${names.map((n) => `<span class="name">${escapeHtml(n)}</span>`).join('')}
          <button type="button" class="danger remove-sibling" data-group-idx="${idx}">Supprimer la fratrie</button>
        </div>
      `;
        }
      )
      .join('');

    container.querySelectorAll('.remove-sibling').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.groupIdx, 10);
        setState((s) => ({
          ...s,
          siblingGroups: s.siblingGroups.filter((_, i) => i !== idx),
        }));
        render();
      });
    });
  }
}

function renderScheduleView(container, state) {
  const { classes, siblingGroups, waveTimes = {} } = state;
  const wt = waveTimes;
  const hasStudents = classes.some((c) => c.students.length > 0);
  const anyWaveAssigned = classes.some((c) => c.students.some((s) => s.wave));

  container.innerHTML = `
    <div class="card">
      <h2>Horaires des représentations</h2>
      <p class="muted mb-2">Configurez les créneaux de chaque vague. L'application attribuera automatiquement une vague à chaque élève pour que les parents puissent assister à toutes les représentations (sans chevauchement pour une fratrie).</p>
      <h3 style="font-size: 1rem; margin-top: 1rem;">Heures de passage par vague</h3>
      <div class="wave-times-grid mb-2">
        ${['A', 'B', 'C', 'D'].map(
          (w) => `
          <div class="wave-time-row">
            <label>Vague ${w}</label>
            <input type="time" class="wave-start" data-wave="${w}" value="${escapeHtml(wt[w]?.start ?? '')}" />
            <span>–</span>
            <input type="time" class="wave-end" data-wave="${w}" value="${escapeHtml(wt[w]?.end ?? '')}" />
          </div>
        `
        ).join('')}
      </div>
      <button type="button" class="primary" id="btn-save-wave-times" disabled>Enregistrer les créneaux</button>
      <button type="button" class="primary mt-2" id="btn-generate" ${!hasStudents ? 'disabled' : ''}>Attribuer les vagues et afficher le planning</button>
    </div>
    <div id="schedule-result"></div>
  `;

  const btnSaveWave = container.querySelector('#btn-save-wave-times');
  let userHasEditedWaveTimes = false;
  const getSavedWaveTimes = () => ({ ...waveTimes });
  const updateSaveWaveButton = () => {
    if (!btnSaveWave) return;
    const saved = getSavedWaveTimes();
    let changed = false;
    for (const w of ['A', 'B', 'C', 'D']) {
      const startEl = container.querySelector(`.wave-start[data-wave="${w}"]`);
      const endEl = container.querySelector(`.wave-end[data-wave="${w}"]`);
      const savedStart = (saved[w]?.start ?? '').trim();
      const savedEnd = (saved[w]?.end ?? '').trim();
      const currentStart = (startEl?.value ?? '').trim();
      const currentEnd = (endEl?.value ?? '').trim();
      if (currentStart !== savedStart || currentEnd !== savedEnd) {
        changed = true;
        break;
      }
    }
    btnSaveWave.disabled = !userHasEditedWaveTimes || !changed;
  };
  const markEditedAndUpdate = () => {
    userHasEditedWaveTimes = true;
    updateSaveWaveButton();
  };
  ['A', 'B', 'C', 'D'].forEach((w) => {
    container.querySelector(`.wave-start[data-wave="${w}"]`)?.addEventListener('input', markEditedAndUpdate);
    container.querySelector(`.wave-start[data-wave="${w}"]`)?.addEventListener('change', markEditedAndUpdate);
    container.querySelector(`.wave-end[data-wave="${w}"]`)?.addEventListener('input', markEditedAndUpdate);
    container.querySelector(`.wave-end[data-wave="${w}"]`)?.addEventListener('change', markEditedAndUpdate);
  });
  requestAnimationFrame(() => {
    btnSaveWave.disabled = true;
  });

  container.querySelector('#btn-save-wave-times')?.addEventListener('click', () => {
    const next = {};
    ['A', 'B', 'C', 'D'].forEach((w) => {
      const start = container.querySelector(`.wave-start[data-wave="${w}"]`)?.value ?? '';
      const end = container.querySelector(`.wave-end[data-wave="${w}"]`)?.value ?? '';
      next[w] = { start, end };
    });
    setState((s) => ({ ...s, waveTimes: next }));
    render();
  });

  container.querySelector('#btn-generate')?.addEventListener('click', () => {
    const assignment = assignWavesToStudents(classes, siblingGroups);
    const nextClasses = applyWaveAssignment(classes, assignment);
    setState((s) => ({ ...s, classes: nextClasses }));
    render();
  });

  const resultEl = container.querySelector('#schedule-result');
  if (!anyWaveAssigned) {
    resultEl.innerHTML = '<p class="empty-state">Cliquez sur "Attribuer les vagues et afficher le planning" après avoir créé des classes, configuré les créneaux et éventuellement lié les fratries.</p>';
    return;
  }

  const studentsWithoutWave = [];
  for (const c of classes) {
    for (const s of c.students) {
      if (!s.wave) studentsWithoutWave.push({ student: s, class: c });
    }
  }

  const WAVES_LIST = ['A', 'B', 'C', 'D'];
  const classHasAllWaves = (c) => WAVES_LIST.every((w) => c.students.some((s) => s.wave === w));
  const allClassesComplete = classes.every(classHasAllWaves);
  const siblingConflict = (siblingGroups || []).some((group) => {
    const waves = new Set();
    for (const sid of group) {
      for (const c of classes) {
        const s = c.students.find((st) => st.id === sid);
        if (s?.wave) {
          if (waves.has(s.wave)) return true;
          waves.add(s.wave);
        }
      }
    }
    return false;
  });
  const scheduleIncomplete = !allClassesComplete || siblingConflict;
  const incompleteMessage = scheduleIncomplete
    ? 'Du fait des fratries ou du nombre d\'élèves, il n\'a pas été possible que chaque classe ait des élèves dans les 4 vagues (ou que toutes les fratries aient des créneaux distincts). Configuration affichée : la moins pénalisante pour les parents.'
    : '';

  const noWaveBlock =
    studentsWithoutWave.length > 0
      ? `<p class="mb-2" style="color: var(--accent);">Certains élèves n'ont pas de vague assignée (cliquez sur « Attribuer les vagues et afficher le planning » pour répartir tout le monde). Enfants sans vague : ${studentsWithoutWave.map(({ student, class: cls }) => escapeHtml(student.lastName + ' ' + student.firstName + ' (' + cls.niveau + ', ' + cls.teacherName + ')')).join(', ')}.</p>`
      : '';

  const fratrieLabels = (siblingGroups || []).map((group) => {
    const names = group.map((sid) => {
      const found = getStudentById(classes, sid);
      return found ? found.student.lastName : null;
    }).filter(Boolean);
    const label = names.length > 0 ? (new Set(names).size === 1 ? names[0] : names[0] + '…') : 'Fratrie';
    return { label, ids: group };
  });

  const renderStudentCell = (students) => {
    if (!students.length) return '—';
    return students
      .map((s) => `<span class="schedule-student" data-student-id="${s.id}">${escapeHtml(s.lastName + ' ' + s.firstName)}</span>`)
      .join(', ');
  };

  resultEl.innerHTML = `
    <div class="card" id="schedule-card">
      <h3>Planning par classe</h3>
      ${noWaveBlock}
      ${scheduleIncomplete ? `<p class="mb-2" style="color: var(--accent);">${escapeHtml(incompleteMessage)}</p>` : studentsWithoutWave.length === 0 ? '<p class="muted mb-2">Chaque vague a un créneau horaire ; les élèves ont été répartis pour que les fratries ne passent pas en même temps.</p>' : ''}
      ${fratrieLabels.length > 0 ? `
      <p class="mb-2 muted">Fratries : <span class="schedule-fratrie-list">${fratrieLabels.map((f, i) => `<span class="schedule-fratrie-badge" data-fratrie-ids="${f.ids.join(',')}" title="Survoler pour voir les enfants dans le planning">Famille ${escapeHtml(f.label)}</span>`).join(', ')}</span></p>
      ` : ''}
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Classe</th>
            <th>Vague A ${wt.A?.start && wt.A?.end ? `(${formatTimeDisplay(wt.A.start)} – ${formatTimeDisplay(wt.A.end)})` : ''}</th>
            <th>Vague B ${wt.B?.start && wt.B?.end ? `(${formatTimeDisplay(wt.B.start)} – ${formatTimeDisplay(wt.B.end)})` : ''}</th>
            <th>Vague C ${wt.C?.start && wt.C?.end ? `(${formatTimeDisplay(wt.C.start)} – ${formatTimeDisplay(wt.C.end)})` : ''}</th>
            <th>Vague D ${wt.D?.start && wt.D?.end ? `(${formatTimeDisplay(wt.D.start)} – ${formatTimeDisplay(wt.D.end)})` : ''}</th>
          </tr>
        </thead>
        <tbody>
          ${classes
            .map(
              (c) => {
                const byWave = { A: [], B: [], C: [], D: [] };
                c.students.forEach((s) => {
                  if (s.wave && byWave[s.wave]) byWave[s.wave].push(s);
                });
                return `
            <tr>
              <td><strong>${escapeHtml(c.niveau)}</strong> — ${escapeHtml(c.teacherName)}</td>
              <td>${renderStudentCell(byWave.A)}</td>
              <td>${renderStudentCell(byWave.B)}</td>
              <td>${renderStudentCell(byWave.C)}</td>
              <td>${renderStudentCell(byWave.D)}</td>
            </tr>
          `;
              }
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  resultEl.querySelectorAll('.schedule-fratrie-badge').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const ids = (el.dataset.fratrieIds || '').split(',').filter(Boolean);
      const idSet = new Set(ids);
      resultEl.querySelectorAll('.schedule-student').forEach((span) => {
        if (idSet.has(span.dataset.studentId)) span.classList.add('fratrie-highlight');
      });
    });
    el.addEventListener('mouseleave', () => {
      resultEl.querySelectorAll('.schedule-student').forEach((span) => span.classList.remove('fratrie-highlight'));
    });
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeDisplay(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const t = timeStr.trim();
  if (t.includes(':')) return t.replace(':', 'h');
  return t.includes('h') ? t : t + 'h00';
}

// Init state shape if missing
setState((s) => ({
  ...s,
  currentView: s.currentView ?? VIEWS.classes,
  editingClassId: s.editingClassId ?? null,
}));

initRouter(() => render());
