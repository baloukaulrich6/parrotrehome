# Galerie et configuration du site

Les fiches `/parrots/[id]` affichent toutes les photos enregistrées depuis l’administration. Cliquez sur une miniature pour afficher la photo correspondante. La première image reste la couverture dans le catalogue et le panier. Les photos existantes et les nouveaux fichiers uploadés utilisent la même galerie.

Le super administrateur peut ouvrir **Administration → Configuration** (`/admin/settings`) pour modifier le nom du site, les deux signatures, l’adresse mail de contact, deux numéros de téléphone, l’adresse et les horaires. Le formulaire valide les champs avant enregistrement. Les autres rôles ne peuvent pas modifier cette configuration. Chaque sauvegarde est inscrite au journal d’audit.

Le nom et la signature secondaire alimentent le logo de l’en-tête et du pied de page. Les coordonnées et signatures sont affichées dans le pied de page et la page Contact. Rechargez une page déjà ouverte pour voir les modifications. Ces réglages ne changent ni le domaine du serveur, ni les identifiants d’envoi des emails, ni les contenus rédactionnels et modèles de mails, qui ont leurs propres pages.

Les réglages sont enregistrés dans `SITE_SETTINGS_FILE` (par défaut `var/site-settings.json`). Le fichier est écrit par remplacement atomique. Docker Compose configure `/data/site-settings.json`, dans le volume persistant existant : les redémarrages et mises à jour conservent les réglages. Sauvegardez ce fichier avec les autres données du volume. En l’absence de fichier, les valeurs par défaut sont utilisées ; remplacez les coordonnées d’exemple avant ouverture du site.

Validation : le test HTTP `tests/auth-integration.test.ts` vérifie les autorisations, la validation des réglages, leur affichage public, leur conservation après redémarrage et la présence de toutes les photos sur une fiche.
