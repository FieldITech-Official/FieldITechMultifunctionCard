### ☕ Soutenir le projet

Si ce projet vous est utile et vous fait gagner un peu de temps, vous pouvez m'aider en [mettant une petite étoile au dépôt](https://github.com/fielditech), en partageant vos configurations, en faisant un retour, ou tout simplement en m'offrant un café.

<div align="center">
  <a href="https://buymeacoffee.com/fielditech" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
  </a>
</div>
# FieldITechMultifunctionCard

**FieldITechMultifunctionCard** est une carte Lovelace hautement personnalisable et élégante pour **Home Assistant**, conçue et développée pour le site **FieldITech**. Elle permet d'afficher des pièces ou des équipements de manière moderne avec des effets néon, des en-têtes personnalisables, des blocs de télémesure flexibles, des barres graduées multiples et des grilles de boutons de commande interactifs.

---

## 🚀 Fonctionnalités Principales

* **Design Moderne & Néon** : Effets de halo lumineux configurables, dégradés fluides et design aux coins arrondis.
* **Télémesures Multiples** : Affichage dynamique de capteurs (température, humidité, énergie, etc.) avec indicateurs colorés et barres latérales.
* **Barres Graduées Intégrées** : Suivi visuel de plusieurs valeurs avec calcul intelligent des minimums et maximums (ou personnalisation manuelle).
* **Boutons de Commandes Interactifs** : Grilles de boutons adaptatives (de 1 à 4 par ligne) avec gestion dynamique des états (allumé/éteint/indisponible).
* **Cartes d'Alerte Intelligentes** : 
  * *Qualité de l'Air* : Analyse croisée de la température et de l'humidité avec recommandations textuelles dynamiques.
  * *Sécurité & Ouvrants* : Surveillance des portes, fenêtres, alarmes ou capteurs de fumée avec indicateurs d'anomalie.
* **Éditeur Visuel Complet** : Configuration intégrée directement dans l'interface utilisateur de Home Assistant.

---

## 📦 Installation

### 1. Via HACS (Recommandé)
Vous pouvez l'ajouter en tant que dépôt personnalisé (Lovelace plugin) dans HACS :
1. Allez dans **HACS** > **Frontend**.
2. Cliquez sur les trois petits points en haut à droite > **Dépôts personnalisés**.
3. Entrez l'URL de votre dépôt GitHub et choisissez la catégorie **Tableau de bord**.
4. Installez la carte.

### 2. Installation Manuelle
1. Téléchargez le fichier `fielditech-multifunction-card.js` depuis ce dépôt.
2. Placez-le dans votre dossier `www` de Home Assistant (ex: `/config/www/fielditech-multifunction-card.js`).
3. Ajoutez la ressource dans votre tableau de bord ou via les paramètres :
   ```yaml
   url: /local/fielditech-multifunction-card.js
   type: module
