# Emails Resend et boîte Support

## Parcours disponible

- Une demande créée déclenche un accusé de réception client. Si `MAIL_ORDER_NOTIFY` est renseigné, l’équipe reçoit aussi une notification avec un lien vers le dossier.
- L’agent prépare les détails de paiement dans le dossier. L’envoi des instructions crée un lien CHMK valable 20 minutes et déclenche le mail client. Les détails sensibles restent dans le lien personnel.
- Une référence de paiement déposée par le client déclenche un accusé de réception précisant que la vérification est en cours.
- Le mail « Payment verified » part après validation par le personnel autorisé. Pour les paiements nécessitant une seconde approbation, il part après cette approbation. Resend ne permet pas de vérifier un paiement : cette étape reste manuelle tant qu’aucun prestataire de paiement n’est connecté.
- Une réponse du personnel dans la conversation d’un dossier déclenche un email au client.
- Une relance peut partir dans les cinq dernières minutes de validité des instructions, si le planificateur décrit ci-dessous est activé. Elle ne part pas pour un dossier déjà en vérification ou payé. Elle demande de ne pas payer deux fois et de ne pas utiliser des instructions expirées. Une seule relance par version des instructions est enregistrée.
- Les réponses reçues par email apparaissent dans **Support inbox** (`/admin/inbox`). Les réponses à l’adresse signée d’une commande rejoignent aussi sa conversation si l’expéditeur correspond à l’email client. Un sujet contenant une référence ne suffit pas à rattacher un message.

La boîte globale est accessible aux super administrateurs et managers, avec MFA. Les agents peuvent continuer les conversations des dossiers via l’interface existante. Les adresses d’expéditeur d’emails ne prouvent pas l’identité d’une personne et ne donnent aucun droit supplémentaire. Les emails entrants ne modifient jamais les paiements ou statuts des commandes.

## Activation sur le VPS

Le domaine vérifié pour l’envoi ne suffit pas : il faut aussi activer la réception et raccorder un webhook. Aucune clé ne doit être publiée dans Git ou copiée dans une conversation.

1. Mettre à jour la branche `codex/parrotrehome-demo-docker-deploy` puis reconstruire avec `scripts/deploy-vps.sh`, comme pour les mises à jour précédentes. Aucun changement du schéma de base de données n’est nécessaire pour ce module.
2. Dans Resend, créer une clé autorisée à envoyer et à lire les emails reçus. Une clé limitée à l’envoi ne permet pas de récupérer les réponses.
3. Choisir le domaine de réception :
   - Pour recevoir directement `support@parrotrehome.com` et `orders@parrotrehome.com` dans l’administration, activer la réception de `parrotrehome.com` et appliquer les enregistrements MX indiqués par Resend.
   - Les MX du domaine principal déterminent le service recevant tous ses emails. Si une boîte mail ou une redirection existe déjà, conserver ses MX et utiliser plutôt `reply.parrotrehome.com` pour Resend. Dans ce cas, les réponses aux commandes peuvent entrer sur ce sous-domaine, mais `support@parrotrehome.com` reste géré par son service actuel tant qu’un transfert n’est pas configuré.
   - Utiliser exactement les valeurs DNS fournies par Resend. Ne pas remplacer les MX avec une valeur supposée et ne pas créer plusieurs enregistrements SPF indépendants pour le même nom DNS.
4. Créer un webhook Resend vers `https://parrotrehome.com/api/webhooks/resend` pour l’événement `email.received`. Copier son secret de signature dans la configuration du serveur.
5. Ouvrir `sudo nano /etc/parrotrehome/runtime.env`. Conserver les variables existantes et compléter les lignes suivantes **avec les vraies valeurs dans ce fichier uniquement** :

```dotenv
MAIL_TRANSPORT=resend
RESEND_API_KEY=REMPLACER_DANS_LE_FICHIER_SERVEUR
MAIL_FROM=no-reply@parrotrehome.com
MAIL_REPLY_TO=support@parrotrehome.com
MAIL_REPLY_DOMAIN=parrotrehome.com
RESEND_WEBHOOK_SECRET=REMPLACER_DANS_LE_FICHIER_SERVEUR
# Facultatif : une vraie adresse surveillée, différente de la boîte automatique si possible.
MAIL_ORDER_NOTIFY=
# Facultatif : un secret aléatoire pour le planificateur de relances.
CRON_SECRET=
```

`MAIL_REPLY_DOMAIN` doit correspondre au domaine où la réception est réellement activée. Si vous choisissez le sous-domaine, utiliser `MAIL_REPLY_DOMAIN=reply.parrotrehome.com` et une adresse de réponse générique valide sur ce sous-domaine, par exemple `MAIL_REPLY_TO=support@reply.parrotrehome.com`.

Les emails de commande utilisent automatiquement une adresse de réponse signée, propre au dossier. Les réponses envoyées depuis la boîte Support utilisent une adresse signée propre à la conversation. Le client n’a pas à saisir ces adresses : son bouton Répondre les utilise.

Après modification du fichier, recréer le service :

```bash
cd ~/parrotrehome
docker compose --env-file /etc/parrotrehome/compose.env \
  -f deploy/compose.yaml up -d --force-recreate app
```

Le service doit être reconstruit avec le nouveau code avant cette activation. Dans **Customer emails**, vérifier le transport, l’état de présence de la clé, l’expéditeur et la réception. L’interface n’affiche jamais les secrets. Le fichier serveur doit rester accessible uniquement à root (`chmod 600`).

## Relances et expiration automatiques

Créer un secret aléatoire, par exemple avec `openssl rand -hex 32`, et le placer dans `CRON_SECRET` du fichier serveur, puis recréer `app`.

Le script `scripts/run-mail-maintenance.sh` appelle l’API dans le conteneur avec ce secret sans l’inscrire dans la ligne de commande du système. Lancer d’abord :

```bash
cd ~/parrotrehome
sudo bash scripts/run-mail-maintenance.sh
```

Pour l’exécuter chaque minute, ajouter avec `sudo crontab -e` (adapter le chemin du dépôt si nécessaire) :

```cron
* * * * * /usr/bin/flock -n /run/parrotrehome-mail.lock /bin/bash /root/parrotrehome/scripts/run-mail-maintenance.sh >> /var/log/parrotrehome-mail.log 2>&1
```

Le planificateur du VPS doit être installé et actif. Il faut ce déclencheur périodique pour envoyer les relances et mettre à jour les statuts d’expiration. La validation d’un lien expiré reste refusée côté serveur même si aucun planificateur n’est actif.

## Modèles et aperçu

**Customer emails** (`/admin/email-templates`) présente six modèles personnalisables et leurs aperçus HTML : demande reçue, instructions CHMK, relance avant expiration, référence reçue, paiement vérifié et réponse d’agent. Les couleurs reprennent l’ivoire, le vert, le gris ardoise et l’or du site. Les textes sont en anglais comme l’interface client. L’aperçu statique [email-templates-preview.html](email-templates-preview.html) contient des exemples sans données réelles.

Les modèles de rendez-vous existants continuent à utiliser le transport commun et le même habillage HTML ; ils ne sont pas modifiés par les six éditeurs de commande.

## Vérification réelle après activation

- Créer une demande avec une adresse de test qui vous appartient et vérifier l’accusé de réception dans la boîte destinataire et dans Resend.
- Envoyer des instructions depuis le dossier et vérifier l’email, son lien et son expiration de 20 minutes.
- Répondre à cet email ; vérifier l’arrivée dans **Support inbox** et dans le dossier. Répondre depuis l’administration et vérifier le retour dans la boîte client.
- Envoyer directement un email à l’adresse support du domaine de réception ; vérifier qu’il apparaît comme conversation indépendante.
- Vérifier qu’aucun email de paiement confirmé ne part avant la validation du paiement.

`SENT` signifie accepté par Resend, pas une preuve de remise dans la boîte destinataire. Les événements de livraison et de rebond ne sont pas encore synchronisés dans l’application : les consulter dans Resend. En mode `preview`, les emails sont conservés sans envoi ; passer en mode réel ne renvoie pas automatiquement les anciennes prévisualisations. Les échecs sont enregistrés ; il n’y a pas de file de réessai automatique. Après correction d’un échec, réémettre des instructions ou une réponse adaptée depuis le dossier/support plutôt que réutiliser un lien expiré.

La boîte Support stocke ses messages dans `/data/email-inbox` sous Docker Compose (`EMAIL_INBOX_DIR`), dans le volume persistant. Sauvegarder ce dossier avec la base et les médias. Les emails entrants sont affichés en texte ; les pièces jointes et le HTML entrant ne sont pas rendus. Les signatures des webhooks sont vérifiées et leurs réémissions ne dupliquent pas les messages.

## Adresses professionnelles et offres gratuites

Avec Resend recevant le domaine et cette interface, il est possible de recevoir plusieurs adresses comme `support@parrotrehome.com` et `orders@parrotrehome.com` dans la même boîte administrative. Ce ne sont pas deux comptes de webmail indépendants avec leur propre mot de passe. L’envoi et la réception restent soumis aux limites et conditions du forfait Resend.

[Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) propose une redirection gratuite vers une boîte existante ; ce n’est pas une boîte hébergée avec SMTP. Cela peut servir si vous préférez lire vos messages dans une boîte personnelle, mais ne remplace pas le webhook de cette intégration.

Pour de véritables boîtes séparées avec webmail, regarder notamment [Zoho Mail](https://www.zoho.com/mail/zohomail-pricing.html). Vérifier la disponibilité et les restrictions du forfait gratuit dans votre région ; aucune offre actuelle n’a pu être vérifiée depuis cet environnement. Éviter de gérer vous-même un serveur SMTP sur le VPS uniquement pour économiser une ou deux boîtes.
