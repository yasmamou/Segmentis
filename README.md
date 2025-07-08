# PulseResp - Surveillance Physiologique en Temps Réel

PulseResp est une application web Next.js 14 qui utilise la technologie rPPG (Remote Photoplethysmography) pour mesurer la fréquence cardiaque et respiratoire en temps réel via la caméra de votre appareil.

## 🚀 Fonctionnalités

- **Surveillance en temps réel** : Capture vidéo continue à 30 FPS
- **Technologie rPPG** : Mesure de la fréquence cardiaque via analyse du canal vert
- **Détection respiratoire** : Analyse des mouvements de la poitrine
- **Interface moderne** : Design responsive avec TailwindCSS
- **Tableau de bord** : Graphiques interactifs avec Chart.js
- **Export de données** : Export CSV et JSON des mesures
- **API REST** : Stockage et récupération des données

## 🛠️ Technologies Utilisées

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique
- **TailwindCSS** : Styling utilitaire
- **Chart.js** : Graphiques interactifs
- **MediaDevices API** : Accès à la caméra
- **Canvas API** : Traitement d'image en temps réel

## 📋 Prérequis

- Node.js 18+ 
- Navigateur moderne avec support WebRTC
- Caméra frontale (idéalement)

## 🚀 Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd pulseresp
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir l'application**
   ```
   http://localhost:3000
   ```

## 📱 Utilisation

### Page de Surveillance (`/`)

1. **Autoriser l'accès à la caméra** : Cliquez sur "Démarrer la surveillance"
2. **Positionnement** : Placez-vous face à la caméra à 30-50 cm de distance
3. **Mesure** : Restez immobile pendant la mesure pour de meilleurs résultats
4. **Lecture** : Les valeurs HR (fréquence cardiaque) et RR (fréquence respiratoire) s'affichent en temps réel

### Page de Statistiques (`/stats`)

- **Graphiques** : Visualisation des séries temporelles
- **Statistiques** : Moyennes, min/max, durée de session
- **Export** : Téléchargement des données en CSV ou JSON

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Configuration de l'API (optionnel)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Déploiement

L'application est configurée pour le déploiement sur Vercel :

```bash
npm run build
npm start
```

## 📊 Algorithme de Traitement

### Fréquence Cardiaque (rPPG)

1. **Extraction du canal vert** : Analyse des variations de couleur de la peau
2. **Filtrage passe-bande** : 0.8-3 Hz (48-180 BPM)
3. **FFT** : Analyse fréquentielle pour détecter la fréquence dominante
4. **Validation** : Vérification des plages physiologiques

### Fréquence Respiratoire

1. **Détection de mouvement** : Analyse de la région thoracique
2. **Calcul de variance** : Mesure des variations d'intensité
3. **Filtrage passe-bande** : 0.1-0.5 Hz (6-30 BRPM)
4. **FFT** : Extraction de la fréquence respiratoire

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/log/          # API route pour le logging
│   ├── stats/            # Page des statistiques
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Page d'accueil
├── components/
│   ├── VideoCapture.tsx  # Composant de capture vidéo
│   └── StatsDashboard.tsx # Tableau de bord
└── utils/
    └── videoProcessor.ts # Traitement vidéo et signaux
```

## 🔒 Sécurité et Confidentialité

- **Données locales** : Les mesures sont stockées en mémoire (redémarrage = perte)
- **Pas de cloud** : Aucune donnée n'est envoyée vers des serveurs externes
- **Permissions** : Accès caméra uniquement avec consentement utilisateur

## 🐛 Dépannage

### Problèmes courants

1. **Erreur d'accès caméra**
   - Vérifiez les permissions du navigateur
   - Assurez-vous qu'aucune autre application n'utilise la caméra

2. **Mesures imprécises**
   - Améliorez l'éclairage
   - Restez immobile pendant la mesure
   - Évitez les mouvements brusques

3. **Performance lente**
   - Fermez les autres onglets
   - Utilisez un navigateur moderne
   - Vérifiez la résolution de la caméra

## 📈 Améliorations Futures

- [ ] Stockage persistant (base de données)
- [ ] Authentification utilisateur
- [ ] Alertes en temps réel
- [ ] Support multi-utilisateurs
- [ ] API mobile native
- [ ] Intégration IoT

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :

- Ouvrez une issue sur GitHub
- Consultez la documentation technique
- Contactez l'équipe de développement

---

**Note** : Cette application est destinée à des fins éducatives et de recherche. Les mesures ne doivent pas remplacer un diagnostic médical professionnel.
