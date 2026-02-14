export function renderLandingPage(container, { onGoToApp } = {}) {
  document.title = 'Planification théâtre';
  container.innerHTML = `
    <div class="landing">
      <header class="landing-hero">
        <h1 class="landing-title">Planification théâtre</h1>
        <p class="landing-tagline">
          Organisez les représentations de plusieurs classes et générez un planning
          qui permet aux parents d'assister à <strong>toutes</strong> les représentations
          de leurs enfants — sans chevauchement.
        </p>
        <a href="#/app" class="landing-cta">Accéder à l'application</a>
      </header>

      <div class="landing-columns">
        <section class="landing-section">
          <h2>Pourquoi ?</h2>
          <p class="landing-lead">
            Lors des fêtes de fin d'année, chaque classe présente son spectacle à tour de rôle.
            Les parents ayant plusieurs enfants dans différentes classes se retrouvent face à un
            casse-tête : plusieurs représentations en même temps, des choix impossibles.
          </p>
          <p>
            Cette application résout le problème : elle attribue automatiquement chaque élève à
            une vague (A, B, C ou D) en s'assurant que les fratries passent à des créneaux
            différents. Les parents peuvent ainsi assister à toutes les représentations.
          </p>
        </section>

        <section class="landing-section">
          <h2>Comment ça marche ?</h2>
        <ol class="landing-steps">
          <li>
            <strong>Classes</strong> — Créez vos classes (CP, CE1, CE2…), instituteur(trice), liste d'élèves.
            Import possible au format texte pour gagner du temps.
          </li>
          <li>
            <strong>Fratries</strong> — Indiquez quels enfants sont de la même famille. L'application
            propose des regroupements automatiques d'après les noms de famille, vous validez en un clic.
          </li>
          <li>
            <strong>Horaires</strong> — Définissez les créneaux des 4 vagues (ex. 9h, 9h30, 10h, 10h30).
            Cliquez sur « Attribuer les vagues » : l'algorithme répartit les élèves sans conflit pour les fratries.
          </li>
          <li>
            <strong>Planning</strong> — Vous obtenez un planning par classe, prêt à diffuser aux parents.
          </li>
        </ol>
        </section>
      </div>

      <section class="landing-section landing-cta-section">
        <a href="#/app" class="landing-cta landing-cta-secondary">Commencer la planification</a>
      </section>
    </div>
  `;

  container.querySelectorAll('.landing-cta').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof onGoToApp === 'function') {
        onGoToApp();
      } else {
        window.location.hash = '#/app';
      }
    });
  });
}
