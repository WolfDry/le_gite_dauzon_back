# API du gîte d'Auzon

API NestJS du site et de l'admin du gîte : réservations, clients, tarifs, suppléments, commentaires,
événements, e-mails (Mailgun) et images (Cloudinary). Base PostgreSQL via Prisma.

## Démarrer en local

```bash
npm install                 # lance aussi `prisma generate`
cp .env.example .env        # puis remplir les valeurs (voir plus bas)
npx prisma migrate deploy   # applique les migrations à la base de DATABASE_URL
npm run create-admin -- <email> <mot de passe>   # premier compte de l'admin
npm run start:dev           # http://localhost:3001 (ou PORT)
```

Hors production, la documentation Swagger est servie sur `/api`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run start:dev` | Serveur avec rechargement automatique |
| `npm run build` | Migrations, `prisma generate`, puis compilation dans `dist/` |
| `npm run start:prod` | Lance la version compilée |
| `npm test` | Tests Jest (base simulée, pas besoin de PostgreSQL) |
| `npm run lint` | ESLint, avec vérification de types |
| `npm run format` | Prettier |
| `npm run create-admin -- <email> <mdp>` | Crée un compte de l'admin directement en base (pas d'inscription publique) |

L'intégration continue ([.github/workflows/ci.yml](.github/workflows/ci.yml)) lance le lint, les tests et `nest build`
à chaque push et sur chaque pull request. Elle n'utilise ni secret ni base de données, et n'applique pas les migrations.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (de préférence l'URL *poolée* : Neon, Supabase pooler…) |
| `JWT_SECRET`, `JWT_EXPIRES` | Jetons d'authentification. `JWT_EXPIRES` vaut `1h` par défaut |
| `SECRET_SALT` | Préfixe des mots de passe hachés. Doit être le même pour l'API et `create-admin` |
| `MAILGUN_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_EMAIL_RECEPTION` | Envoi des e-mails |
| `MAILGUN_FROM` | Expéditeur des e-mails, facultatif (par défaut `Le gite d'auzon <contact@legitedauzon.fr>`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Stockage des images d'événements |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules. Sans valeur : `http://localhost:3000` et `http://localhost:3002` |
| `SWAGGER_ENABLED` | `true` pour garder Swagger en production |
| `CRON_SECRET` | Protège `GET /cron/purge-demandes`. Sans valeur, la purge est refusée |
| `TURNSTILE_SECRET_KEY` | Vérification anti-robot des formulaires publics. Sans valeur, désactivée |

## Déploiement sur Vercel

1. Importer ce dépôt dans Vercel (Root Directory : la racine du back). La configuration est dans `vercel.json` :
   `npm run build` (migrations Prisma + `prisma generate` + `nest build`), puis toutes les routes sont servies par la fonction `api/index.js`.
2. Définir les variables d'environnement ci-dessus.
3. Vercel Cron appelle `GET /cron/purge-demandes` chaque nuit avec `CRON_SECRET` : les demandes refusées
   ou jamais traitées sont supprimées 90 jours après.

## Règle de prix

L'API est la seule à connaître la règle de prix ([src/tarification/calcul.ts](src/tarification/calcul.ts)) :

- l'hébergement se paie par semaine entière, une semaine au minimum. Les jours restants ne sont pas facturés.
  Chaque semaine prend le tarif à la semaine de la période qui couvre sa première nuit, sinon le tarif marqué
  `parDefaut` (la basse saison). Du samedi au dimanche (1 nuit), c'est le premier prix de fréquence `WEEKEND` ;
- la taxe de séjour se paie par adulte et par nuit. Chaque réservation garde le taux en vigueur à son
  enregistrement (`Reservation.taxeSejour`) ;
- suppléments : `SEJOUR` une fois, `QUOTIDIEN` par nuit, `HEBDOMADAIRE` par semaine entière, plus une semaine
  au-delà de 4 jours entamés ;
- l'acompte porte sur l'hébergement et les suppléments, sans la taxe de séjour.

Routes :

- `GET /reglages` (public) et `PATCH /reglages` (admin) : taxe de séjour, capacité, mois de saison et
  pourcentage d'acompte, sur une seule ligne de la table `Reglages` ;
- `POST /devis` (public, n'écrit rien) : prix détaillé d'un séjour. Sans `tarif`, l'hébergement suit les
  périodes datées des tarifs ; `tarifPropose` donne le prix par semaine qu'elles indiquent ;
- `GET /reservations` (vue `liste`) renvoie le `total` de chaque réservation ;
- les tarifs à la semaine ont des périodes datées (`TarifPeriode` : nuits du `debut` au `fin`, jour de départ
  exclu), qui ne se chevauchent pas d'un tarif à l'autre. Un seul tarif à la semaine est `parDefaut`. `GET /tarifs` renvoie dans `date` le texte des périodes pas
  encore terminées, ou l'ancien texte libre pour un tarif sans période datée.

## Images d'événements

Les images d'événements sont stockées sur Cloudinary, dans le dossier `evenements`.
L'admin demande une signature à `POST /upload/signature`, puis envoie le fichier directement à Cloudinary
(sans passer par la fonction Vercel, limitée à ~4,5 Mo par requête). Le champ `Evenement.image` contient le
`public_id` Cloudinary (ex. `evenements/abc123`) ; le site et l'admin construisent l'URL optimisée à l'affichage.
L'ancienne image est supprimée de Cloudinary quand un événement est supprimé ou que son image est remplacée.
Sans les variables `CLOUDINARY_*`, la route de signature répond 503.
