# Méthodes multiples et coordonnées directement par email

## Ajouter des méthodes

Avec le super administrateur, ouvrir **Administration → Payment methods → New payment method**. Saisir le nom (Zelle, virement bancaire, autre), le prestataire et le modèle des coordonnées. Cocher **Active** pour afficher la méthode aux clients. Il est possible de créer plusieurs méthodes ; chacune possède son propre modèle. Les méthodes inactives restent privées. L’API publique ne renvoie jamais les coordonnées ou modèles d’instructions.

Les variables `{{requestReference}}` et `{{totalQuoteUsd}}` du modèle sont remplies avec le dossier et le montant calculé côté serveur. Exemple de modèle bancaire à compléter par l’équipe :

```text
Beneficiary: [verified recipient]
Bank: [bank name]
Account / IBAN: [verified details]
Payment reference: {{requestReference}}
Amount: USD {{totalQuoteUsd}}
```

## Traiter une commande

Le client choisit parmi les méthodes actives. L’accusé de réception contient les articles, le total, la méthode choisie et les coordonnées/questionnaire qu’il a renseignés. L’équipe reçoit également la notification détaillée.

Ouvrir **Administration → Requests → dossier → Email payment instructions**. La méthode choisie et son modèle sont préremplis. Adapter les coordonnées propres au client et saisir la durée de validité en minutes (1 à 1 440, 20 par défaut). Le champ Support affiche l’adresse configurée par `MAIL_REPLY_TO` sur le serveur, normalement `support@parrotrehome.com`.

Cliquer **Email instructions to customer**. Le client reçoit directement : référence du dossier, méthode, montant, coordonnées de paiement, durée et date/heure d’expiration, ainsi que l’adresse support cliquable. Aucun lien n’est nécessaire pour consulter ces coordonnées dans l’email. Le bouton Répondre de sa messagerie utilise aussi l’adresse support. Le logo et la charte graphique sont conservés.

Les anciens modèles de paiement contenant seulement `{{secureLink}}` sont automatiquement remplacés à la lecture par le corps du nouveau modèle direct ; leur objet est conservé. Les autres modèles ne sont pas réinitialisés. Les nouveaux modèles personnalisés de paiement doivent conserver `{{paymentDetails}}`, `{{reference}}`, `{{expiry}}`, `{{supportEmail}}` et ne pas utiliser `{{secureLink}}`.

Les rappels automatiques reprennent les coordonnées et l’échéance de la version concernée. Un email reçu ne peut pas être effacé de la boîte du client : la durée indique jusqu’à quand utiliser les coordonnées, sans annuler automatiquement un virement ou fermer le compte client. Toute correction doit être envoyée dans un nouvel email. Les contrôles d’expiration sur le site restent effectifs.

## Paiement signalé par email

Si le client répond à l’email avec sa référence, l’équipe peut saisir cette référence dans **Verify payment** depuis le dossier après avoir vérifié le paiement auprès du prestataire. Le formulaire est disponible après l’envoi des coordonnées ; aucun dépôt sur le site n’est obligatoire. L’opération conserve un passage audité en vérification. Les montants nécessitant une seconde approbation restent soumis à cette règle. Un email ou une référence seuls ne confirment jamais automatiquement le paiement.

## Mise à jour

Aucune migration de schéma n’est requise. Mettre à jour la branche et reconstruire via `scripts/deploy-vps.sh`. Les méthodes sont persistées dans la base existante et les modèles d’emails dans le volume de données.
