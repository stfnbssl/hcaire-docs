import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Panoramica',
      link: {type: 'generated-index'},
      items: [
        'overview/cos-e-l-applicazione',
        'overview/mappa-moduli',
        'overview/inventario',
        'overview/glossario',
        'overview/obiettivi-funzionali',
      ],
    },
    {
      type: 'category',
      label: 'Architettura',
      link: {type: 'generated-index'},
      items: [
        'architecture/stack-tecnologico',
        'architecture/frontend',
        'architecture/backend',
        'architecture/database',
        'architecture/autenticazione',
        'architecture/routing',
        'architecture/stato-applicativo',
        'architecture/deployment',
        'architecture/local-cowork-bridge',
      ],
    },
    {
      type: 'category',
      label: 'Moduli',
      link: {type: 'generated-index'},
      items: [
        'modules/autenticazione',
        'modules/contenuti',
        'modules/navigation',
        'modules/account',
        'modules/subscriptions',
        'modules/admin-cms',
        'modules/site-config-content',
        'modules/hcaire',
        'modules/metodo',
        'modules/assi-strutturali',
        'modules/catalogo',
        'modules/letture',
        'modules/bartleby',
        'modules/pipeline-orchestrazione',
        'modules/archivio-temi',
        'modules/jobs-skills-plugins',
        'modules/integrazione-telegram-cowork',
        {
          type: 'category',
          label: 'Sviluppo Bambino',
          link: {type: 'generated-index'},
          items: [
            'modules/sviluppo-bambino/produzioni',
            'modules/sviluppo-bambino/narrativa',
            'modules/sviluppo-bambino/corsi',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'API',
      link: {type: 'generated-index'},
      items: [
        'api/index',
        'api/openapi',
        'api/typedoc',
        'api/storybook',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: {type: 'generated-index'},
      items: [
        'reference/index',
      ],
    },
    {
      type: 'category',
      label: 'TODO / proposte aperte',
      link: {type: 'generated-index'},
      items: [
        'todo/migrazioni-mongodb',
        'todo/laboratorio-d5b-backend',
      ],
    },
  ],
};

export default sidebars;
