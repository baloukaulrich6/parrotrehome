# Comptes et connexions

La connexion utilise uniquement l’email et le mot de passe pour tous les rôles. Aucun code d’authentification supplémentaire ni configuration d’authentificateur n’est demandé. Les anciens comptes peuvent se connecter avec leur mot de passe actuel, sans modification de celui-ci.

Le super administrateur crée et modifie les utilisateurs depuis Staff. Le manager peut gérer les agents selon ses permissions. Les rôles sont contrôlés côté serveur ; les comptes suspendus perdent immédiatement l’accès. Les sessions administratives expirent après huit heures. Les tentatives de connexion restent limitées et les mots de passe sont vérifiés avec bcrypt.

My account affiche la dernière connexion et les tentatives récentes. Audit log permet de consulter les connexions et les actions. Les anciens événements sont conservés.

Aucune modification de schéma n’est nécessaire : les anciennes colonnes d’authentification supplémentaire restent présentes pour la compatibilité des bases installées, mais elles ne sont plus utilisées pour l’accès ni exposées dans les interfaces. Les anciennes routes de configuration et leurs scripts ont été retirés.

Pour mettre à jour le VPS, récupérer la branche `codex/parrotrehome-demo-docker-deploy` et relancer `scripts/deploy-vps.sh` avec les paramètres habituels. Se déconnecter puis se reconnecter au site après le déploiement.

## Changer son propre mot de passe

Tous les utilisateurs connectés disposent de **My account → Change my password**. Le mot de passe actuel est obligatoire. Le nouveau mot de passe doit comporter au moins 12 caractères et au plus 72 octets UTF-8 (limite bcrypt). Le serveur cible uniquement l’identifiant de la session et refuse les identifiants d’autres comptes dans la requête. Les tentatives sont limitées ; les anciennes sessions sont invalidées à l’aide de l’événement d’audit transactionnel enregistré lors du changement. L’utilisateur doit ensuite se reconnecter avec son nouveau mot de passe. Les mots de passe des autres comptes restent inchangés.
