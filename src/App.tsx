import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { CustomCakeBuilder } from './components/CustomCakeBuilder';
import { KitchenAdminStudio } from './components/KitchenAdminStudio';
import { OrderTrackingAndAccount } from './components/OrderTrackingAndAccount';
import { OfflineIndicator } from './components/PWAControls';
import { StorefrontView } from './components/StorefrontView';
import { INITIAL_INGREDIENTS, INITIAL_PRODUCTS } from './data/seedCatalog';
import { TRANSLATIONS } from './i18n/translations';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import type {
  BackupSnapshot,
  BakeryOrder,
  CustomCakeSpec,
  Ingredient,
  LanguageCode,
  LoyaltyTier,
  NotificationLog,
  OrderItem,
  OrderStatus,
  Product,
  PurchaseOrder,
  UserProfile,
} from './types/bakery';
import { computeChecksum } from './utils/exports';

type ActiveSection = 'menu' | 'custom-cakes' | 'tracking' | 'account' | 'kitchen';

function tierForPoints(points: number): LoyaltyTier {
  if (points >= 1500) return 'patron';
  if (points >= 500) return 'artisan';
  return 'crumb';
}

export default function App() {
  const [section, setSection] = useState<ActiveSection>('menu');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [orders, setOrders] = useState<BakeryOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);

  const [cartItems, setCartItems] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('hc_cart_items');
      return saved ? (JSON.parse(saved) as OrderItem[]) : [];
    } catch {
      return [];
    }
  });
  const [customCakes, setCustomCakes] = useState<CustomCakeSpec[]>(() => {
    try {
      const saved = localStorage.getItem('hc_custom_cakes');
      return saved ? (JSON.parse(saved) as CustomCakeSpec[]) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = TRANSLATIONS[language];
  const isAdmin = Boolean(user?.email === ADMIN_EMAIL && user?.emailVerified);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hc_cart_items', JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('hc_custom_cakes', JSON.stringify(customCakes));
    } catch {
      // Ignore storage quota errors
    }
  }, [customCakes]);

  // Auth listener & user profile bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (!firebaseUser) {
        setUserProfile(null);
        setOrders([]);
        setNotifications([]);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'guest@hearthandcrumb.local',
            displayName: firebaseUser.displayName || 'Bakery Guest',
            phone: '',
            address: '',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            loyaltyPoints: 0,
            loyaltyTier: 'crumb',
          };
          await setDoc(userRef, {
            ...initialProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setUserProfile(initialProfile);
        } else {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          if (data.language) setLanguage(data.language);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
      }
    });
    return () => unsub();
  }, []);

  // Live products subscription (publicly readable)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }));
          setProducts(list);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );
    return () => unsub();
  }, []);

  // Seed default catalog automatically when admin first connects
  const handleSeedCatalog = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const batch = writeBatch(db);
      for (const p of INITIAL_PRODUCTS) {
        batch.set(doc(db, 'products', p.id), { ...p, updatedAt: serverTimestamp() }, { merge: true });
      }
      for (const ing of INITIAL_INGREDIENTS) {
        batch.set(
          doc(db, 'ingredients', ing.id),
          { ...ing, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      await batch.commit();
      showToast('Bakery catalog & raw ingredients synced to Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    const prodRef = doc(db, 'products', INITIAL_PRODUCTS[0].id);
    getDoc(prodRef)
      .then((snap) => {
        if (!snap.exists()) {
          void handleSeedCatalog();
        }
      })
      .catch(() => {
        // Handled by listener
      });
  }, [authReady, user, isAdmin, handleSeedCatalog]);

  // Live user profile listener
  useEffect(() => {
    if (!authReady || !user) return;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
    );
    return () => unsub();
  }, [authReady, user]);

  // Live orders & notifications listeners
  useEffect(() => {
    if (!authReady || !user) return;

    const ordersQuery = isAdmin
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('userId', '==', user.uid));

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ ...(d.data() as Omit<BakeryOrder, 'id'>), id: d.id }))
          .sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const notifQuery = isAdmin
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('userId', '==', user.uid));

    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ ...(d.data() as Omit<NotificationLog, 'id'>), id: d.id }))
          .reverse();
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubOrders();
      unsubNotifs();
    };
  }, [authReady, user, isAdmin]);

  // Admin-only live ingredients, purchase orders, and backups listeners
  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;

    const unsubIng = onSnapshot(
      collection(db, 'ingredients'),
      (snap) => {
        if (!snap.empty) {
          setIngredients(snap.docs.map((d) => ({ ...(d.data() as Ingredient), id: d.id })));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ingredients')
    );

    const unsubPos = onSnapshot(
      collection(db, 'purchaseOrders'),
      (snap) => {
        setPurchaseOrders(snap.docs.map((d) => ({ ...(d.data() as PurchaseOrder), id: d.id })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'purchaseOrders')
    );

    const unsubBackups = onSnapshot(
      collection(db, 'backups'),
      (snap) => {
        setBackups(
          snap.docs
            .map((d) => ({ ...(d.data() as Omit<BackupSnapshot, 'id'>), id: d.id }))
            .reverse()
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'backups')
    );

    return () => {
      unsubIng();
      unsubPos();
      unsubBackups();
    };
  }, [authReady, user, isAdmin]);

  // Real-time Server-Sent Events stream for instant push alerts
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('order:updated', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          orderNumber: string;
          status: string;
        };
        showToast(`Order ${data.orderNumber} updated to ${data.status.toUpperCase()}`);
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          userProfile?.pushNotifications !== false
        ) {
          new Notification(`Order ${data.orderNumber}`, {
            body: `Status updated: ${data.status.toUpperCase()}`,
            icon: '/pwa-192x192.png',
          });
        }
      } catch {
        // Ignore malformed SSE payload
      }
    });
    return () => es.close();
  }, [showToast, userProfile?.pushNotifications]);

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSection('menu');
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockCount) return prev;
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          category: product.category,
          unitPrice: product.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateItemQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const next = i.quantity + delta;
          if (product && next > product.stockCount) return i;
          return { ...i, quantity: next };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleAddCustomCake = (cake: CustomCakeSpec) => {
    setCustomCakes((prev) => [...prev, cake]);
    showToast('Custom celebration cake added to your bag.');
  };

  const handleSubmitOrder = async (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    fulfillmentType: 'pickup' | 'delivery';
    pickupSlot: string;
    deliveryAddress: string;
    kitchenNotes: string;
    paymentMethod: 'card' | 'apple_pay' | 'counter';
    paymentReference: string;
    paymentStatus: 'paid' | 'pending_counter';
    loyaltyPointsRedeemed: number;
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  }) => {
    if (!user) return;
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `HC-${String(Date.now()).slice(-4)}`;
    const earnedPoints = Math.min(5000, Math.round(payload.totalAmount * 10));

    try {
      const orderDoc = {
        orderNumber,
        userId: user.uid,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        fulfillmentType: payload.fulfillmentType,
        pickupSlot: payload.pickupSlot,
        deliveryAddress: payload.deliveryAddress,
        items: cartItems,
        customCakes,
        subtotal: payload.subtotal,
        discountAmount: payload.discountAmount,
        taxAmount: payload.taxAmount,
        totalAmount: payload.totalAmount,
        loyaltyPointsEarned: earnedPoints,
        loyaltyPointsRedeemed: payload.loyaltyPointsRedeemed,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentStatus,
        paymentReference: payload.paymentReference,
        status: 'confirmed' as OrderStatus,
        kitchenNotes: payload.kitchenNotes,
        language,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'orders', orderId), orderDoc);

      // Decrement product inventory in Firestore (only if product exists in Firestore)
      for (const item of cartItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          const prodRef = doc(db, 'products', prod.id);
          const snap = await getDoc(prodRef);
          if (snap.exists()) {
            const currentStock = (snap.data() as Product).stockCount;
            const nextStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(prodRef, {
              stockCount: nextStock,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      // Update customer loyalty balance
      const currentPoints = userProfile?.loyaltyPoints ?? 0;
      const nextPoints = Math.max(0, currentPoints - payload.loyaltyPointsRedeemed + earnedPoints);
      await updateDoc(doc(db, 'users', user.uid), {
        loyaltyPoints: nextPoints,
        loyaltyTier: tierForPoints(nextPoints),
        updatedAt: serverTimestamp(),
      });

      // Dispatch automated email confirmation & record notification log
      const emailSubject = `Order ${orderNumber} Confirmed — Hearth & Crumb Bakery`;
      const emailBody = `Thank you ${payload.customerName}! Your order (${orderNumber}) totaling $${payload.totalAmount.toFixed(2)} is confirmed for ${payload.pickupSlot}. You earned ${earnedPoints} loyalty points.`;

      const emailRes = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.customerEmail,
          subject: emailSubject,
          message: emailBody,
          orderNumber,
          status: 'confirmed',
        }),
      });
      const emailData = (await emailRes.json()) as { deliveryStatus?: 'sent' | 'logged' };

      await setDoc(doc(db, 'notifications', `notif-${Date.now()}`), {
        userId: user.uid,
        orderId,
        orderNumber,
        channel: 'email',
        recipientEmail: payload.customerEmail,
        subject: emailSubject,
        body: emailBody,
        deliveryStatus: emailData.deliveryStatus || 'logged',
        read: false,
        createdAt: serverTimestamp(),
      });

      await fetch('/api/orders/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderNumber,
          status: 'confirmed',
          customerName: payload.customerName,
        }),
      });

      setCartItems([]);
      setCustomCakes([]);
      setSection('tracking');
      showToast(`Order ${orderNumber} placed! Automated confirmation dispatched.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      showToast('Order cancelled.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
    }
  };

  const handleAdvanceOrderStatus = async (order: BakeryOrder, nextStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      const statusText = TRANSLATIONS[order.language || 'en'].tracking.statuses[nextStatus];
      const subject = `Order ${order.orderNumber} Update: ${statusText}`;
      const body = `Hi ${order.customerName}, your Hearth & Crumb order ${order.orderNumber} is now ${statusText}.`;

      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customerEmail,
          subject,
          message: body,
          orderNumber: order.orderNumber,
          status: nextStatus,
        }),
      });

      await setDoc(doc(db, 'notifications', `notif-${Date.now()}`), {
        userId: order.userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        channel: 'push',
        recipientEmail: order.customerEmail,
        subject,
        body,
        deliveryStatus: 'sent',
        read: false,
        createdAt: serverTimestamp(),
      });

      await fetch('/api/orders/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: nextStatus,
          customerName: order.customerName,
        }),
      });

      showToast(`Order ${order.orderNumber} moved to ${statusText}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleAdjustProductStock = async (product: Product, delta: number) => {
    try {
      const nextStock = Math.max(0, product.stockCount + delta);
      await setDoc(
        doc(db, 'products', product.id),
        { ...product, stockCount: nextStock, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleAdjustIngredientStock = async (ing: Ingredient, delta: number) => {
    try {
      const nextStock = Math.max(0, Number((ing.currentStock + delta).toFixed(2)));
      await setDoc(
        doc(db, 'ingredients', ing.id),
        { ...ing, currentStock: nextStock, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ingredients/${ing.id}`);
    }
  };

  const handleRunAutoReplenish = async (): Promise<number> => {
    let created = 0;
    try {
      for (const p of products) {
        if (!p.autoReorder || p.stockCount > p.reorderThreshold) continue;
        const alreadyOpen = purchaseOrders.some(
          (po) => po.itemId === p.id && po.status !== 'received'
        );
        if (alreadyOpen) continue;
        const poId = `po-prod-${p.id}-${Date.now()}`;
        await setDoc(doc(db, 'purchaseOrders', poId), {
          id: poId,
          itemId: p.id,
          itemName: p.name,
          itemType: 'product',
          quantity: Math.max(1, p.parLevel - p.stockCount),
          unit: p.unit,
          supplier: p.supplier,
          status: 'pending',
          triggeredBy: 'auto',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        created++;
      }

      for (const ing of ingredients) {
        if (!ing.autoReorder || ing.currentStock > ing.reorderPoint) continue;
        const alreadyOpen = purchaseOrders.some(
          (po) => po.itemId === ing.id && po.status !== 'received'
        );
        if (alreadyOpen) continue;
        const poId = `po-ing-${ing.id}-${Date.now()}`;
        await setDoc(doc(db, 'purchaseOrders', poId), {
          id: poId,
          itemId: ing.id,
          itemName: ing.name,
          itemType: 'ingredient',
          quantity: Math.max(1, ing.parLevel - ing.currentStock),
          unit: ing.unit,
          supplier: ing.supplier,
          status: 'pending',
          triggeredBy: 'auto',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        created++;
      }
      return created;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchaseOrders');
    }
  };

  const handleUpdatePoStatus = async (po: PurchaseOrder, nextStatus: 'ordered' | 'received') => {
    try {
      await updateDoc(doc(db, 'purchaseOrders', po.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      if (nextStatus === 'received') {
        if (po.itemType === 'product') {
          const p = products.find((item) => item.id === po.itemId);
          if (p) {
            await updateDoc(doc(db, 'products', p.id), {
              stockCount: p.parLevel,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const ing = ingredients.find((item) => item.id === po.itemId);
          if (ing) {
            await updateDoc(doc(db, 'ingredients', ing.id), {
              currentStock: ing.parLevel,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `purchaseOrders/${po.id}`);
    }
  };

  const handleCreateBackup = async (label: string) => {
    if (!user) return;
    try {
      const payloadObj = {
        exportedAt: new Date().toISOString(),
        products: products.map(({ updatedAt: _u, ...rest }) => rest),
        ingredients: ingredients.map(({ updatedAt: _u, ...rest }) => rest),
        orders: orders.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest),
      };
      const payloadStr = JSON.stringify(payloadObj);
      const checksum = computeChecksum(payloadStr);
      const backupId = `bkp-${Date.now()}`;
      await setDoc(doc(db, 'backups', backupId), {
        label,
        createdByEmail: user.email || ADMIN_EMAIL,
        productCount: products.length,
        orderCount: orders.length,
        ingredientCount: ingredients.length,
        checksum,
        payload: payloadStr,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'backups');
    }
  };

  const handleRestoreBackup = async (backup: BackupSnapshot) => {
    try {
      const parsed = JSON.parse(backup.payload) as {
        products?: Product[];
        ingredients?: Ingredient[];
      };
      const batch = writeBatch(db);
      for (const p of parsed.products ?? []) {
        batch.set(doc(db, 'products', p.id), { ...p, updatedAt: serverTimestamp() });
      }
      for (const ing of parsed.ingredients ?? []) {
        batch.set(doc(db, 'ingredients', ing.id), { ...ing, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'backups/restore');
    }
  };

  const bagCount = useMemo(
    () =>
      cartItems.reduce((s, i) => s + i.quantity, 0) +
      customCakes.reduce((s, c) => s + c.quantity, 0),
    [cartItems, customCakes]
  );

  const navItems: Array<{ id: ActiveSection; label: string }> = [
    { id: 'menu', label: t.nav.menu },
    { id: 'custom-cakes', label: t.nav.customCakes },
    { id: 'tracking', label: t.nav.trackOrder },
    { id: 'account', label: t.nav.account },
    { id: 'kitchen', label: t.nav.kitchen },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-[#18181B]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#E7E2D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => setSection('menu')}
            className="font-display text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 text-left"
          >
            Hearth &amp; Crumb
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#52525B]">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  section === item.id
                    ? 'text-[#18181B] border-[#14532D]'
                    : 'border-transparent hover:text-[#18181B]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {t.nav.bag} ({bagCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 text-[#18181B] border border-[#E7E2D8] rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E7E2D8] bg-white px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`py-2.5 px-3 text-left text-sm font-medium rounded-lg ${
                  section === item.id
                    ? 'bg-[#14532D]/10 text-[#14532D]'
                    : 'text-[#52525B] hover:bg-[#F4F3EF]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">
        {section === 'menu' && (
          <StorefrontView
            products={products}
            language={language}
            onLanguageChange={setLanguage}
            onAddToCart={handleAddToCart}
            onNavigateCustomCakes={() => setSection('custom-cakes')}
          />
        )}

        {section === 'custom-cakes' && (
          <CustomCakeBuilder language={language} onAddCustomCake={handleAddCustomCake} />
        )}

        {(section === 'tracking' || section === 'account') && (
          <OrderTrackingAndAccount
            mode={section}
            language={language}
            orders={orders}
            notifications={notifications}
            userProfile={userProfile}
            isSignedIn={Boolean(user)}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onSaveProfile={handleSaveProfile}
            onCancelOrder={handleCancelOrder}
            onMarkNotificationRead={handleMarkNotificationRead}
            onLanguageChange={setLanguage}
          />
        )}

        {section === 'kitchen' && (
          <KitchenAdminStudio
            language={language}
            isAdmin={isAdmin}
            isSignedIn={Boolean(user)}
            userEmail={user?.email ?? null}
            onSignIn={handleSignIn}
            products={products}
            ingredients={ingredients}
            orders={orders}
            purchaseOrders={purchaseOrders}
            backups={backups}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onAdjustProductStock={handleAdjustProductStock}
            onAdjustIngredientStock={handleAdjustIngredientStock}
            onRunAutoReplenish={handleRunAutoReplenish}
            onUpdatePoStatus={handleUpdatePoStatus}
            onCreateBackup={handleCreateBackup}
            onRestoreBackup={handleRestoreBackup}
            onSeedCatalog={handleSeedCatalog}
          />
        )}
      </main>

      <footer className="no-print mt-16 border-t border-[#E7E2D8] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52525B]">
          <div>
            Hearth &amp; Crumb Bakery · 214 Elm Street · Open Daily 06:30 – 18:00
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSection('menu')}
              className="hover:text-[#18181B]"
            >
              {t.nav.menu}
            </button>
            <button
              type="button"
              onClick={() => setSection('custom-cakes')}
              className="hover:text-[#18181B]"
            >
              {t.nav.customCakes}
            </button>
            <button
              type="button"
              onClick={() => setSection('tracking')}
              className="hover:text-[#18181B]"
            >
              {t.nav.trackOrder}
            </button>
          </div>
        </div>
      </footer>

      <CartCheckoutDrawer
        isOpen={bagOpen}
        onClose={() => setBagOpen(false)}
        language={language}
        items={cartItems}
        customCakes={customCakes}
        userProfile={userProfile}
        isSignedIn={Boolean(user)}
        onSignIn={handleSignIn}
        onUpdateItemQty={handleUpdateItemQty}
        onRemoveCake={(id) => setCustomCakes((prev) => prev.filter((c) => c.id !== id))}
        onSubmitOrder={handleSubmitOrder}
      />

      {toastMessage && (
        <div className="no-print fixed bottom-4 right-4 z-50 bg-[#18181B] text-white text-xs font-medium px-4 py-3 rounded-lg shadow-xl border border-white/10 max-w-sm">
          {toastMessage}
        </div>
      )}

      <OfflineIndicator message={t.offline.banner} />
    </div>
  );
}
