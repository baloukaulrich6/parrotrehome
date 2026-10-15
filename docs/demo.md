# Démonstration ParrotRehome

Aucune application n’a été déployée en production. Aucun mail réel n’est envoyé.

## Présentation sans base de données

Depuis la racine du dépôt, après `bun install --frozen-lockfile`, exécuter :

```bash
bash scripts/demo.sh
```

Ouvrir le chemin `/demo` dans le serveur de développement. La page est désactivée par défaut et n’est accessible que lorsque `DEMO_ENABLED=true`.

1. Charger une photo dans le panneau Administration : elle apparaît dans le panneau Espace client.
2. Modifier le nom du dossier : le panneau client reprend le nouveau nom.
3. Modifier les instructions fictives puis préparer la réponse : le client voit les instructions et un compte à rebours de 20 minutes.
4. Préparer une nouvelle réponse : elle remplace la précédente dans cette simulation.
5. Examiner l’aperçu du mail, avec les couleurs du site : ivoire, ardoise, vert et or.

Cette page simule le parcours en mémoire. Elle ne teste pas la connexion, la base ou l’enregistrement des images. Les données disparaissent au rechargement. Les fichiers JPEG, PNG et WebP sont limités à 5 Mo dans l’interface de démonstration.

## Parcours enregistré de l’application

Il nécessite une base SQLite et le moteur Prisma. Autoriser `registry.npmjs.org` et `binaries.prisma.sh`, en conservant la vérification TLS et les sommes de contrôle. Le verrou utilise maintenant le registre `.org`, sans changer les versions ni les empreintes d’intégrité.

Copier `.env.example` vers `.env`, remplacer `NEXTAUTH_SECRET` par une valeur aléatoire et utiliser une base dédiée à la démonstration. Depuis le dépôt :

```bash
bun install --frozen-lockfile
bun run db:generate
# Créer le fichier d’une nouvelle base locale avant le schéma.
mkdir -p var
python3 -c 'import sqlite3; c=sqlite3.connect("var/demo.db"); c.execute("PRAGMA user_version=0"); c.close()'
bunx prisma db push
# Uniquement sur une base de démonstration neuve : le seed efface les données.
bun run scripts/seed.ts
bash scripts/demo.sh
```

- `/admin/birds` et `/admin/products` : charger jusqu’à 8 photos puis enregistrer le formulaire. Les images sont décodées, redimensionnées et converties en WebP côté serveur, avec noms aléatoires et suppression des métadonnées. Les anciens visuels restent disponibles lors de l’édition.
- `/parrots` et `/supplies` lisent les mêmes dossiers dans la base, sans copie distincte. Les pages du catalogue sont dynamiques.
- `/admin/email-templates` : consulter, modifier et prévisualiser les modèles « demande reçue » et « instructions de paiement ». La modification est réservée à l’administrateur ayant le droit de configurer les paiements. Le texte est échappé dans le HTML.
- `/admin/payment-methods` : modifier le nom du moyen de paiement, son prestataire et son modèle d’instructions. Ces modèles ne sont plus exposés dans l’API publique. Les instructions déjà émises restent inchangées tant que l’agent ne génère pas un nouveau lien.
- Dans un dossier en attente d’instructions ou avec instructions déjà envoyées, l’agent peut modifier les coordonnées propres au client et générer une nouvelle version. La précédente est révoquée. La validité de 20 minutes commence à la création côté serveur.
- Le client retrouve la réponse dans l’historique des mails. Les dossiers administration/client se rafraîchissent toutes les 15 secondes lorsqu’ils sont visibles, et au retour dans la fenêtre.
- Le serveur refuse le dépôt d’une référence après expiration. Le compte client demeure accessible. Le chrono ne peut pas annuler un virement déjà effectué chez un prestataire ; après expiration, contacter l’agent.

`MAIL_TRANSPORT=preview` enregistre les messages avec le statut `QUEUED` ; il ne les déclare pas envoyés. Le service d’envoi réel reste à choisir et à connecter. `PAYMENT_EMAIL_LABEL=CHMK` reprend provisoirement le libellé demandé ; le mail indique aussi le moyen effectivement sélectionné, pour éviter toute ambiguïté.

## Vérifications effectuées

- Quinze tests unitaires et de bootstrap passent : `bun test tests/demo-workflow.test.ts tests/image-upload.test.ts tests/deployment-bootstrap.test.ts tests/session-policy.test.ts`.
- Les tests unitaires de route utilisent une identité simulée et un stockage temporaire. Ils couvrent les permissions, les limites de taille, la conversion et la lecture des images.
- Un parcours HTTP a aussi été exécuté avec les vrais comptes et la base SQLite dédiée : connexion administrateur/client, pages publiques et administration, upload enregistré, création/édition d’un produit avec conservation de la photo dans le catalogue, instructions de 20 minutes, mail conservé avec `QUEUED`, nouvelle version, ancien lien révoqué et référence refusée après expiration (HTTP 410).
- La modification d’un moyen de paiement est visible dans l’API client ; ses modèles d’instructions restent privés. La sauvegarde du modèle mail depuis l’administration a également été vérifiée.
- Le script `demo.sh` a été exécuté et `/demo` répond HTTP 200. L’upload anonyme est refusé avec HTTP 401.
- Le moteur Prisma est maintenant accessible et le schéma ainsi que les données de démonstration ont été initialisés.
- Le contrôle ESLint des fichiers modifiés passe sans erreur.
- `bun run build` réussit. Le serveur standalone issu de ce build a également été lancé uniquement pour un contrôle local : `/demo` et le catalogue avec données SQLite répondent HTTP 200. Aucun VPS ni application publique n’a été déployé.
- Le contrôle TypeScript global conserve 12 erreurs présentes dans le dépôt initial, contre 32 initialement. Il n’est pas présenté comme réussi. Les erreurs restantes concernent notamment les exemples WebSocket, les actions d’approbation, les coupons et les favoris.

L’instance cloud conserve un produit fictif avec photo et un dossier `DEMO-SMOKE-*` pour examiner le parcours. Les comptes de démonstration du README utilisent tous le mot de passe `parrotrehome123` ; ils ne doivent jamais être conservés sur une application publique.

Les corrections Staff et la migration du journal sont détaillées dans [staff-accounts.md](staff-accounts.md). Le test HTTP isolé `bun test tests/auth-integration.test.ts` vérifie les vraies connexions et les permissions ; `python3 tests/test_audit_migration.py` vérifie la conservation des événements lors de la migration.
