# Comptes Staff, authentification et journal d’activité

## Connexion et premier accès

Utiliser le compte administrateur et le mot de passe choisis au premier déploiement. Les anciens identifiants de démonstration ne sont plus affichés sur la page de connexion ; le script VPS ne crée pas ces comptes.

Un membre du personnel sans authentificateur activé se connecte avec son mot de passe, puis arrive sur `/staff-mfa`. À ce stade, les API et pages administratives restent inaccessibles. Cliquer **Set up MFA**, scanner le QR avec Google Authenticator, Microsoft Authenticator ou 2FAS, puis saisir le vrai code à six chiffres. Le QR et la clé manuelle sont personnels. La configuration expire après dix minutes ; en cas d’expiration, en générer une nouvelle.

Après activation, la session limitée est déconnectée. Se reconnecter avec le mot de passe **et** le code de l’application. Un code déjà utilisé pour se connecter ne peut pas servir à une deuxième connexion ; attendre le prochain code. L’heure du téléphone doit être automatique. L’accès Staff expire au bout de huit heures. Un changement de statut ou une récupération MFA invalide immédiatement l’accès des sessions concernées.

Les authentificateurs déjà réellement activés restent compatibles : les anciennes clés sont lues sans obliger à les remplacer. Les nouvelles clés sont chiffrées dans la base avec une clé dérivée de `NEXTAUTH_SECRET` ; conserver cette variable lors des mises à jour.

## Créer et gérer les utilisateurs

Dans **Staff**, cliquer **Create account** : saisir nom, email, mot de passe initial d’au moins douze caractères et rôle. Le super administrateur peut créer les rôles Staff et des clients ; les nouveaux clients apparaissent dans **Customers**. Les managers peuvent créer et gérer uniquement les agents. Le formulaire précise qu’aucun mail d’invitation réel n’est envoyé : transmettre les accès par un canal approprié.

**Edit account** permet de changer le nom, le rôle autorisé et le statut. Un administrateur ne peut ni se suspendre ni changer son propre rôle ; le dernier super administrateur actif est préservé. Les comptes Staff nouvellement créés doivent configurer leur propre authentificateur.

## Dernières connexions et activités

- **Staff** affiche la date et l’heure UTC de la dernière connexion acceptée, au lieu d’un « Never » qui n’était jamais mis à jour.
- **My account**, accessible depuis le nom du compte en haut du site ou la navigation administrative, affiche les informations du compte et ses dix dernières connexions/tentatives enregistrées.
- **Audit log** permet de filtrer les connexions et actions, et de rechercher par email, nom, identifiant d’objet ou détails. Les changements MFA, créations et modifications de comptes sont enregistrés. La vue se rafraîchit lorsqu’elle est visible.

Les connexions anciennes qui n’ont pas été enregistrées ne sont pas reconstituées rétroactivement. Le journal concerne les connexions et actions métier enregistrées, pas un historique de chaque page consultée.

## Mise à jour Docker

Depuis le dossier du dépôt sur le VPS :

```bash
git pull --ff-only origin codex/parrotrehome-demo-docker-deploy
sudo bash scripts/deploy-vps.sh \
  --domain parrotrehome.com \
  --email owner@example.com \
  --admin-email admin@parrotrehome.com
```

Remplacer `owner@example.com` par votre adresse de contact. Le déploiement sauvegarde SQLite puis applique une migration ciblée : l’ancienne relation imposait à tout événement `AuditLog.objectId` de référencer une demande. Cela empêchait l’enregistrement des connexions et des événements sur des utilisateurs, oiseaux ou produits. La migration retire uniquement cette contrainte incorrecte, conserve les événements, index, triggers et la relation avec l’acteur, puis vérifie le schéma Prisma. Elle est sans effet si la base est déjà corrigée. Ne pas relancer le seed et ne pas supprimer les volumes.

Après mise à jour, se déconnecter puis se reconnecter. Les anciennes sessions Staff sans preuve MFA ne donnent plus accès à l’administration. Aucune mise à jour de votre VPS n’est effectuée automatiquement depuis le chat.

## Téléphone perdu ou ancienne configuration MFA inutilisable

La désactivation MFA n’est pas proposée depuis une session web. Depuis la console du VPS, un administrateur serveur peut remettre uniquement le compte concerné en mode configuration :

```bash
sudo docker compose --env-file /etc/parrotrehome/compose.env -f deploy/compose.yaml \
  run --rm --no-deps init bun run scripts/reset-staff-mfa.ts \
  --email admin@parrotrehome.com --confirm-reset
```

Cette action est journalisée, conserve le mot de passe et retire l’accès administratif des anciennes sessions. Se connecter et configurer un nouvel authentificateur. Ne jamais communiquer la clé manuelle, les codes ou le mot de passe dans le chat.

## Validation

Les tests HTTP utilisent une base temporaire et de vrais cookies NextAuth : configuration MFA, code faux refusé, connexion sans code refusée après activation, rejeu refusé, création de comptes, permissions manager/client, suspension de session, dernière connexion et journal, puis récupération MFA. La migration a aussi été exécutée deux fois dans Docker sur une base créée par l’ancienne image, en conservant son administrateur, sa demande et son événement existant. Aucun test ne réutilise les données ou identifiants du VPS. Le contrôle TypeScript garde 12 erreurs déjà présentes dans le dépôt ; aucune nouvelle erreur n’est introduite par ces corrections.

Le serveur standalone Docker a également été contrôlé sur cette base migrée : calcul indépendant d’un code RFC 6238, activation MFA, nouvelle connexion, création d’un agent et affichage de Staff, My account et Audit log. Le conteneur fonctionne sous UID 1000, sans port publié pendant le test.
