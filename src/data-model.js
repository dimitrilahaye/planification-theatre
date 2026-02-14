/**
 * Modèle de données :
 *
 * Classe : { id, niveau, teacherName, students: [ { id, firstName, lastName, wave } ], schedule }
 *   - wave : 'A' | 'B' | 'C' | 'D'
 *   - schedule : { A?: string, B?: string, C?: string, D?: string } horaires générés (ex. "9h00")
 *
 * siblingGroups : [ [ studentId, studentId, ... ], ... ]
 */

const WAVES = ['A', 'B', 'C', 'D'];

export { WAVES };

export function createClass({ niveau = '', teacherName = '', students = [] } = {}) {
  return {
    id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    niveau: niveau.trim(),
    teacherName: teacherName.trim(),
    students: students.map((s) => ({
      id: s.id || `stu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      firstName: (s.firstName ?? '').trim(),
      lastName: (s.lastName ?? '').trim(),
      wave: s.wave && WAVES.includes(s.wave) ? s.wave : null,
    })),
    schedule: {},
  };
}

export function createStudent({ firstName = '', lastName = '', wave = null } = {}) {
  return {
    id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    wave: wave && WAVES.includes(wave) ? wave : null,
  };
}

export function getStudentById(classes, studentId) {
  for (const c of classes) {
    const s = c.students.find((st) => st.id === studentId);
    if (s) return { class: c, student: s };
  }
  return null;
}

export function getClassById(classes, classId) {
  return classes.find((c) => c.id === classId) ?? null;
}

/**
 * Parse une ligne élève "Nom Prénom" ou "Nom Prénom: A" (vague optionnelle A/B/C/D).
 * Retourne { lastName, firstName, wave } avec wave = null si absent ou invalide.
 */
function parseStudentLine(bullet) {
  const waveMatch = bullet.match(/\s*:\s*([ABCD])\s*$/i);
  const wave = waveMatch ? waveMatch[1].toUpperCase() : null;
  const namePart = waveMatch ? bullet.slice(0, waveMatch.index).trim() : bullet.trim();
  const firstSpace = namePart.indexOf(' ');
  const lastName = firstSpace > 0 ? namePart.slice(0, firstSpace) : namePart;
  const firstName = firstSpace > 0 ? namePart.slice(firstSpace + 1).trim() : '';
  return { lastName, firstName, wave };
}

/**
 * Parse un bloc texte au format :
 *   niveau: CP
 *   instituteur: Carine Dupont
 *   Élèves:
 *   - Dubois Joséphine
 *   - Martin Louis: B
 * Retourne { niveau, teacherName, students: [ { lastName, firstName, wave? }, ... ] }.
 */
export function parseClassFromText(text) {
  const result = { niveau: '', teacherName: '', students: [] };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let inStudents = false;

  for (const line of lines) {
    const niveauMatch = line.match(/^niveau\s*:\s*(.+)$/i);
    const instMatch = line.match(/^instituteur(?:e?)?\s*:\s*(.+)$/i);
    const elevesMatch = line.match(/^élèves\s*:\s*$/i);

    if (niveauMatch) {
      inStudents = false;
      result.niveau = niveauMatch[1].trim();
      continue;
    }
    if (instMatch) {
      inStudents = false;
      result.teacherName = instMatch[1].trim();
      continue;
    }
    if (elevesMatch || line.toLowerCase() === 'élèves') {
      inStudents = true;
      continue;
    }
    if (inStudents || /^\s*-\s+/.test(line) || line.startsWith('- ')) {
      const bullet = line.replace(/^\s*-\s+/, '').trim();
      if (!bullet) continue;
      result.students.push(parseStudentLine(bullet));
      inStudents = true;
    }
  }

  // Si on n'a pas vu "Élèves:", on considère les lignes "- X Y" comme élèves quand même
  if (result.students.length === 0) {
    for (const line of lines) {
      if (/^\s*-\s+/.test(line) || line.startsWith('- ')) {
        const bullet = line.replace(/^\s*-\s+/, '').trim();
        if (!bullet) continue;
        result.students.push(parseStudentLine(bullet));
      }
    }
  }

  return result;
}

/**
 * Parse un batch de plusieurs classes séparées par "---".
 * Retourne un tableau de { niveau, teacherName, students } (un élément si pas de "---").
 */
export function parseClassesBatchFromText(text) {
  const blocks = text.split(/\s*---\s*/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => parseClassFromText(block));
}
