export type LanguageCode = 'en' | 'fr' | 'es';

export type ProductCategory = 'bread' | 'pastry' | 'cake';

export type OrderStatus =
  | 'confirmed'
  | 'baking'
  | 'finishing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type LoyaltyTier = 'crumb' | 'artisan' | 'patron';

export interface Product {
  id: string;
  name: string;
  nameFr: string;
  nameEs: string;
  category: ProductCategory;
  price: number;
  stockCount: number;
  reorderThreshold: number;
  parLevel: number;
  unit: string;
  autoReorder: boolean;
  supplier: string;
  description: string;
  descriptionFr: string;
  descriptionEs: string;
  allergens: string[];
  image: string;
  prepTimeMins: number;
  active: boolean;
  updatedAt?: unknown;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  parLevel: number;
  unitCost: number;
  supplier: string;
  autoReorder: boolean;
  updatedAt?: unknown;
}

export interface PurchaseOrder {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'product' | 'ingredient';
  quantity: number;
  unit: string;
  supplier: string;
  status: 'pending' | 'ordered' | 'received';
  triggeredBy: 'auto' | 'manual';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomCakeSpec {
  id: string;
  sizeLabel: string;
  tiers: number;
  sponge: string;
  filling: string;
  dietary: string;
  inscription: string;
  pickupDate: string;
  notes: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  quantity: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  address: string;
  language: LanguageCode;
  emailNotifications: boolean;
  pushNotifications: boolean;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BakeryOrder {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: 'pickup' | 'delivery';
  pickupSlot: string;
  deliveryAddress: string;
  items: OrderItem[];
  customCakes: CustomCakeSpec[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  paymentMethod: 'card' | 'apple_pay' | 'counter';
  paymentStatus: 'paid' | 'pending_counter';
  paymentReference: string;
  status: OrderStatus;
  kitchenNotes: string;
  language: LanguageCode;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationLog {
  id: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  channel: 'email' | 'push' | 'system';
  recipientEmail: string;
  subject: string;
  body: string;
  deliveryStatus: 'sent' | 'queued' | 'logged';
  read: boolean;
  createdAt?: unknown;
}

export interface BackupSnapshot {
  id: string;
  label: string;
  createdByEmail: string;
  productCount: number;
  orderCount: number;
  ingredientCount: number;
  checksum: string;
  payload: string;
  createdAt?: unknown;
}
