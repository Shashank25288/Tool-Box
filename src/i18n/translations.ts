import type { LanguageCode, OrderStatus } from '../types/bakery';

export const TRANSLATIONS: Record<
  LanguageCode,
  {
    nav: {
      menu: string;
      customCakes: string;
      trackOrder: string;
      account: string;
      kitchen: string;
      bag: string;
    };
    hero: {
      kicker: string;
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
      statScheduleLabel: string;
      statScheduleValue: string;
      statLoavesLabel: string;
      statLoyaltyLabel: string;
      statLoyaltyValue: string;
      statPrepLabel: string;
      statPrepValue: string;
    };
    menu: {
      heading: string;
      subheading: string;
      searchPlaceholder: string;
      all: string;
      bread: string;
      pastry: string;
      cake: string;
      inStock: string;
      lowStock: string;
      soldOut: string;
      addToBag: string;
      added: string;
      allergens: string;
      prepMinutes: string;
    };
    customCake: {
      heading: string;
      subheading: string;
      sizeLabel: string;
      spongeLabel: string;
      fillingLabel: string;
      dietaryLabel: string;
      inscriptionLabel: string;
      inscriptionPlaceholder: string;
      pickupDateLabel: string;
      notesLabel: string;
      notesPlaceholder: string;
      addCustomCake: string;
      estimatedTotal: string;
    };
    cart: {
      title: string;
      empty: string;
      fulfillment: string;
      pickup: string;
      delivery: string;
      pickupSlot: string;
      address: string;
      customerName: string;
      email: string;
      phone: string;
      loyaltyRedeem: string;
      paymentMethod: string;
      card: string;
      applePay: string;
      counter: string;
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
      placeOrder: string;
      processing: string;
      signInToOrder: string;
    };
    tracking: {
      heading: string;
      subheading: string;
      lookupPlaceholder: string;
      enablePush: string;
      pushEnabled: string;
      statuses: Record<OrderStatus, string>;
      noOrders: string;
      notificationsHeading: string;
    };
    account: {
      heading: string;
      signInPrompt: string;
      signInGoogle: string;
      signOut: string;
      loyaltyCard: string;
      points: string;
      settingsHeading: string;
      saveSettings: string;
      saved: string;
      languagePref: string;
      emailAlerts: string;
      pushAlerts: string;
      orderHistory: string;
    };
    kitchen: {
      heading: string;
      tabQueue: string;
      tabInventory: string;
      tabAnalytics: string;
      tabBackups: string;
      printSummary: string;
      exportPdf: string;
      exportExcel: string;
      createBackup: string;
      autoReplenish: string;
    };
    offline: {
      banner: string;
    };
  }
> = {
  en: {
    nav: {
      menu: 'Daily Bake',
      customCakes: 'Custom Cakes',
      trackOrder: 'Track Order',
      account: 'Account',
      kitchen: 'Kitchen Studio',
      bag: 'Bag',
    },
    hero: {
      kicker: 'Elm Street Bakehouse · 36-Hour Cold Fermentation',
      title: 'Naturally leavened bread and celebration cakes, tracked from oven to table.',
      subtitle:
        'Reserve fresh morning loaves, commission bespoke tiered cakes, earn Hearth Patron rewards, and follow your bake live from our deck ovens.',
      ctaPrimary: 'Explore Daily Bake',
      ctaSecondary: 'Design a Custom Cake',
      statScheduleLabel: 'Morning Deck Pull',
      statScheduleValue: '06:30 & 11:00',
      statLoavesLabel: 'Fresh Items Available',
      statLoyaltyLabel: 'Loyalty Earn Rate',
      statLoyaltyValue: '10 pts / $1',
      statPrepLabel: 'Average Counter Prep',
      statPrepValue: '18 mins',
    },
    menu: {
      heading: 'Today’s Bakehouse Menu',
      subheading: 'Live inventory synced directly with our bakehouse ovens.',
      searchPlaceholder: 'Search loaves, pastries, ingredients...',
      all: 'All Bakes',
      bread: 'Artisan Breads',
      pastry: 'Morning Pastries',
      cake: 'Signature Cakes',
      inStock: 'Available',
      lowStock: 'Low Stock',
      soldOut: 'Sold Out',
      addToBag: 'Add to Bag',
      added: 'Added',
      allergens: 'Contains',
      prepMinutes: 'min prep',
    },
    customCake: {
      heading: 'Custom Celebration Cake Studio',
      subheading: 'Configure tiers, seasonal fillings, dietary accommodations, and hand-piped inscriptions.',
      sizeLabel: 'Size & Tiers',
      spongeLabel: 'Sponge Flavor',
      fillingLabel: 'Filling & Buttercream',
      dietaryLabel: 'Dietary Preference',
      inscriptionLabel: 'Hand-Piped Inscription',
      inscriptionPlaceholder: 'e.g. Happy 30th Birthday Clara',
      pickupDateLabel: 'Preferred Pickup Date',
      notesLabel: 'Florals & Design Notes',
      notesPlaceholder: 'Palette, fresh figs, chamomile, gold leaf...',
      addCustomCake: 'Add Custom Cake to Bag',
      estimatedTotal: 'Estimated Cake Total',
    },
    cart: {
      title: 'Your Bakehouse Bag',
      empty: 'Your bag is empty. Add fresh loaves or design a custom cake to begin.',
      fulfillment: 'Fulfillment',
      pickup: 'Bakery Pickup',
      delivery: 'Local Delivery',
      pickupSlot: 'Pickup / Delivery Window',
      address: 'Delivery Street Address',
      customerName: 'Full Name',
      email: 'Email for Automated Receipt & Alerts',
      phone: 'Mobile Number',
      loyaltyRedeem: 'Redeem Loyalty Points',
      paymentMethod: 'Payment Gateway',
      card: 'Credit / Debit Card',
      applePay: 'Express Pay',
      counter: 'Pay at Counter',
      subtotal: 'Subtotal',
      discount: 'Loyalty Discount',
      tax: 'Local Tax (8.25%)',
      total: 'Total Due',
      placeOrder: 'Complete Secure Order',
      processing: 'Authorizing Payment...',
      signInToOrder: 'Sign in with Google to link loyalty points & track live order',
    },
    tracking: {
      heading: 'Live Oven & Order Tracker',
      subheading: 'Real-time production status updated directly by our kitchen team.',
      lookupPlaceholder: 'Search by order # (e.g. HC-1042)...',
      enablePush: 'Enable Push Alerts',
      pushEnabled: 'Push Alerts Active',
      statuses: {
        confirmed: 'Order Confirmed',
        baking: 'In Deck Oven',
        finishing: 'Decorating & Packing',
        ready: 'Ready for Pickup',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      noOrders: 'No active orders match your query yet.',
      notificationsHeading: 'Automated Email & Push Dispatch Log',
    },
    account: {
      heading: 'Customer Account & Loyalty',
      signInPrompt: 'Sign in with Google to save preferences, redeem rewards, and access cloud-synced order history.',
      signInGoogle: 'Sign in with Google',
      signOut: 'Sign Out',
      loyaltyCard: 'Hearth Loyalty Standing',
      points: 'points',
      settingsHeading: 'Account & Notification Settings',
      saveSettings: 'Save Preferences',
      saved: 'Preferences Saved',
      languagePref: 'Preferred Language',
      emailAlerts: 'Automated Email Updates',
      pushAlerts: 'Instant Browser Push Alerts',
      orderHistory: 'Order History',
    },
    kitchen: {
      heading: 'Kitchen Operations & Inventory Studio',
      tabQueue: 'Kitchen Queue & Print Sheet',
      tabInventory: 'Inventory & Replenishment',
      tabAnalytics: 'Analytics & Reports',
      tabBackups: 'Cloud Data Backups',
      printSummary: 'Print Daily Kitchen Summary',
      exportPdf: 'Export PDF Report',
      exportExcel: 'Export Excel (.xlsx)',
      createBackup: 'Create Cloud Backup',
      autoReplenish: 'Run Auto-Replenish Check',
    },
    offline: {
      banner: 'Offline Mode — Cached menu & local queue active. Changes will sync automatically.',
    },
  },
  fr: {
    nav: {
      menu: 'Fournée du Jour',
      customCakes: 'Gâteaux Sur Mesure',
      trackOrder: 'Suivi Commande',
      account: 'Mon Compte',
      kitchen: 'Atelier Cuisine',
      bag: 'Panier',
    },
    hero: {
      kicker: 'Boulangerie Elm Street · Fermentation Lente 36h',
      title: 'Pains au levain naturel et gâteaux de célébration, suivis du four à votre table.',
      subtitle:
        'Réservez vos pains chauds du matin, composez un gâteau sur mesure, cumulez des points fidélité et suivez la cuisson en direct.',
      ctaPrimary: 'Voir la Fournée',
      ctaSecondary: 'Créer un Gâteau',
      statScheduleLabel: 'Sorties de Four',
      statScheduleValue: '06h30 & 11h00',
      statLoavesLabel: 'Produits Disponibles',
      statLoyaltyLabel: 'Programme Fidélité',
      statLoyaltyValue: '10 pts / 1 $',
      statPrepLabel: 'Préparation Moyenne',
      statPrepValue: '18 min',
    },
    menu: {
      heading: 'La Carte du Boulanger',
      subheading: 'Stock synchronisé en temps réel avec le fournil.',
      searchPlaceholder: 'Rechercher un pain, viennoiserie...',
      all: 'Tout Voir',
      bread: 'Pains au Levain',
      pastry: 'Viennoiseries',
      cake: 'Pâtisseries',
      inStock: 'En Stock',
      lowStock: 'Stock Limité',
      soldOut: 'Épuisé',
      addToBag: 'Ajouter',
      added: 'Ajouté',
      allergens: 'Allergènes',
      prepMinutes: 'min',
    },
    customCake: {
      heading: 'Atelier Gâteaux Sur Mesure',
      subheading: 'Choisissez étages, biscuits, garnitures et inscription personnalisée.',
      sizeLabel: 'Taille & Étages',
      spongeLabel: 'Biscuit',
      fillingLabel: 'Crème & Garniture',
      dietaryLabel: 'Régime Alimentaire',
      inscriptionLabel: 'Inscription à la Poche',
      inscriptionPlaceholder: 'Ex: Joyeux Anniversaire Clara',
      pickupDateLabel: 'Date de Retrait',
      notesLabel: 'Notes Florales & Décor',
      notesPlaceholder: 'Figues fraîches, camomille, palette douce...',
      addCustomCake: 'Ajouter le Gâteau au Panier',
      estimatedTotal: 'Total Estimé',
    },
    cart: {
      title: 'Votre Panier',
      empty: 'Votre panier est vide. Ajoutez des pains ou créez un gâteau.',
      fulfillment: 'Mode de Retrait',
      pickup: 'Retrait en Boutique',
      delivery: 'Livraison Locale',
      pickupSlot: 'Créneau Horaire',
      address: 'Adresse de Livraison',
      customerName: 'Nom Complet',
      email: 'E-mail de Confirmation',
      phone: 'Téléphone',
      loyaltyRedeem: 'Utiliser mes Points Fidélité',
      paymentMethod: 'Paiement Sécurisé',
      card: 'Carte Bancaire',
      applePay: 'Paiement Express',
      counter: 'Payer au Comptoir',
      subtotal: 'Sous-total',
      discount: 'Remise Fidélité',
      tax: 'Taxes (8,25%)',
      total: 'Total TTC',
      placeOrder: 'Valider et Payer',
      processing: 'Traitement sécurisé...',
      signInToOrder: 'Connectez-vous avec Google pour lier vos points et suivre la commande',
    },
    tracking: {
      heading: 'Suivi de Cuisson en Direct',
      subheading: 'Statut mis à jour instantanément par nos boulangers.',
      lookupPlaceholder: 'Rechercher par n° de commande...',
      enablePush: 'Activer Alertes Push',
      pushEnabled: 'Alertes Push Actives',
      statuses: {
        confirmed: 'Confirmée',
        baking: 'Au Four',
        finishing: 'Finition & Emballage',
        ready: 'Prête au Comptoir',
        completed: 'Remise',
        cancelled: 'Annulée',
      },
      noOrders: 'Aucune commande active trouvée.',
      notificationsHeading: 'Journal des E-mails et Alertes Push',
    },
    account: {
      heading: 'Compte Client & Fidélité',
      signInPrompt: 'Connectez-vous avec Google pour gérer vos préférences et votre historique.',
      signInGoogle: 'Connexion Google',
      signOut: 'Déconnexion',
      loyaltyCard: 'Statut Fidélité',
      points: 'points',
      settingsHeading: 'Paramètres du Compte',
      saveSettings: 'Enregistrer',
      saved: 'Enregistré',
      languagePref: 'Langue Préférée',
      emailAlerts: 'E-mails Automatiques',
      pushAlerts: 'Notifications Push',
      orderHistory: 'Historique des Commandes',
    },
    kitchen: {
      heading: 'Atelier Cuisine & Gestion des Stocks',
      tabQueue: 'File Cuisine & Feuille d’Impression',
      tabInventory: 'Stocks & Réapprovisionnement',
      tabAnalytics: 'Analyses & Exports',
      tabBackups: 'Sauvegardes Cloud',
      printSummary: 'Imprimer le Résumé du Jour',
      exportPdf: 'Exporter PDF',
      exportExcel: 'Exporter Excel (.xlsx)',
      createBackup: 'Créer Sauvegarde Cloud',
      autoReplenish: 'Vérifier Réapprovisionnement',
    },
    offline: {
      banner: 'Mode Hors Ligne — Données en cache utilisées. Synchronisation automatique au retour.',
    },
  },
  es: {
    nav: {
      menu: 'Horneado Diario',
      customCakes: 'Pasteles a Medida',
      trackOrder: 'Seguir Pedido',
      account: 'Mi Cuenta',
      kitchen: 'Cocina y Admin',
      bag: 'Bolsa',
    },
    hero: {
      kicker: 'Panadería Elm Street · Fermentación Fría 36h',
      title: 'Pan de masa madre y pasteles artesanales, seguidos del horno a tu mesa.',
      subtitle:
        'Reserva hogazas recién horneadas, diseña pasteles personalizados, acumula puntos de fidelidad y sigue tu pedido en tiempo real.',
      ctaPrimary: 'Ver Menú del Día',
      ctaSecondary: 'Diseñar Pastel',
      statScheduleLabel: 'Horneado Matutino',
      statScheduleValue: '06:30 y 11:00',
      statLoavesLabel: 'Piezas Disponibles',
      statLoyaltyLabel: 'Programa Lealtad',
      statLoyaltyValue: '10 pts / $1',
      statPrepLabel: 'Preparación Media',
      statPrepValue: '18 min',
    },
    menu: {
      heading: 'Menú de Hoy en el Obrador',
      subheading: 'Inventario en tiempo real conectado con nuestros hornos.',
      searchPlaceholder: 'Buscar panes, bollería, ingredientes...',
      all: 'Todo',
      bread: 'Panes Artesanales',
      pastry: 'Bollería',
      cake: 'Pasteles',
      inStock: 'Disponible',
      lowStock: 'Pocas Unidades',
      soldOut: 'Agotado',
      addToBag: 'Agregar',
      added: 'Agregado',
      allergens: 'Contiene',
      prepMinutes: 'min prep',
    },
    customCake: {
      heading: 'Estudio de Pasteles Personalizados',
      subheading: 'Elige pisos, bizcocho, relleno, opciones dietéticas e inscripción.',
      sizeLabel: 'Tamaño y Pisos',
      spongeLabel: 'Sabor del Bizcocho',
      fillingLabel: 'Relleno y Cobertura',
      dietaryLabel: 'Preferencia Dietética',
      inscriptionLabel: 'Dedicatoria Escrita',
      inscriptionPlaceholder: 'Ej. Feliz Cumpleaños Clara',
      pickupDateLabel: 'Fecha de Recogida',
      notesLabel: 'Notas de Diseño y Flores',
      notesPlaceholder: 'Higos frescos, manzanilla, tonos neutros...',
      addCustomCake: 'Agregar Pastel a la Bolsa',
      estimatedTotal: 'Total Estimado',
    },
    cart: {
      title: 'Tu Bolsa de Panadería',
      empty: 'Tu bolsa está vacía. Agrega panes frescos o diseña un pastel.',
      fulfillment: 'Entrega',
      pickup: 'Recoger en Tienda',
      delivery: 'Envío Local',
      pickupSlot: 'Horario Preferido',
      address: 'Dirección de Entrega',
      customerName: 'Nombre Completo',
      email: 'Correo para Recibo y Alertas',
      phone: 'Teléfono Móvil',
      loyaltyRedeem: 'Canjear Puntos de Lealtad',
      paymentMethod: 'Pasarela de Pago',
      card: 'Tarjeta Crédito / Débito',
      applePay: 'Pago Exprés',
      counter: 'Pagar en Mostrador',
      subtotal: 'Subtotal',
      discount: 'Descuento Lealtad',
      tax: 'Impuesto (8.25%)',
      total: 'Total a Pagar',
      placeOrder: 'Confirmar Pedido Seguro',
      processing: 'Procesando Pago...',
      signInToOrder: 'Inicia sesión con Google para acumular puntos y seguir el pedido',
    },
    tracking: {
      heading: 'Seguimiento en Vivo del Horno',
      subheading: 'Estado actualizado directamente por nuestro equipo de cocina.',
      lookupPlaceholder: 'Buscar por n.º de pedido...',
      enablePush: 'Activar Alertas Push',
      pushEnabled: 'Alertas Push Activas',
      statuses: {
        confirmed: 'Confirmado',
        baking: 'En el Horno',
        finishing: 'Decoración y Empaque',
        ready: 'Listo para Recoger',
        completed: 'Entregado',
        cancelled: 'Cancelado',
      },
      noOrders: 'No hay pedidos activos que coincidan.',
      notificationsHeading: 'Registro de Correos y Alertas Push',
    },
    account: {
      heading: 'Cuenta y Programa de Lealtad',
      signInPrompt: 'Inicia sesión con Google para guardar ajustes, canjear recompensas y ver tu historial.',
      signInGoogle: 'Iniciar con Google',
      signOut: 'Cerrar Sesión',
      loyaltyCard: 'Nivel de Lealtad Hearth',
      points: 'puntos',
      settingsHeading: 'Configuración de Cuenta y Alertas',
      saveSettings: 'Guardar Preferencias',
      saved: 'Preferencias Guardadas',
      languagePref: 'Idioma Preferido',
      emailAlerts: 'Alertas por Correo',
      pushAlerts: 'Notificaciones Push',
      orderHistory: 'Historial de Pedidos',
    },
    kitchen: {
      heading: 'Cocina, Inventario y Analítica',
      tabQueue: 'Cola de Cocina e Impresión',
      tabInventory: 'Inventario y Reposición',
      tabAnalytics: 'Analítica y Reportes',
      tabBackups: 'Respaldo en la Nube',
      printSummary: 'Imprimir Resumen Diario',
      exportPdf: 'Exportar PDF',
      exportExcel: 'Exportar Excel (.xlsx)',
      createBackup: 'Crear Respaldo Cloud',
      autoReplenish: 'Verificar Reposición',
    },
    offline: {
      banner: 'Modo Sin Conexión — Usando caché local. Los cambios se sincronizarán al volver.',
    },
  },
};
