"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "fr" | "ar";

const translations = {
  fr: {
    common: {
      updateFailed: "Échec de la mise à jour.",
      createFailed: "Échec de la création.",
      unknown: "Inconnu",
    },
    nav: {
      home: "Accueil",
      pricing: "Tarifs",
      track: "Suivi",
      staff: "Personnel",
      driver: "Chauffeur",
      relay: "Relais",
      admin: "Admin",
      portal: "Portail",
      staffAccess: "Accès personnel",
      mvp: "MVP",
      premium: "Logistique premium",
    },
    home: {
      badge: "Logistique premium",
      title: "Gestion intelligente des expéditions pour des équipes logistiques modernes.",
      subtitle:
        "ShipTrack combine le contrôle d’entrepôt, la visibilité des coursiers et le suivi client dans une expérience fluide.",
      trackCta: "Suivre un envoi",
      pricingCta: "Voir les tarifs",
      whyTitle: "Pourquoi ShipTrack ?",
      whySubtitle: "Conçu pour des workflows logistiques premium avec clarté et précision.",
      features: [
        {
          title: "Suivi en temps réel",
          description:
            "Surveillez chaque envoi avec scans en direct, mises à jour des opérateurs et alertes instantanées.",
        },
        {
          title: "Niveaux de service premium",
          description:
            "Livraison standard J+7 ou express (< 7 jours) lorsque le timing est critique.",
        },
        {
          title: "Tarification par paliers",
          description: "Paliers B2C et B2B transparents avec poids minimum garanti.",
        },
        {
          title: "Gestion sécurisée",
          description: "Photos d’ID et de colis pour tracer chaque expédition.",
        },
        {
          title: "Réseau de relais",
          description: "Les envois transitent par des relais avec suivi complet.",
        },
        {
          title: "Visibilité chauffeur",
          description: "Les chauffeurs voient uniquement leurs colis assignés.",
        },
      ],
      zonesTitle: "Zones de service",
      zonesSubtitle: "Couverture hebdomadaire sur cinq zones européennes stratégiques.",
      zones: [
        "Zone 1 - Grandes métropoles",
        "Zone 2 - Centres régionaux",
        "Zone 3 - Villes secondaires",
        "Zone 4 - Couverture éloignée",
        "Zone 5 - Destinations spéciales",
      ],
      zoneActive: "Actif",
      readyTitle: "Prêt à expédier ?",
      readySubtitle:
        "Accédez au portail personnel pour créer des expéditions ou utiliser le suivi.",
      staffPortal: "Portail personnel",
      trackOrder: "Suivre une commande",
    },
    pricing: {
      title: "Tarification transparente",
      subtitle:
        "Logistique premium avec prix prévisibles, poids minimum garanti et flexibilité de service.",
      noteTitle: "Note importante",
      noteBody:
        "Toutes les expéditions sont facturées avec un minimum de {minWeight} kg, même si le poids réel est inférieur.",
      tierMinimum:
        "Facturation minimum {minWeight} kg. Idéal pour {audience}.",
      audienceIndividual: "les particuliers",
      audienceBusiness: "les clients professionnels",
      getStarted: "Commencer",
      calculatorTitle: "Calculateur de prix",
      calculatorSubtitle:
        "Estimez instantanément le coût. Les envois express appliquent un coefficient 1,7.",
      weightLabel: "Poids de l’envoi (kg)",
      pricingTierLabel: "Palier tarifaire",
      serviceLevelLabel: "Niveau de service",
      standardLabel: "Standard (J+7)",
      expressLabel: "Express (< 7 jours)",
      addHomeDelivery: "Ajouter livraison à domicile (+MAD {fee})",
      estimateTitle: "Estimation",
      billingWeight: "Poids facturé",
      ratePerKg: "Tarif par kg",
      basePrice: "Prix de base",
      finalPrice: "Prix final",
      expressNote: "Express applique un coefficient 1,7 avec une ETA garantie < 7 jours.",
      readyTitle: "Prêt à expédier ?",
      readySubtitle:
        "Utilisez le portail personnel pour créer des expéditions et gérer les flux premium.",
      createShipment: "Créer un envoi",
      trackNow: "Suivre maintenant",
    },
    track: {
      title: "Suivre votre envoi",
      subtitle: "Saisissez votre code de suivi pour un statut en temps réel et l’ETA.",
      trackingLabel: "Code de suivi",
      trackingPlaceholder: "Entrer le numéro de suivi",
      trackButton: "Suivre",
      searching: "Recherche...",
      notFound: "Aucun envoi trouvé avec ce code.",
      fetchError: "Impossible de récupérer l’envoi",
      detailsTitle: "Détails de l’envoi",
      tracking: "Suivi",
      status: "Statut",
      service: "Service",
      received: "Reçu",
      finalPrice: "Prix final",
      etaTitle: "ETA de livraison",
      etaPending: "ETA en attente (réception en cours)",
      expected: "Prévu",
      worstCase: "Pire cas",
      expressEta: "Express : prévu {date} (< 7 jours)",
    },
    login: {
      title: "Choisissez votre portail",
      subtitle: "Chaque rôle a son espace. Sélectionnez le portail correspondant.",
      staffTitle: "Portail personnel",
      staffDesc: "Créer des envois, encaisser les paiements et gérer les clients.",
      adminTitle: "Console admin",
      adminDesc: "Assigner des envois, gérer les utilisateurs et superviser.",
      driverTitle: "Espace chauffeur",
      driverDesc: "Voir vos missions et mettre à jour les statuts.",
      relayTitle: "Point relais",
      relayDesc: "Réceptionner les colis et marquer la disponibilité.",
      enter: "Entrer",
    },
    register: {
      title: "Demandes d’accès",
      subtitle:
        "Les comptes sont créés par les administrateurs. Contactez l’équipe admin pour l’onboarding.",
      adminConsole: "Console admin",
      backToPortals: "Retour aux portails",
    },
    staff: {
      loginTitle: "Connexion personnel",
      loginSubtitle:
        "Saisissez votre numéro de téléphone et PIN pour accéder aux outils.",
      phoneLabel: "Numéro de téléphone",
      pinLabel: "PIN",
      loginButton: "Se connecter",
      signingIn: "Connexion...",
      invalidCreds: "Identifiants invalides ou accès insuffisant.",
      dashboardTitle: "Tableau de bord personnel",
      dashboardSubtitle: "Bienvenue {name}. Créez et suivez les envois sortants.",
      logout: "Se déconnecter",
      createTitle: "Créer un envoi",
      senderName: "Nom complet de l’expéditeur",
      senderPhone: "Téléphone de l’expéditeur",
      senderAddress: "Adresse de l’expéditeur",
      senderId: "Numéro d’identité expéditeur",
      receiverName: "Nom complet du destinataire",
      receiverPhone: "Téléphone du destinataire",
      receiverAddress: "Adresse du destinataire",
      destinationCountry: "Pays de destination",
      weight: "Poids (kg)",
      negotiatedRate: "Tarif négocié par kg (optionnel)",
      payOnPickup: "Paiement à l’enlèvement",
      payNow: "Paiement immédiat",
      pod: "Paiement à la livraison",
      addHomeDelivery: "Ajouter livraison à domicile",
      senderIdPhoto: "Photo ID expéditeur (obligatoire)",
      parcelPhoto: "Photo colis (obligatoire)",
      billingWeight: "Poids facturé",
      ratePerKg: "Tarif par kg",
      finalPrice: "Prix final",
      createButton: "Créer l’envoi",
      shipmentCreated: "Envoi {trackingCode} créé.",
      myShipments: "Mes envois",
      noShipments: "Aucun envoi créé.",
      destination: "Destination",
      service: "Service",
      created: "Créé",
      photoRequired: "Veuillez téléverser les deux photos.",
      popupBlocked: "Popup bloqué. Autorisez les popups pour imprimer.",
    },
    admin: {
      loginTitle: "Connexion admin",
      loginSubtitle: "Connectez-vous avec votre téléphone administrateur et PIN.",
      invalidAdmin: "Identifiants admin invalides.",
      signingIn: "Connexion...",
      console: "Console admin",
      welcome: "Bienvenue {name}.",
      logout: "Se déconnecter",
      totalShipments: "Total des envois",
      inTransit: "En transit",
      delivered: "Livrés",
      pending: "En attente",
      shipments: "Envois",
      noShipments: "Aucun envoi disponible.",
      destination: "Destination",
      service: "Service",
      expected: "Prévu",
      finalPrice: "Prix final",
      assignTitle: "Assigner chauffeur / relais",
      selectShipment: "Sélectionner un envoi",
      assignDriver: "Assigner chauffeur (optionnel)",
      assignRelay: "Assigner relais (optionnel)",
      selectShipmentError: "Sélectionnez un envoi à assigner.",
      assignSaved: "Assignation mise à jour.",
      saveAssignment: "Enregistrer l’assignation",
      createUser: "Créer un utilisateur",
      fullName: "Nom complet",
      phone: "Téléphone",
      address: "Adresse",
      pin: "PIN",
      createUserButton: "Créer l’utilisateur",
      userCreated: "Utilisateur créé.",
      userList: "Liste des utilisateurs",
      noAddress: "Aucune adresse",
      customers: "Clients",
      customersSubtitle: "Basé sur les expéditeurs des envois.",
      customerAddress: "Adresse",
      customerCity: "Ville",
      customerCountry: "Pays",
      noCustomers: "Aucun historique client.",
      shipmentsCount: "{count} envois",
      delete: "Supprimer",
      deleteConfirm: "Supprimer cet envoi ? Cette action est définitive.",
      shipmentDeleted: "Envoi supprimé.",
      deleteError: "Impossible de supprimer l’envoi.",
    },
    driver: {
      loginTitle: "Connexion chauffeur",
      loginSubtitle: "Accédez à vos missions et scans.",
      invalidCreds: "Identifiants invalides.",
      signingIn: "Connexion...",
      dashboardTitle: "Tableau de bord chauffeur",
      welcome: "Bienvenue {name}.",
      logout: "Se déconnecter",
      noAssignments: "Aucune mission pour le moment.",
      destination: "Destination",
      received: "Reçu",
      eta: "ETA",
      price: "Prix",
      markInTransit: "Marquer en transit",
      markDelivered: "Marquer livré",
      scanQr: "Scanner QR",
      scanTitle: "Scanner le QR de l’envoi",
      scanSubtitle: "Visez le QR pour marquer l’envoi en transit.",
      close: "Fermer",
      startingCamera: "Démarrage de la caméra...",
      cameraNote: "L’accès caméra nécessite HTTPS ou localhost.",
      scanNotFound: "Code de suivi introuvable dans vos missions.",
      scanError: "Impossible de démarrer le scanner QR.",
      shipmentUpdated: "Envoi mis à jour.",
    },
    relay: {
      loginTitle: "Connexion relais",
      loginSubtitle: "Gérez l’inventaire des relais entrants.",
      invalidCreds: "Identifiants invalides.",
      signingIn: "Connexion...",
      dashboardTitle: "Inventaire relais",
      relayPoint: "Point relais : {name}.",
      logout: "Se déconnecter",
      noAssignments: "Aucun envoi assigné à ce relais.",
      destination: "Destination",
      received: "Reçu",
      eta: "ETA",
      price: "Prix",
      markAvailable: "Marquer disponible",
      markReleased: "Marquer remis",
      receiverIdPhoto: "Photo ID destinataire (obligatoire)",
      parcelPhoto: "Photo colis (obligatoire)",
      releasePhotosRequired: "Ajoutez les photos du colis et de l'ID avant la livraison.",
      releaseWithPhotos: "Livrer avec photos",
      scanQr: "Scanner QR",
      scanTitle: "Scanner le QR de l’envoi",
      scanSubtitle: "Visez le QR pour marquer l’envoi disponible.",
      close: "Fermer",
      startingCamera: "Démarrage de la caméra...",
      cameraNote: "L’accès caméra nécessite HTTPS ou localhost.",
      scanNotFound: "Code de suivi introuvable dans votre inventaire.",
      scanError: "Impossible de démarrer le scanner QR.",
      shipmentUpdated: "Envoi mis à jour.",
    },
    label: {
      title: "Étiquette d’envoi",
      sender: "Expéditeur",
      receiver: "Destinataire",
      destination: "Destination",
      weight: "Poids",
      barcode: "Code-barres",
      qr: "QR code",
      printed: "Imprimé",
    },
    footer: {
      rights: "(c) 2025 ShipTrack MVP. Tous droits réservés.",
      premium: "Logistique premium",
    },
  },
  ar: {
    common: {
      updateFailed: "فشل التحديث.",
      createFailed: "فشل الإنشاء.",
      unknown: "غير معروف",
    },
    nav: {
      home: "الرئيسية",
      pricing: "الأسعار",
      track: "التتبع",
      staff: "الموظفون",
      driver: "السائق",
      relay: "نقطة الاستلام",
      admin: "الإدارة",
      portal: "البوابة",
      staffAccess: "دخول الموظفين",
      mvp: "MVP",
      premium: "لوجستيات فاخرة",
    },
    home: {
      badge: "لوجستيات فاخرة",
      title: "إدارة ذكية للشحنات لفرق لوجستية حديثة.",
      subtitle:
        "يجمع ShipTrack بين تحكم المستودع ورؤية السائقين وتتبع العملاء في تجربة واحدة.",
      trackCta: "تتبع شحنة",
      pricingCta: "عرض الأسعار",
      whyTitle: "لماذا ShipTrack؟",
      whySubtitle: "مصمم لسير عمل لوجستي فاخر بوضوح ودقة.",
      features: [
        {
          title: "تتبع فوري",
          description: "راقب كل شحنة مع المسح المباشر وتحديثات المعالج والتنبيهات.",
        },
        {
          title: "مستويات خدمة ممتازة",
          description: "تسليم قياسي J+7 أو سريع (< 7 أيام) عند الحاجة.",
        },
        {
          title: "تسعير متعدد الشرائح",
          description: "شرائح B2C وB2B شفافة مع حد أدنى للوزن.",
        },
        {
          title: "مناولة آمنة",
          description: "صور الهوية والطرد تضمن تتبع كل شحنة.",
        },
        {
          title: "شبكة نقاط الاستلام",
          description: "تنتقل الشحنات عبر نقاط الاستلام مع سجل كامل.",
        },
        {
          title: "رؤية السائق",
          description: "يرى السائق فقط الشحنات المعيّنة له.",
        },
      ],
      zonesTitle: "مناطق الخدمة",
      zonesSubtitle: "تغطية أسبوعية عبر خمس مناطق أوروبية استراتيجية.",
      zones: [
        "المنطقة 1 - المدن الكبرى",
        "المنطقة 2 - المراكز الإقليمية",
        "المنطقة 3 - المدن الثانوية",
        "المنطقة 4 - مناطق بعيدة",
        "المنطقة 5 - وجهات خاصة",
      ],
      zoneActive: "نشط",
      readyTitle: "جاهز للشحن؟",
      readySubtitle: "ادخل بوابة الموظفين لإنشاء الشحنات أو استخدام التتبع.",
      staffPortal: "بوابة الموظفين",
      trackOrder: "تتبع الطلب",
    },
    pricing: {
      title: "تسعير شفاف",
      subtitle:
        "لوجستيات فاخرة بأسعار واضحة وحد أدنى للوزن ومرونة في مستوى الخدمة.",
      noteTitle: "ملاحظة مهمة",
      noteBody:
        "يتم احتساب جميع الشحنات بحد أدنى {minWeight} كغ حتى لو كان الوزن أقل.",
      tierMinimum: "حد أدنى {minWeight} كغ. مناسب لـ {audience}.",
      audienceIndividual: "العملاء الأفراد",
      audienceBusiness: "عملاء الشركات",
      getStarted: "ابدأ الآن",
      calculatorTitle: "حاسبة الأسعار",
      calculatorSubtitle: "قدّر التكلفة فورًا. الشحن السريع يطبق معامل 1.7.",
      weightLabel: "وزن الشحنة (كغ)",
      pricingTierLabel: "شريحة التسعير",
      serviceLevelLabel: "مستوى الخدمة",
      standardLabel: "قياسي (J+7)",
      expressLabel: "سريع (< 7 أيام)",
      addHomeDelivery: "إضافة توصيل منزلي (+MAD {fee})",
      estimateTitle: "التقدير",
      billingWeight: "الوزن المفوتر",
      ratePerKg: "السعر لكل كغ",
      basePrice: "السعر الأساسي",
      finalPrice: "السعر النهائي",
      expressNote: "السريع يطبق معامل 1.7 مع ضمان أقل من 7 أيام.",
      readyTitle: "جاهز للشحن؟",
      readySubtitle: "استخدم بوابة الموظفين لإنشاء الشحنات وإدارة التدفق.",
      createShipment: "إنشاء شحنة",
      trackNow: "تتبع الآن",
    },
    track: {
      title: "تتبع شحنتك",
      subtitle: "أدخل رمز التتبع للحصول على الحالة والموعد المتوقع.",
      trackingLabel: "رمز التتبع",
      trackingPlaceholder: "أدخل رقم التتبع",
      trackButton: "تتبع",
      searching: "جارٍ البحث...",
      notFound: "لم يتم العثور على شحنة بهذا الرمز.",
      fetchError: "تعذر جلب بيانات الشحنة",
      detailsTitle: "تفاصيل الشحنة",
      tracking: "التتبع",
      status: "الحالة",
      service: "الخدمة",
      received: "تم الاستلام",
      finalPrice: "السعر النهائي",
      etaTitle: "موعد التسليم المتوقع",
      etaPending: "الموعد قيد الانتظار (بانتظار الاستلام)",
      expected: "متوقع",
      worstCase: "الحد الأقصى",
      expressEta: "سريع: متوقع {date} (< 7 أيام)",
    },
    login: {
      title: "اختر بوابتك",
      subtitle: "لكل دور مساحة خاصة. اختر البوابة المناسبة.",
      staffTitle: "بوابة الموظفين",
      staffDesc: "إنشاء الشحنات واستلام المدفوعات وإدارة العملاء.",
      adminTitle: "لوحة الإدارة",
      adminDesc: "تعيين الشحنات وإدارة المستخدمين والإشراف.",
      driverTitle: "بوابة السائق",
      driverDesc: "عرض المهام وتحديث الحالات.",
      relayTitle: "نقطة الاستلام",
      relayDesc: "استلام الشحنات وتأكيد التوفر.",
      enter: "الدخول",
    },
    register: {
      title: "طلبات الوصول",
      subtitle:
        "يتم إنشاء الحسابات بواسطة الإدارة. تواصل مع فريق الإدارة للانضمام.",
      adminConsole: "لوحة الإدارة",
      backToPortals: "العودة إلى البوابات",
    },
    staff: {
      loginTitle: "تسجيل دخول الموظفين",
      loginSubtitle: "أدخل رقم الهاتف والرقم السري للوصول.",
      phoneLabel: "رقم الهاتف",
      pinLabel: "الرقم السري",
      loginButton: "تسجيل الدخول",
      signingIn: "جارٍ الدخول...",
      invalidCreds: "بيانات الدخول غير صحيحة أو الصلاحية غير كافية.",
      dashboardTitle: "لوحة الموظفين",
      dashboardSubtitle: "مرحبًا {name}. أنشئ وتابع الشحنات الصادرة.",
      logout: "تسجيل الخروج",
      createTitle: "إنشاء شحنة",
      senderName: "اسم المرسل الكامل",
      senderPhone: "هاتف المرسل",
      senderAddress: "عنوان المرسل",
      senderId: "رقم هوية المرسل",
      receiverName: "اسم المستلم الكامل",
      receiverPhone: "هاتف المستلم",
      receiverAddress: "عنوان المستلم",
      destinationCountry: "بلد الوجهة",
      weight: "الوزن (كغ)",
      negotiatedRate: "سعر متفق عليه لكل كغ (اختياري)",
      payOnPickup: "الدفع عند الاستلام",
      payNow: "الدفع الآن",
      pod: "الدفع عند التسليم",
      addHomeDelivery: "إضافة توصيل منزلي",
      senderIdPhoto: "صورة هوية المرسل (إلزامي)",
      parcelPhoto: "صورة الطرد (إلزامي)",
      billingWeight: "الوزن المفوتر",
      ratePerKg: "السعر لكل كغ",
      finalPrice: "السعر النهائي",
      createButton: "إنشاء الشحنة",
      shipmentCreated: "تم إنشاء الشحنة {trackingCode}.",
      myShipments: "شحناتي",
      noShipments: "لا توجد شحنات بعد.",
      destination: "الوجهة",
      service: "الخدمة",
      created: "تم الإنشاء",
      photoRequired: "يرجى رفع صورتي الهوية والطرد.",
      popupBlocked: "تم حظر النافذة المنبثقة. الرجاء السماح بالطباعة.",
    },
    admin: {
      loginTitle: "تسجيل دخول الإدارة",
      loginSubtitle: "أدخل رقم هاتف الإدارة والرقم السري.",
      invalidAdmin: "بيانات الإدارة غير صحيحة.",
      signingIn: "جارٍ الدخول...",
      console: "لوحة الإدارة",
      welcome: "مرحبًا {name}.",
      logout: "تسجيل الخروج",
      totalShipments: "إجمالي الشحنات",
      inTransit: "قيد النقل",
      delivered: "تم التسليم",
      pending: "قيد الانتظار",
      shipments: "الشحنات",
      noShipments: "لا توجد شحنات.",
      destination: "الوجهة",
      service: "الخدمة",
      expected: "الموعد المتوقع",
      finalPrice: "السعر النهائي",
      assignTitle: "تعيين سائق / نقطة استلام",
      selectShipment: "اختر شحنة",
      assignDriver: "تعيين سائق (اختياري)",
      assignRelay: "تعيين نقطة استلام (اختياري)",
      selectShipmentError: "يرجى اختيار شحنة للتعيين.",
      assignSaved: "تم تحديث التعيين.",
      saveAssignment: "حفظ التعيين",
      createUser: "إنشاء مستخدم",
      fullName: "الاسم الكامل",
      phone: "الهاتف",
      address: "العنوان",
      pin: "الرقم السري",
      createUserButton: "إنشاء المستخدم",
      userCreated: "تم إنشاء المستخدم.",
      userList: "قائمة المستخدمين",
      noAddress: "بدون عنوان",
      customers: "العملاء",
      customersSubtitle: "استنادًا إلى مرسلي الشحنات.",
      customerAddress: "???????",
      customerCity: "???????",
      customerCountry: "?????",
      noCustomers: "لا يوجد سجل عملاء بعد.",
      shipmentsCount: "{count} شحنات",
      delete: "حذف",
      deleteConfirm: "هل تريد حذف هذه الشحنة؟ لا يمكن التراجع.",
      shipmentDeleted: "تم حذف الشحنة.",
      deleteError: "تعذر حذف الشحنة.",
    },
    driver: {
      loginTitle: "تسجيل دخول السائق",
      loginSubtitle: "ادخل لمشاهدة المهام والمسح.",
      invalidCreds: "بيانات الدخول غير صحيحة.",
      signingIn: "جارٍ الدخول...",
      dashboardTitle: "لوحة السائق",
      welcome: "مرحبًا {name}.",
      logout: "تسجيل الخروج",
      noAssignments: "لا توجد مهام حالياً.",
      destination: "الوجهة",
      received: "تم الاستلام",
      eta: "موعد التسليم",
      price: "السعر",
      markInTransit: "تحديد قيد النقل",
      markDelivered: "تحديد تم التسليم",
      scanQr: "مسح QR",
      scanTitle: "مسح QR للشحنة",
      scanSubtitle: "وجّه الكاميرا لمسح QR ووضعها قيد النقل.",
      close: "إغلاق",
      startingCamera: "تشغيل الكاميرا...",
      cameraNote: "يتطلب الوصول للكاميرا HTTPS أو localhost.",
      scanNotFound: "رمز التتبع غير موجود ضمن مهامك.",
      scanError: "تعذر تشغيل ماسح QR.",
      shipmentUpdated: "تم تحديث الشحنة.",
    },
    relay: {
      loginTitle: "تسجيل دخول نقطة الاستلام",
      loginSubtitle: "إدارة مخزون الشحنات الواردة.",
      invalidCreds: "بيانات الدخول غير صحيحة.",
      signingIn: "جارٍ الدخول...",
      dashboardTitle: "مخزون نقطة الاستلام",
      relayPoint: "نقطة الاستلام: {name}.",
      logout: "تسجيل الخروج",
      noAssignments: "لا توجد شحنات مخصصة لهذه النقطة.",
      destination: "الوجهة",
      received: "تم الاستلام",
      eta: "موعد التسليم",
      price: "السعر",
      markAvailable: "تحديد متاح",
      markReleased: "تحديد تم التسليم",
      receiverIdPhoto: "???? ???? ??????? (??????)",
      parcelPhoto: "???? ????? (??????)",
      releasePhotosRequired: "???? ????? ??? ????? ????? ??????? ??? ???????.",
      releaseWithPhotos: "????? ?? ?????",
      scanQr: "مسح QR",
      scanTitle: "مسح QR للشحنة",
      scanSubtitle: "وجّه الكاميرا لمسح QR وتحديدها متاحة.",
      close: "إغلاق",
      startingCamera: "تشغيل الكاميرا...",
      cameraNote: "يتطلب الوصول للكاميرا HTTPS أو localhost.",
      scanNotFound: "رمز التتبع غير موجود ضمن مخزونك.",
      scanError: "تعذر تشغيل ماسح QR.",
      shipmentUpdated: "تم تحديث الشحنة.",
    },
    label: {
      title: "ملصق الشحنة",
      sender: "المرسل",
      receiver: "المستلم",
      destination: "الوجهة",
      weight: "الوزن",
      barcode: "باركود",
      qr: "رمز QR",
      printed: "تمت الطباعة",
    },
    footer: {
      rights: "© 2025 ShipTrack MVP. جميع الحقوق محفوظة.",
      premium: "لوجستيات فاخرة",
    },
  },
};

type TranslationTree = typeof translations.fr;

type I18nContext = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dictionary: TranslationTree;
};

const LocaleContext = createContext<I18nContext | null>(null);

const resolvePath = (obj: Record<string, unknown>, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") {
      return undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
};

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = window.localStorage.getItem("shiptrack_locale");
    if (stored === "fr" || stored === "ar") {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("shiptrack_locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dataset.locale = locale;
  }, [locale]);

  const dictionary = useMemo(
    () => (locale === "ar" ? translations.ar : translations.fr),
    [locale]
  );

  const t = (key: string, vars?: Record<string, string | number>) => {
    const raw =
      (resolvePath(dictionary as Record<string, unknown>, key) as string) ||
      (resolvePath(translations.fr as Record<string, unknown>, key) as string) ||
      key;
    return interpolate(raw, vars);
  };

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return context;
};
