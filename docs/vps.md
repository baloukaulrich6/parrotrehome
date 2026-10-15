# Préparation d’un futur VPS — aucun déploiement effectué

La méthode retenue est maintenant **Docker Compose + Caddy**. Utiliser [le guide Docker](docker-vps.md) et `scripts/deploy-vps.sh`. Les indications ci-dessous décrivent l’alternative manuelle avec un service Node, à ne pas cumuler avec Docker sur les mêmes ports.

Le parcours enregistré a été testé sur la base de démonstration. Le déploiement attend la résolution des erreurs TypeScript restantes, le choix du service mail et la confirmation de « CHMK ». Les commandes ci-dessous sont des instructions à adapter, elles n’ont pas été exécutées sur un VPS.

## Fichiers persistants

Le schéma actuel utilise SQLite. Malgré le commentaire de l’ancien fichier d’exemple, passer à PostgreSQL nécessite une modification du schéma et des migrations ; changer seulement `DATABASE_URL` ne suffit pas.

Prévoir un utilisateur système dédié, Node.js compatible Next.js 16 (Node 22 LTS convient), Bun 1.3.4, un reverse proxy HTTPS et un volume persistant séparé des versions de l’application :

```dotenv
DATABASE_URL=file:/var/lib/parrotrehome/app.db
MEDIA_DIR=/var/lib/parrotrehome/media
EMAIL_TEMPLATES_FILE=/var/lib/parrotrehome/email-templates.json
NEXTAUTH_URL=https://votre-domaine.example
MAIL_TRANSPORT=preview
PAYMENT_EMAIL_LABEL=CHMK
DEMO_ENABLED=false
```

Configurer un `NEXTAUTH_SECRET` aléatoire dans un fichier d’environnement privé, jamais dans Git. Le transport reste `preview` jusqu’au raccordement explicite du fournisseur de mails. Il n’existe pas encore de transport SMTP/Resend actif.

Installer avec le verrou, générer Prisma et préparer une base neuve sans `--accept-data-loss`. Ne pas lancer `scripts/seed.ts` sur des données réelles. Fournir les variables au processus de build : certaines pages lisent la base pendant le pré-rendu. Exécuter les tests, le contrôle TypeScript et `bun run build` avant de publier. La configuration existante ignore les erreurs TypeScript pendant le build : un build réussi ne remplacerait pas ce contrôle.

Le service peut ensuite exécuter `node .next/standalone/server.js`, avec `NODE_ENV=production`, `HOSTNAME=127.0.0.1`, `PORT=3000`, le répertoire de travail du dépôt et les variables ci-dessus. Les fichiers statiques et `public` sont copiés par le script de build existant. Le stockage d’images est indépendant de ces fichiers grâce à `/api/media/[name]`.

Le reverse proxy doit autoriser un corps de requête d’au moins 5 Mo pour l’upload (par exemple 6 Mo), et transmettre les requêtes `/api/media/` à Next.js. Vérifier aussi que l’origine HTTPS et `NEXTAUTH_URL` concordent pour les uploads et l’édition de templates.

## Mails et exploitation

Avant l’envoi réel : choisir le fournisseur, authentifier le domaine expéditeur (SPF/DKIM/DMARC), prévoir une adresse de réponse, connecter le transport, gérer les échecs et vérifier la livraison sur une boîte de test. La déduplication actuelle est en mémoire : une file persistante est nécessaire pour des reprises fiables après redémarrage. Ne pas annoncer une livraison réelle avec le transport de démonstration.

Sauvegarder SQLite avec une méthode cohérente (API de sauvegarde SQLite ou arrêt contrôlé), les images et les templates. Tester la restauration. Pour plusieurs instances, remplacer le stockage local des templates et images par un stockage partagé et traiter la concurrence ; la préparation actuelle vise une seule instance sur VPS.
