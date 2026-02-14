import { WAVES } from './data-model.js';

/**
 * Attribue à chaque élève une vague (A, B, C ou D) de sorte que les fratries
 * aient des vagues différentes (les parents peuvent assister à toutes les représentations).
 * Les créneaux horaires sont fixés par la config (waveTimes), pas calculés ici.
 */
function buildSiblingGraph(siblingGroups) {
  const neighbors = new Map(); // studentId -> Set of studentIds
  for (const group of siblingGroups) {
    for (const id of group) {
      if (!neighbors.has(id)) neighbors.set(id, new Set());
      for (const other of group) {
        if (other !== id) neighbors.get(id).add(other);
      }
    }
  }
  return neighbors;
}

/**
 * Pour chaque élève, retourne la vague assignée (A/B/C/D).
 * Contraintes : (1) deux frères/sœurs n'ont pas la même vague ;
 * (2) on privilégie de remplir les 4 vagues par classe quand c'est possible.
 */
export function assignWavesToStudents(classes, siblingGroups) {
  const assignment = new Map(); // studentId -> 'A'|'B'|'C'|'D'
  const siblings = buildSiblingGraph(siblingGroups);
  const countByClassWave = new Map(); // "classId:wave" -> number

  const allStudents = [];
  for (const c of classes) {
    for (const s of c.students) allStudents.push({ ...s, classId: c.id });
  }

  for (const s of allStudents) {
    const usedBySiblings = new Set();
    for (const sid of siblings.get(s.id) || []) {
      const w = assignment.get(sid);
      if (w) usedBySiblings.add(w);
    }
    const allowed = WAVES.filter((w) => !usedBySiblings.has(w));
    if (allowed.length === 0) {
      assignment.set(s.id, 'A');
      continue;
    }
    let best = allowed[0];
    let bestCount = countByClassWave.get(`${s.classId}:${best}`) ?? 0;
    for (const w of allowed.slice(1)) {
      const count = countByClassWave.get(`${s.classId}:${w}`) ?? 0;
      if (count < bestCount) {
        best = w;
        bestCount = count;
      }
    }
    assignment.set(s.id, best);
    countByClassWave.set(`${s.classId}:${best}`, bestCount + 1);
  }

  for (const s of allStudents) {
    if (!assignment.has(s.id)) assignment.set(s.id, 'A');
  }
  return assignment;
}

/**
 * Applique l'attribution des vagues aux classes (met à jour student.wave).
 * Retourne les classes mises à jour.
 */
export function applyWaveAssignment(classes, assignment) {
  return classes.map((c) => ({
    ...c,
    students: c.students.map((s) => ({
      ...s,
      wave: assignment.get(s.id) ?? 'A',
    })),
  }));
}
