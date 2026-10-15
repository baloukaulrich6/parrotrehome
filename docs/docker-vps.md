# Déploiement Docker de ParrotRehome.com

Le script à exécuter **sur le VPS** est `scripts/deploy-vps.sh`. Il prépare Docker Compose, l’application, une base SQLite persistante et Caddy avec HTTPS automatique. Il n’a pas été exécuté sur votre VPS.

## Avant de lancer

- VPS Ubuntu/Debian avec accès root ou sudo ; au moins 4 Go de RAM recommandés pour le build Next.js, et suffisamment de disque pour les images Docker.
- DNS : enregistrement **A** de `parrotrehome.com` vers **157.180.84.146**. Tout enregistrement AAAA doit aussi pointer vers ce VPS ; supprimer un ancien AAAA incorrect.
- Ports 80 et 443 disponibles et autorisés chez l’hébergeur. Ne pas fermer le port SSH. Le script ne supprime pas un autre site, ni son Nginx ou son proxy.
- Tous les fichiers du projet modifié doivent être présents. Le seul fichier Bash ne contient pas l’application. Un clonage du dépôt récupère uniquement les modifications déjà poussées sur GitHub.

## Transférer l’archive complète depuis Git Bash

Télécharger `parrotrehome-deploy.tar.gz`, puis, dans son dossier local :

```bash
scp -i ~/.ssh/k parrotrehome-deploy.tar.gz root@157.180.84.146:/root/
ssh -i ~/.ssh/k root@157.180.84.146
```

Utiliser l’utilisateur réellement associé à la clé SSH ; si c’est `god`, adapter le dossier distant et employer sudo pour l’installation.

Sur le VPS :

```bash
mkdir -p /opt/parrotrehome-src
tar -xzf /root/parrotrehome-deploy.tar.gz -C /opt/parrotrehome-src --strip-components=1
cd /opt/parrotrehome-src
sudo bash scripts/deploy-vps.sh \
  --domain parrotrehome.com \
  --email TON_ADRESSE_EMAIL \
  --admin-email TON_EMAIL_ADMIN
```

Remplacer les deux adresses. La première reçoit les notifications de certificat, la seconde sert à la connexion de l’administrateur. Le mot de passe initial est demandé dans le terminal, sans affichage. Il n’est ni passé en argument ni imprimé.

Pour examiner le plan sans rien installer :

```bash
bash scripts/deploy-vps.sh --email owner@example.com --admin-email admin@example.com --plan
```

## Ce que fait le script

1. Installe Docker depuis son dépôt APT officiel signé si Docker est absent. Une installation Docker préexistante est conservée ; son plugin Compose doit être disponible.
2. Construit les images depuis le verrou Bun, exécute les tests applicatifs sélectionnés et le build Next.js. La base utilisée pendant ce build est vide et jetable : aucun client ni secret du VPS n’entre dans l’image.
3. Arrête seulement l’application Compose de ce projet, sauvegarde SQLite si elle existe et contrôle le schéma. Une modification du schéma existant exige une migration revue séparément ; aucun `--accept-data-loss` ni seed destructif n’est exécuté.
4. Crée le premier administrateur, les mêmes neuf zones de livraison initiales que le dépôt et un mode CHMK désactivé à configurer. Aucun compte ou mot de passe de démonstration n’est créé. Une relance préserve les comptes, mots de passe et données.
5. Démarre l’application sous un utilisateur non-root et Caddy sur 80/443. Le port 3000 n’est pas publié sur le VPS. Le contrôle de santé interroge une API qui lit la base.
6. Vérifie la réponse HTTPS publique de `parrotrehome.com`. Un échec DNS, certificat ou disponibilité est signalé ; le script n’annonce pas un succès avant ce contrôle.

Le script conserve les fichiers privés sous `/etc/parrotrehome/` avec droits root : `compose.env`, `runtime.env`, `admin_password`. Ne pas les copier dans Git ou une image. Le fichier du mot de passe n’est monté que dans le conteneur d’initialisation. Modifier ensuite le mot de passe de cet administrateur ne le fait pas réinitialiser par le script.

## Utilisation et mises à jour

La gestion des comptes et les dernières connexions sont décrites dans [staff-accounts.md](staff-accounts.md). La connexion utilise uniquement l’email et le mot de passe.

- Site : `https://parrotrehome.com`
- Administration : `https://parrotrehome.com/admin`
- Au premier accès, ajouter les oiseaux et produits et renseigner les informations de paiement avant de les activer. Les photos et modèles de mails modifiés sont persistants.
- Les mails restent **en mode aperçu** : le fournisseur d’envoi n’est pas encore connecté. Le script ne peut pas remplacer ce raccordement par des identifiants inventés.
- La configuration Next.js existante ignore les erreurs TypeScript au build. Les 12 erreurs globales préexistantes restantes restent documentées dans `docs/demo.md` ; un build réussi ne signifie pas que le contrôle TypeScript passe.

Pour mettre à jour, transférer les nouveaux fichiers source dans ce même dossier puis relancer la même commande. Éviter d’extraire par-dessus un ancien projet contenant des fichiers supprimés : préférer un nouveau dossier source propre. Le nom Compose et les volumes restent identiques d’un dossier à l’autre.

Logs et état, depuis le dossier du projet :

```bash
sudo docker compose --env-file /etc/parrotrehome/compose.env -f deploy/compose.yaml ps
sudo docker compose --env-file /etc/parrotrehome/compose.env -f deploy/compose.yaml logs --tail=100 app proxy
```

Les données sont dans le volume `parrotrehome_data`, les certificats dans `parrotrehome_caddy_data`. **Ne pas exécuter `docker compose down -v`** : cela supprime les volumes. Les sauvegardes SQLite créées avant mise à jour restent dans le même volume, sous `/data/backups` ; prévoir une copie externe pour résister à une perte du VPS. Une sauvegarde complète doit également conserver les photos, les modèles de mails, la configuration et les secrets.

Le build précède l’arrêt de l’application. Si l’initialisation échoue, le script tente de redémarrer le conteneur précédent. Il ne garantit pas un rollback automatique après toute erreur de démarrage ; conserver la version précédente et examiner les logs avant une nouvelle tentative.

## Vérifications locales

Les deux images Docker ont été construites. Les 15 tests unitaires/de bootstrap, le test HTTP isolé (39 assertions) et le test Python de migration passent, y compris dans l’image. La configuration Compose et celle de Caddy ont été validées. Un volume temporaire a servi à initialiser puis relancer la base : un seul administrateur est conservé et les zones de livraison ne sont pas dupliquées. Dans le conteneur applicatif non-root, l’API SQLite, la page d’accueil et une vraie connexion administrateur avec accès à `/admin` répondent correctement. La persistance des images a été contrôlée après redémarrage.

Ces tests n’ont exposé aucun port ni déployé l’application sur le VPS. L’installation APT sur votre machine, son DNS, l’émission du certificat public et le parcours complet du script sur votre VPS restent à exécuter. Dans l’environnement cloud de test, le build a utilisé le proxy fourni et son certificat de confiance via un secret BuildKit temporaire ; aucune vérification TLS n’a été désactivée et ce certificat n’est pas inclus dans l’image finale.
