export type StockStatus = "متوفر" | "مخزون محدود" | "نفذ المخزون" | "طلب مسبق";

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  status: StockStatus;
  description: string;
  images: string[];
  bestseller: boolean;
  isNewArrival: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  status: StockStatus;
  quantity: number;
};

export type DeliveryType = "home" | "office";

export type OrderStatus = "جديد" | "تم الاتصال" | "تم الشحن" | "تم التسليم";

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type Order = {
  id: string;
  customerName: string;
  phone: string;
  wilaya: string;
  address: string;
  notes: string;
  deliveryType: DeliveryType;
  deliveryFee: number;
  paymentMethod: "الدفع عند الاستلام";
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  mapUrl: string;
  createdAt: number;
  updatedAt: number;
};

export type WilayaDeliveryFee = {
  home: number;
  office: number;
};

export type DeliverySettings = {
  defaultHome: number;
  defaultOffice: number;
  wilayaFees: Record<string, WilayaDeliveryFee>;
  updatedAt: number;
};
