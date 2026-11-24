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

## Images d'événements

Les images d'événements sont stockées sur Cloudinary, dans le dossier `evenements`.
L'admin demande une signature à `POST /upload/signature`, puis envoie le fichier directement à Cloudinary
(sans passer par la fonction Vercel, limitée à ~4,5 Mo par requête). Le champ `Evenement.image` contient le
`public_id` Cloudinary (ex. `evenements/abc123`) ; le site et l'admin construisent l'URL optimisée à l'affichage.
L'ancienne image est supprimée de Cloudinary quand un événement est supprimé ou que son image est remplacée.
Sans les variables `CLOUDINARY_*`, la route de signature répond 503.
