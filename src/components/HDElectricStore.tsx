"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { FormEvent } from "react";
import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, orderBy } from "firebase/firestore";
import { bootFirebaseAnalytics, firebaseAuth, firestore } from "@/lib/firebase";
import {
  CATEGORIES,
  DEFAULT_BRANCHES,
  DEFAULT_DELIVERY_SETTINGS,
  DEFAULT_PRODUCTS,
  EMAIL,
  LOGO_URL,
  PHONE,
  WILAYAS,
  formatDzd,
  isProductPurchasable,
} from "@/lib/catalog";
import type {
  Branch,
  CartItem,
  DeliverySettings,
  DeliveryType,
  Order,
  OrderStatus,
  Product,
  StockStatus,
} from "@/types/store";

/* ═══════ TYPES ═══════ */
type View = "home" | "products" | "product" | "cart" | "checkout" | "admin";
type AdminTab = "products" | "orders" | "delivery" | "branches";
type ProductDraft = { name: string; sku: string; category: string; price: string; oldPrice: string; stock: string; status: StockStatus; description: string; images: string; bestseller: boolean; isNewArrival: boolean };
type BranchDraft = { name: string; address: string; imageUrl: string; mapUrl: string };
type CheckoutDraft = { customerName: string; phone: string; wilaya: string; address: string; notes: string; deliveryType: DeliveryType };

/* ═══════ CONSTANTS ═══════ */
const ADMIN_CODE = "man3207";
const PRODUCTS_KEY = "hd-electric-products";
const CART_KEY = "hd-electric-cart";
const ORDERS_KEY = "hd-electric-orders";
const BRANCHES_KEY = "hd-electric-branches";
const DELIVERY_KEY = "hd-electric-delivery";
const ADMIN_KEY = "hd-electric-admin-unlocked";

const emptyProductDraft: ProductDraft = { name: "", sku: "", category: CATEGORIES[0], price: "", oldPrice: "", stock: "1", status: "متوفر", description: "", images: "", bestseller: false, isNewArrival: true };
const emptyBranchDraft: BranchDraft = { name: "", address: "", imageUrl: "", mapUrl: "" };
const initialCheckoutDraft: CheckoutDraft = { customerName: "", phone: "", wilaya: "16 - الجزائر", address: "", notes: "", deliveryType: "home" };

/* ═══════ HELPERS ═══════ */
function uid(prefix: string) { return typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readLocal<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; } }
function writeLocal<T>(key: string, value: T) { if (typeof window === "undefined") return; window.localStorage.setItem(key, JSON.stringify(value)); }
function parseImages(v: string) { return v.split(/[\n,]/).map((s) => s.trim()).filter(Boolean); }
function firstImage(p: Product) { return p.images[0] || LOGO_URL; }
function statusColor(s: StockStatus) { if (s === "متوفر") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"; if (s === "مخزون محدود") return "bg-amber-500/15 text-amber-300 border-amber-500/25"; if (s === "طلب مسبق") return "bg-sky-500/15 text-sky-300 border-sky-500/25"; return "bg-red-500/15 text-red-300 border-red-500/25"; }
function orderColor(s: OrderStatus) { if (s === "جديد") return "bg-amber-500/15 text-amber-300 border-amber-500/25"; if (s === "تم الاتصال") return "bg-sky-500/15 text-sky-300 border-sky-500/25"; if (s === "تم الشحن") return "bg-violet-500/15 text-violet-300 border-violet-500/25"; return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"; }

/* ═══════ SVG ICONS ═══════ */
const I = {
  home: (a: boolean) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  grid: (a: boolean) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  cart: (a: boolean) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  user: (a: boolean) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path d="M20 21a8 8 0 10-16 0"/></svg>,
  // category icons
  breaker: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="8" r="2"/><path d="M12 14v4"/></svg>,
  cable: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M12 2v6m0 8v6"/><path d="M8 8c0-2 1.5-3 4-3s4 1 4 3-1.5 3-4 3-4 1-4 3 1.5 3 4 3 4-1 4-3"/></svg>,
  bulb: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 014 12.7V17H8v-2.3A7 7 0 0112 2z"/></svg>,
  switchIcon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="15" cy="9" r="2"/><path d="M9 15h6"/></svg>,
  panel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7v4m4-4v4m4-4v4"/><path d="M2 14h20"/></svg>,
  tool: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z"/></svg>,
  // feature icons
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>,
  box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>,
  cartCheck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/><path d="M10 11l2 2 4-4"/></svg>,
  // general
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 6L9 17l-5-5"/></svg>,
  checkCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  cash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M1 10h2m18 0h2M1 14h2m18 0h2"/></svg>,
  map: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  note: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8m8 4H8m2-8H8"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>,
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
};

const catIcons: Record<string, React.ReactNode> = {
  "قواطع وحماية": I.breaker,
  "كابلات وأسلاك": I.cable,
  "إضاءة LED": I.bulb,
  "مفاتيح ومقابس": I.switchIcon,
  "لوحات كهربائية": I.panel,
  "أدوات وقياس": I.tool,
};

/* ═══════════════════════════════════════════ */
/*           MAIN STORE COMPONENT             */
/* ═══════════════════════════════════════════ */
export default function HDElectricStore() {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState("");
  const [detailQty, setDetailQty] = useState(1);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft>(initialCheckoutDraft);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("products");
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [branchDraft, setBranchDraft] = useState<BranchDraft>(emptyBranchDraft);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [deliveryWilaya, setDeliveryWilaya] = useState("16 - الجزائر");
  const [deliveryHomeDraft, setDeliveryHomeDraft] = useState(String(DEFAULT_DELIVERY_SETTINGS.defaultHome));
  const [deliveryOfficeDraft, setDeliveryOfficeDraft] = useState(String(DEFAULT_DELIVERY_SETTINGS.defaultOffice));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* derived */
  const categories = useMemo(() => ["الكل", ...Array.from(new Set([...CATEGORIES, ...products.map((p) => p.category)]))], [products]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => b.createdAt - a.createdAt), [products]);
  const bestsellers = useMemo(() => { const f = products.filter((p) => p.bestseller); return (f.length ? f : products).slice(0, 4); }, [products]);
  const arrivals = useMemo(() => { const n = sortedProducts.filter((p) => p.isNewArrival); return (n.length ? n : sortedProducts).slice(0, 4); }, [sortedProducts]);
  const visibleProducts = useMemo(() => { const q = search.trim().toLowerCase(); return sortedProducts.filter((p) => { const c = activeCategory === "الكل" || p.category === activeCategory; const s = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q); return c && s; }); }, [activeCategory, search, sortedProducts]);
  const selectedProduct = useMemo(() => products.find((p) => p.id === selectedProductId) ?? products[0], [products, selectedProductId]);
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const deliveryFee = useMemo(() => { const w = deliverySettings.wilayaFees[checkoutDraft.wilaya]; return checkoutDraft.deliveryType === "home" ? (w?.home ?? deliverySettings.defaultHome) : (w?.office ?? deliverySettings.defaultOffice); }, [checkoutDraft.deliveryType, checkoutDraft.wilaya, deliverySettings]);
  const cartTotal = subtotal + deliveryFee;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const showToast = useCallback((msg: string) => { setToast(msg); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2200); }, []);

  /* ── INIT: no loading screen, data loads in background ── */
  useEffect(() => {
    void bootFirebaseAnalytics();
    const unsub = onAuthStateChanged(firebaseAuth, (u) => setFbUser(u));
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (["home", "products", "cart", "checkout", "admin"].includes(hash)) setView(hash as View);
    setAdminUnlocked(readLocal(ADMIN_KEY, false));
    setCart(readLocal(CART_KEY, []));
    const lp = readLocal(PRODUCTS_KEY, DEFAULT_PRODUCTS);
    const lo = readLocal<Order[]>(ORDERS_KEY, []);
    const lb = readLocal(BRANCHES_KEY, DEFAULT_BRANCHES);
    const ld = readLocal(DELIVERY_KEY, DEFAULT_DELIVERY_SETTINGS);
    setProducts(lp.length ? lp : DEFAULT_PRODUCTS);
    setOrders(lo); setBranches(lb.length ? lb : DEFAULT_BRANCHES); setDeliverySettings(ld);

    (async () => {
      try {
        const ps = await getDocs(query(collection(firestore, "products"), orderBy("createdAt", "desc")));
        const rp = ps.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
        if (rp.length) { setProducts(rp); writeLocal(PRODUCTS_KEY, rp); }
        else if (lp.length === 0) await Promise.all(DEFAULT_PRODUCTS.map((p) => setDoc(doc(firestore, "products", p.id), p)));
        const os = await getDocs(query(collection(firestore, "orders"), orderBy("createdAt", "desc")));
        const ro = os.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
        setOrders(ro); writeLocal(ORDERS_KEY, ro);
        const bs = await getDocs(query(collection(firestore, "branches"), orderBy("createdAt", "desc")));
        const rb = bs.docs.map((d) => ({ id: d.id, ...d.data() }) as Branch);
        if (rb.length) { setBranches(rb); writeLocal(BRANCHES_KEY, rb); }
        else if (lb.length === 0) await Promise.all(DEFAULT_BRANCHES.map((b) => setDoc(doc(firestore, "branches", b.id), b)));
        const ds = await getDoc(doc(firestore, "settings", "delivery"));
        if (ds.exists()) { const rd = ds.data() as DeliverySettings; setDeliverySettings(rd); writeLocal(DELIVERY_KEY, rd); }
        else await setDoc(doc(firestore, "settings", "delivery"), DEFAULT_DELIVERY_SETTINGS);
      } catch { /* silently fallback to local */ }
    })();
    return () => unsub();
  }, []);

  useEffect(() => { const c = deliverySettings.wilayaFees[deliveryWilaya]; setDeliveryHomeDraft(String(c?.home ?? deliverySettings.defaultHome)); setDeliveryOfficeDraft(String(c?.office ?? deliverySettings.defaultOffice)); }, [deliverySettings, deliveryWilaya]);

  function nav(v: View) { setView(v); setSidebarOpen(false); if (typeof window !== "undefined") { window.history.replaceState(null, "", `#${v}`); window.scrollTo({ top: 0, behavior: "smooth" }); } }
  function openProducts(cat = "الكل") { setActiveCategory(cat); nav("products"); }
  function openProduct(p: Product) { setSelectedProductId(p.id); setDetailImage(firstImage(p)); setDetailQty(1); nav("product"); }
  function persistProducts(n: Product[]) { setProducts(n); writeLocal(PRODUCTS_KEY, n); }
  function persistOrders(n: Order[]) { setOrders(n); writeLocal(ORDERS_KEY, n); }
  function persistBranches(n: Branch[]) { setBranches(n); writeLocal(BRANCHES_KEY, n); }
  function persistCart(n: CartItem[]) { setCart(n); writeLocal(CART_KEY, n); }

  function addToCart(p: Product, qty = 1) {
    if (!isProductPurchasable(p)) return;
    const q = Math.max(1, Math.min(qty, p.stock));
    const ex = cart.find((i) => i.id === p.id);
    persistCart(ex ? cart.map((i) => i.id === p.id ? { ...i, quantity: Math.min(p.stock, i.quantity + q) } : i) : [...cart, { id: p.id, name: p.name, price: p.price, image: firstImage(p), stock: p.stock, status: p.status, quantity: q }]);
    setCheckoutSuccess(null);
    showToast(p.name);
  }
  function updateCartQty(id: string, qty: number) { persistCart(cart.map((i) => i.id === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i)); }
  function removeFromCart(id: string) { persistCart(cart.filter((i) => i.id !== id)); }

  async function submitCheckout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!cart.length) return; const now = Date.now();
    const order: Order = { id: uid("order"), customerName: checkoutDraft.customerName.trim(), phone: checkoutDraft.phone.trim(), wilaya: checkoutDraft.wilaya, address: checkoutDraft.address.trim(), notes: checkoutDraft.notes.trim(), deliveryType: checkoutDraft.deliveryType, deliveryFee, paymentMethod: "الدفع عند الاستلام", items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })), subtotal, total: cartTotal, status: "جديد", createdAt: now, updatedAt: now };
    persistOrders([order, ...orders]);
    try { await setDoc(doc(firestore, "orders", order.id), order); } catch { /* local */ }
    persistCart([]); setCheckoutDraft(initialCheckoutDraft); setCheckoutSuccess(order.id);
  }

  async function unlockAdmin(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (adminCode.trim() !== ADMIN_CODE) { setAdminError("الكود غير صحيح"); return; } setAdminUnlocked(true); setAdminError(""); writeLocal(ADMIN_KEY, true); try { await signInAnonymously(firebaseAuth); } catch { /* */ } }
  async function lockAdmin() { setAdminUnlocked(false); writeLocal(ADMIN_KEY, false); try { await signOut(firebaseAuth); } catch { /* */ } }

  function editProduct(p: Product) { setEditingProductId(p.id); setProductDraft({ name: p.name, sku: p.sku, category: p.category, price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : "", stock: String(p.stock), status: p.status, description: p.description, images: p.images.join("\n"), bestseller: p.bestseller, isNewArrival: p.isNewArrival }); setAdminTab("products"); }
  async function saveProduct(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const now = Date.now(); const ex = products.find((p) => p.id === editingProductId); const imgs = parseImages(productDraft.images); const p: Product = { id: editingProductId ?? uid("product"), name: productDraft.name.trim(), sku: productDraft.sku.trim() || `HD-${now}`, category: productDraft.category.trim() || CATEGORIES[0], price: Number(productDraft.price) || 0, oldPrice: productDraft.oldPrice ? Number(productDraft.oldPrice) : undefined, stock: Math.max(0, Number(productDraft.stock) || 0), status: productDraft.status, description: productDraft.description.trim(), images: imgs.length ? imgs : [LOGO_URL], bestseller: productDraft.bestseller, isNewArrival: productDraft.isNewArrival, createdAt: ex?.createdAt ?? now, updatedAt: now }; persistProducts(editingProductId ? products.map((i) => i.id === editingProductId ? p : i) : [p, ...products]); setProductDraft(emptyProductDraft); setEditingProductId(null); try { await setDoc(doc(firestore, "products", p.id), p, { merge: true }); } catch { /* */ } }
  async function deleteProduct(id: string) { persistProducts(products.filter((p) => p.id !== id)); try { await deleteDoc(doc(firestore, "products", id)); } catch { /* */ } }
  async function updateOrderStatus(id: string, s: OrderStatus) { const now = Date.now(); persistOrders(orders.map((o) => o.id === id ? { ...o, status: s, updatedAt: now } : o)); try { await updateDoc(doc(firestore, "orders", id), { status: s, updatedAt: now }); } catch { /* */ } }
  function editBranch(b: Branch) { setEditingBranchId(b.id); setBranchDraft({ name: b.name, address: b.address, imageUrl: b.imageUrl, mapUrl: b.mapUrl }); }
  async function saveBranch(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const now = Date.now(); const ex = branches.find((b) => b.id === editingBranchId); const b: Branch = { id: editingBranchId ?? uid("branch"), name: branchDraft.name.trim(), address: branchDraft.address.trim(), imageUrl: branchDraft.imageUrl.trim() || LOGO_URL, mapUrl: branchDraft.mapUrl.trim() || "https://maps.google.com/?q=Algeria", createdAt: ex?.createdAt ?? now, updatedAt: now }; persistBranches(editingBranchId ? branches.map((i) => i.id === editingBranchId ? b : i) : [b, ...branches]); setBranchDraft(emptyBranchDraft); setEditingBranchId(null); try { await setDoc(doc(firestore, "branches", b.id), b, { merge: true }); } catch { /* */ } }
  async function deleteBranch(id: string) { persistBranches(branches.filter((b) => b.id !== id)); try { await deleteDoc(doc(firestore, "branches", id)); } catch { /* */ } }
  async function saveDeliverySettings(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const ns: DeliverySettings = { ...deliverySettings, defaultHome: Number(deliverySettings.defaultHome) || DEFAULT_DELIVERY_SETTINGS.defaultHome, defaultOffice: Number(deliverySettings.defaultOffice) || DEFAULT_DELIVERY_SETTINGS.defaultOffice, wilayaFees: { ...deliverySettings.wilayaFees, [deliveryWilaya]: { home: Number(deliveryHomeDraft) || deliverySettings.defaultHome, office: Number(deliveryOfficeDraft) || deliverySettings.defaultOffice } }, updatedAt: Date.now() }; setDeliverySettings(ns); writeLocal(DELIVERY_KEY, ns); try { await setDoc(doc(firestore, "settings", "delivery"), ns, { merge: true }); } catch { /* */ } }

  /* ══════════════════════ RENDER ══════════════════════ */
  const bNav: { label: string; view: View; icon: (a: boolean) => React.ReactNode }[] = [
    { label: "الرئيسية", view: "home", icon: I.home },
    { label: "المنتجات", view: "products", icon: I.grid },
    { label: "السلة", view: "cart", icon: I.cart },
    { label: "حسابي", view: "admin", icon: I.user },
  ];

  return (
    <div className="store-root" dir="rtl">
      <div className="pointer-events-none fixed inset-0 z-0"><div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(255,193,7,0.07),transparent_60%)]" /></div>

      {/* TOAST */}
      <div className={`toast-container ${toast ? "toast-visible" : ""}`}>
        <div className="toast-inner"><span className="text-[#FFC107]">{I.check}</span><span>{toast}</span></div>
      </div>

      {/* HEADER */}
      <header className="header-bar">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
          <button type="button" onClick={() => nav("home")} className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="HD ELECTRIC DZ" className="h-8 w-8 rounded-lg object-contain sm:h-9 sm:w-9 sm:rounded-xl" />
            <span className="text-sm font-black tracking-tight text-white sm:text-base">HD ELECTRIC <span className="text-[#FFC107]">DZ</span></span>
          </button>
          <nav className="hidden items-center gap-0.5 md:flex">
            {([["الرئيسية","home"],["المنتجات","products"],["السلة","cart"],["إتمام الطلب","checkout"],["الإدارة","admin"]] as [string,View][]).map(([l,v]) => (
              <button key={v} type="button" onClick={() => nav(v)} className={`nav-link ${view === v ? "nav-link-active" : ""}`}>
                {l}{v === "cart" && cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={`tel:${PHONE.replaceAll(" ", "")}`} className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 sm:flex"><span className="text-[#FFC107]">{I.phone}</span>{PHONE}</a>
            <button type="button" onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white md:hidden" aria-label="القائمة">{I.menu}</button>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      {sidebarOpen && <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar-mobile ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2"><img src={LOGO_URL} alt="" className="h-9 w-9 rounded-lg object-contain" /><span className="font-black text-white">HD ELECTRIC DZ</span></div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">{I.close}</button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {([["الرئيسية","home"],["المنتجات","products"],["السلة","cart"],["إتمام الطلب","checkout"],["الإدارة","admin"]] as [string,View][]).map(([l,v]) => (
            <button key={v} type="button" onClick={() => nav(v)} className={`sidebar-link ${view === v ? "sidebar-link-active" : ""}`}>{l}{v === "cart" && cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}</button>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          <a href={`tel:${PHONE.replaceAll(" ", "")}`} className="flex items-center gap-2 font-bold text-white"><span className="text-[#FFC107]">{I.phone}</span>{PHONE}</a>
          <a href={`mailto:${EMAIL}`} className="mt-2 flex items-center gap-2 text-sm text-[#777]"><span className="text-[#555]">{I.mail}</span>{EMAIL}</a>
        </div>
      </aside>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {bNav.map((item) => (
          <button key={item.view} type="button" onClick={() => nav(item.view)} className={`bottom-nav-btn ${view === item.view ? "bottom-nav-active" : ""}`}>
            <span className="relative">{item.icon(view === item.view)}{item.view === "cart" && cartCount > 0 ? <span className="absolute -right-2.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFC107] text-[10px] font-black text-black">{cartCount}</span> : null}</span>
            <span className="mt-0.5 text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MAIN */}
      <main className="relative z-10 pt-14 pb-20 sm:pt-16 md:pb-0">
        {view === "home" && <HomeView products={products} bestsellers={bestsellers} arrivals={arrivals} branches={branches} onOpenProducts={openProducts} onOpenProduct={openProduct} onAddToCart={addToCart} onContact={() => nav("checkout")} />}
        {view === "products" && <ProductsView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} search={search} setSearch={setSearch} products={visibleProducts} onOpenProduct={openProduct} onAddToCart={addToCart} />}
        {view === "product" && selectedProduct && <ProductDetailView product={selectedProduct} detailImage={detailImage || firstImage(selectedProduct)} setDetailImage={setDetailImage} detailQty={detailQty} setDetailQty={setDetailQty} onAddToCart={addToCart} onBuyNow={(p, q) => { addToCart(p, q); nav("checkout"); }} onBack={() => nav("products")} />}
        {view === "cart" && <CartView cart={cart} subtotal={subtotal} deliveryPreview={deliveryFee} total={cartTotal} updateCartQty={updateCartQty} removeFromCart={removeFromCart} onCheckout={() => nav("checkout")} onProducts={() => openProducts("الكل")} />}
        {view === "checkout" && <CheckoutView cart={cart} draft={checkoutDraft} setDraft={setCheckoutDraft} deliveryFee={deliveryFee} subtotal={subtotal} total={cartTotal} successId={checkoutSuccess} onSubmit={submitCheckout} onProducts={() => openProducts("الكل")} />}
        {view === "admin" && <AdminView unlocked={adminUnlocked} adminCode={adminCode} setAdminCode={setAdminCode} adminError={adminError} unlockAdmin={unlockAdmin} lockAdmin={lockAdmin} fbUser={fbUser} tab={adminTab} setTab={setAdminTab} products={products} productDraft={productDraft} setProductDraft={setProductDraft} editingProductId={editingProductId} cancelProductEdit={() => { setEditingProductId(null); setProductDraft(emptyProductDraft); }} saveProduct={saveProduct} editProduct={editProduct} deleteProduct={deleteProduct} orders={orders} updateOrderStatus={updateOrderStatus} deliverySettings={deliverySettings} setDeliverySettings={setDeliverySettings} deliveryWilaya={deliveryWilaya} setDeliveryWilaya={setDeliveryWilaya} deliveryHomeDraft={deliveryHomeDraft} setDeliveryHomeDraft={setDeliveryHomeDraft} deliveryOfficeDraft={deliveryOfficeDraft} setDeliveryOfficeDraft={setDeliveryOfficeDraft} saveDeliverySettings={saveDeliverySettings} branches={branches} branchDraft={branchDraft} setBranchDraft={setBranchDraft} editingBranchId={editingBranchId} saveBranch={saveBranch} editBranch={editBranch} deleteBranch={deleteBranch} cancelBranchEdit={() => { setEditingBranchId(null); setBranchDraft(emptyBranchDraft); }} />}
      </main>
    </div>
  );
}

/* ═══════════════ LAYOUT HELPERS ═══════════════ */
function Sec({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</section>; }
function Head({ tag, title }: { tag: string; title: string }) { return <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FFC107]/80">{tag}</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-4xl">{title}</h2></div>; }

/* ═══════════════ HOME ═══════════════ */
function HomeView({ products, bestsellers, arrivals, branches, onOpenProducts, onOpenProduct, onAddToCart, onContact }: { products: Product[]; bestsellers: Product[]; arrivals: Product[]; branches: Branch[]; onOpenProducts: (c?: string) => void; onOpenProduct: (p: Product) => void; onAddToCart: (p: Product) => void; onContact: () => void }) {
  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[80vh] items-center overflow-hidden sm:min-h-[88vh]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#FFC107]/[0.05] blur-[100px]" />
        <Sec className="relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFC107] shadow-[0_0_8px_#FFC107]" />
              معدات كهربائية موثوقة في الجزائر
            </div>
            <h1 className="animate-fade-up mt-8 text-[clamp(2.2rem,8vw,4.8rem)] font-black leading-[0.92] tracking-[-0.04em] text-white [animation-delay:80ms]">
              كل ما تحتاجه<br /><span className="bg-gradient-to-l from-[#FFC107] to-[#FFD54F] bg-clip-text text-transparent">في مكان واحد</span>
            </h1>
            <p className="animate-fade-up mx-auto mt-6 max-w-lg text-base leading-7 text-[#777] sm:text-lg [animation-delay:160ms]">قواطع، كابلات، إضاءة LED، لوحات كهربائية، وأدوات قياس — بأسعار تنافسية وتوصيل لكل الولايات.</p>
            <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:240ms]">
              <button type="button" onClick={() => onOpenProducts("الكل")} className="premium-button w-full sm:w-auto">تصفح المنتجات</button>
              <button type="button" onClick={onContact} className="secondary-button w-full sm:w-auto">تواصل معنا</button>
            </div>
          </div>
          <div className="animate-fade-up mx-auto mt-14 max-w-2xl [animation-delay:320ms]">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {products.slice(0, 4).map((p) => (
                <button key={p.id} type="button" onClick={() => onOpenProduct(p)} className="group flex min-w-[200px] flex-shrink-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 transition hover:border-white/15 hover:bg-white/[0.05] sm:min-w-[240px]">
                  <img src={firstImage(p)} alt={p.name} className="h-14 w-14 rounded-lg object-cover transition duration-500 group-hover:scale-105 sm:h-16 sm:w-16" />
                  <span className="min-w-0 text-right"><span className="block truncate text-sm font-bold text-white">{p.name}</span><span className="mt-0.5 block text-xs text-[#666]">{p.category}</span><span className="mt-0.5 block text-sm font-black text-[#FFC107]">{formatDzd(p.price)}</span></span>
                </button>
              ))}
            </div>
          </div>
        </Sec>
      </section>

      {/* STATS */}
      <Sec className="py-4 sm:py-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ["+500", "منتج كهربائي", I.bolt],
            ["48h", "تأكيد سريع", I.truck],
            ["COD", "الدفع عند الاستلام", I.cash],
          ].map(([val, label, icon]) => (
            <div key={val as string} className="flex flex-col items-center rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center sm:p-5">
              <span className="text-[#FFC107]/60">{icon as React.ReactNode}</span>
              <p className="mt-2 text-xl font-black text-white sm:text-2xl">{val as string}</p>
              <p className="mt-1 text-[10px] text-[#555] sm:text-xs">{label as string}</p>
            </div>
          ))}
        </div>
      </Sec>

      {/* CATEGORIES */}
      <Sec className="py-10 sm:py-14">
        <Head tag="الأقسام" title="تصفح حسب النوع" />
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" onClick={() => onOpenProducts(cat)} className="group flex flex-col items-center rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:-translate-y-1 hover:border-[#FFC107]/20 hover:bg-[#FFC107]/[0.03] sm:p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFC107]/10 text-[#FFC107] transition group-hover:scale-110">{catIcons[cat] || I.bolt}</span>
              <span className="mt-3 text-center text-xs font-bold text-white sm:text-sm">{cat}</span>
            </button>
          ))}
        </div>
      </Sec>

      <PStrip tag="الأكثر مبيعًا" title="المنتجات المفضلة" products={bestsellers} onOpenProduct={onOpenProduct} onAddToCart={onAddToCart} />
      <PStrip tag="وصل حديثًا" title="أحدث الإضافات" products={arrivals} onOpenProduct={onOpenProduct} onAddToCart={onAddToCart} />

      {/* WHY US */}
      <Sec className="py-10 sm:py-14">
        <Head tag="لماذا نحن؟" title="ثقة وسرعة وبساطة" />
        <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[
            [I.bolt, "واجهة سريعة", "الوصول لأي منتج خلال ثوانٍ"],
            [I.save, "سلة محفوظة", "لا تضيع بعد إغلاق المتصفح"],
            [I.box, "مخزون واضح", "حالة التوفر ظاهرة دائمًا"],
            [I.cartCheck, "بدون حساب", "اطلب مباشرة بالدفع عند الاستلام"],
          ].map(([icon, title, desc]) => (
            <div key={title as string} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 sm:p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFC107]/10 text-[#FFC107]">{icon as React.ReactNode}</span>
              <h3 className="mt-3 text-sm font-black text-white sm:text-base">{title as string}</h3>
              <p className="mt-1.5 text-xs leading-5 text-[#555] sm:text-sm sm:leading-6">{desc as string}</p>
            </div>
          ))}
        </div>
      </Sec>

      <Ftr branches={branches} />
    </>
  );
}

/* ═══════ PRODUCT STRIP ═══════ */
function PStrip({ tag, title, products, onOpenProduct, onAddToCart }: { tag: string; title: string; products: Product[]; onOpenProduct: (p: Product) => void; onAddToCart: (p: Product) => void }) {
  return <Sec className="py-10 sm:py-14"><Head tag={tag} title={title} /><div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{products.map((p) => <PCard key={p.id} product={p} onOpenProduct={onOpenProduct} onAddToCart={onAddToCart} />)}</div></Sec>;
}

/* ═══════ PRODUCT CARD ═══════ */
function PCard({ product: p, onOpenProduct, onAddToCart }: { product: Product; onOpenProduct: (p: Product) => void; onAddToCart: (p: Product) => void }) {
  const ok = isProductPurchasable(p);
  return (
    <article className="card group">
      <button type="button" onClick={() => onOpenProduct(p)} className="block w-full text-right">
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[#131313]">
          <img src={firstImage(p)} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className={`absolute right-2 top-2 rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusColor(p.status)}`}>{p.status}</span>
          {p.oldPrice ? <span className="absolute left-2 top-2 rounded-md bg-red-500/90 px-1.5 py-0.5 text-[10px] font-black text-white">تخفيض</span> : null}
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-[10px] font-bold text-[#FFC107]/60 sm:text-xs">{p.category}</p>
          <h3 className="mt-1 line-clamp-2 min-h-[2.4rem] text-sm font-bold leading-5 text-white sm:text-base sm:leading-6">{p.name}</h3>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-base font-black text-white sm:text-lg">{formatDzd(p.price)}</span>{p.oldPrice ? <span className="text-xs text-[#555] line-through">{formatDzd(p.oldPrice)}</span> : null}</div>
        </div>
      </button>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4"><button type="button" disabled={!ok} onClick={() => onAddToCart(p)} className="btn-add-cart">{ok ? "أضف للسلة" : "غير متوفر"}</button></div>
    </article>
  );
}

/* ═══════ PRODUCTS VIEW ═══════ */
function ProductsView({ categories, activeCategory, setActiveCategory, search, setSearch, products, onOpenProduct, onAddToCart }: { categories: string[]; activeCategory: string; setActiveCategory: (v: string) => void; search: string; setSearch: (v: string) => void; products: Product[]; onOpenProduct: (p: Product) => void; onAddToCart: (p: Product) => void }) {
  return (
    <Sec className="min-h-screen py-6 sm:py-10">
      <Head tag="المنتجات" title="تصفح الكل" />
      <div className="mt-5 space-y-3"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن منتج..." className="field-input" />
        <div className="flex flex-wrap gap-1.5">{categories.map((c) => <button key={c} type="button" onClick={() => setActiveCategory(c)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${c === activeCategory ? "bg-[#FFC107]/12 text-[#FFC107] border border-[#FFC107]/20" : "border border-white/[0.05] bg-white/[0.02] text-[#666] hover:text-white"}`}>{c}</button>)}</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">{products.map((p) => <PCard key={p.id} product={p} onOpenProduct={onOpenProduct} onAddToCart={onAddToCart} />)}</div>
      {!products.length && <p className="mt-6 rounded-xl border border-white/[0.05] bg-white/[0.02] p-6 text-center text-sm text-[#555]">لا توجد منتجات مطابقة.</p>}
    </Sec>
  );
}

/* ═══════ PRODUCT DETAIL ═══════ */
function ProductDetailView({ product: p, detailImage, setDetailImage, detailQty, setDetailQty, onAddToCart, onBuyNow, onBack }: { product: Product; detailImage: string; setDetailImage: (v: string) => void; detailQty: number; setDetailQty: (v: number) => void; onAddToCart: (p: Product, q: number) => void; onBuyNow: (p: Product, q: number) => void; onBack: () => void }) {
  const ok = isProductPurchasable(p);
  return (
    <Sec className="min-h-screen py-6 sm:py-10">
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm font-bold text-[#FFC107] hover:text-[#FFD54F]">{I.arrowRight}<span>العودة</span></button>
      <div className="grid gap-6 lg:grid-cols-2">
        <div><div className="aspect-square overflow-hidden rounded-xl border border-white/[0.05] bg-[#131313]"><img src={detailImage} alt={p.name} className="h-full w-full object-cover" /></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{p.images.map((img) => <button key={img} type="button" onClick={() => setDetailImage(img)} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16 ${detailImage === img ? "border-[#FFC107]/50 ring-1 ring-[#FFC107]/20" : "border-white/[0.05] hover:border-white/15"}`}><img src={img} alt={p.name} className="h-full w-full object-cover" /></button>)}</div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5"><span className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 text-xs text-[#666]">{p.category}</span><span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${statusColor(p.status)}`}>{p.status}</span></div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{p.name}</h1>
          <div className="flex items-baseline gap-3"><span className="text-3xl font-black text-[#FFC107] sm:text-4xl">{formatDzd(p.price)}</span>{p.oldPrice ? <span className="text-lg text-[#555] line-through">{formatDzd(p.oldPrice)}</span> : null}</div>
          <p className="leading-7 text-[#777]">{p.description}</p>
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"><span className="text-sm font-bold text-white">المخزون: </span><span className="text-sm text-[#777]">{p.stock} قطعة — {p.status}</span></div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
            <div className="flex items-center rounded-lg border border-white/[0.05] bg-white/[0.02] px-1"><button type="button" onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="grid h-10 w-10 place-items-center text-lg text-white hover:text-[#FFC107]">−</button><span className="w-8 text-center font-bold text-white">{detailQty}</span><button type="button" onClick={() => setDetailQty(Math.min(p.stock, detailQty + 1))} className="grid h-10 w-10 place-items-center text-lg text-white hover:text-[#FFC107]">+</button></div>
            <button type="button" disabled={!ok} onClick={() => onAddToCart(p, detailQty)} className="secondary-button disabled:opacity-40">أضف للسلة</button>
            <button type="button" disabled={!ok} onClick={() => onBuyNow(p, detailQty)} className="premium-button disabled:opacity-40">شراء الآن</button>
          </div>
        </div>
      </div>
    </Sec>
  );
}

/* ═══════ CART ═══════ */
function CartView({ cart, subtotal, deliveryPreview, total, updateCartQty, removeFromCart, onCheckout, onProducts }: { cart: CartItem[]; subtotal: number; deliveryPreview: number; total: number; updateCartQty: (id: string, q: number) => void; removeFromCart: (id: string) => void; onCheckout: () => void; onProducts: () => void }) {
  return (
    <Sec className="min-h-screen py-6 sm:py-10">
      <Head tag="السلة" title="منتجاتك المختارة" />
      {!cart.length ? (
        <div className="mt-8 rounded-xl border border-white/[0.05] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto w-fit text-[#333]">{I.cart(false)}</div>
          <p className="mt-4 text-lg font-bold text-white">السلة فارغة</p>
          <p className="mt-1 text-sm text-[#555]">ابدأ بتصفح المنتجات</p>
          <button type="button" onClick={onProducts} className="premium-button mt-6">تصفح المنتجات</button>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2.5">{cart.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <img src={item.image} alt={item.name} className="h-18 w-18 flex-shrink-0 rounded-lg object-cover sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
                <p className="mt-0.5 text-sm font-bold text-[#FFC107]">{formatDzd(item.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-md border border-white/[0.05] bg-[#0A0A0A]"><button type="button" onClick={() => updateCartQty(item.id, item.quantity - 1)} className="grid h-7 w-7 place-items-center text-sm text-white hover:text-[#FFC107]">−</button><span className="w-5 text-center text-xs font-bold text-white">{item.quantity}</span><button type="button" onClick={() => updateCartQty(item.id, item.quantity + 1)} className="grid h-7 w-7 place-items-center text-sm text-white hover:text-[#FFC107]">+</button></div>
                  <button type="button" onClick={() => removeFromCart(item.id)} className="mr-auto rounded-md border border-red-500/15 bg-red-500/8 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/15">حذف</button>
                </div>
              </div>
            </div>
          ))}</div>
          <SumCard subtotal={subtotal} delivery={deliveryPreview} total={total} label="متابعة الطلب" action={onCheckout} />
        </div>
      )}
    </Sec>
  );
}

function SumCard({ subtotal, delivery, total, label, action }: { subtotal: number; delivery: number; total: number; label: string; action: () => void }) {
  return (
    <aside className="h-fit rounded-xl border border-[#FFC107]/12 bg-white/[0.02] p-5">
      <h3 className="text-base font-black text-white">ملخص الطلب</h3>
      <div className="mt-4 space-y-2 text-sm text-[#666]">
        <p className="flex justify-between"><span>المجموع الفرعي</span><span className="text-white">{formatDzd(subtotal)}</span></p>
        <p className="flex justify-between"><span>التوصيل</span><span className="text-white">{formatDzd(delivery)}</span></p>
        <div className="h-px bg-white/[0.05]" />
        <p className="flex justify-between text-base font-black text-white"><span>الإجمالي</span><span className="text-[#FFC107]">{formatDzd(total)}</span></p>
      </div>
      <button type="button" onClick={action} className="premium-button mt-5 w-full">{label}</button>
    </aside>
  );
}

/* ═══════ CHECKOUT ═══════ */
function CheckoutView({ cart, draft, setDraft, deliveryFee, subtotal, total, successId, onSubmit, onProducts }: { cart: CartItem[]; draft: CheckoutDraft; setDraft: (d: CheckoutDraft) => void; deliveryFee: number; subtotal: number; total: number; successId: string | null; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onProducts: () => void }) {
  if (successId) return (
    <Sec className="flex min-h-screen items-center justify-center py-8">
      <div className="w-full max-w-md rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-8 text-center">
        <div className="mx-auto w-fit text-emerald-400">{I.checkCircle}</div>
        <h2 className="mt-4 text-2xl font-black text-white">تم إرسال الطلب</h2>
        <p className="mt-2 text-sm text-[#777]">سيتم الاتصال بك لتأكيد التفاصيل</p>
        <p className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-emerald-300 break-all">{successId}</p>
        <button type="button" onClick={onProducts} className="premium-button mt-6">العودة للمنتجات</button>
      </div>
    </Sec>
  );
  return (
    <Sec className="min-h-screen py-6 sm:py-10">
      <Head tag="إتمام الطلب" title="أكمل طلبك" />
      {!cart.length ? (
        <div className="mt-6 rounded-xl border border-white/[0.05] bg-white/[0.02] p-8 text-center"><p className="font-bold text-white">لا توجد منتجات</p><button type="button" onClick={onProducts} className="premium-button mt-4">اختر المنتجات</button></div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 sm:p-5">
            <FI label="الاسم الكامل" required value={draft.customerName} onChange={(v) => setDraft({ ...draft, customerName: v })} />
            <FI label="رقم الهاتف" required type="tel" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <FS label="الولاية" value={draft.wilaya} onChange={(v) => setDraft({ ...draft, wilaya: v })} options={WILAYAS.map((w) => ({ v: w, l: w }))} />
            <FI label="العنوان" required value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
            <FS label="نوع التوصيل" value={draft.deliveryType} onChange={(v) => setDraft({ ...draft, deliveryType: v as DeliveryType })} options={[{ v: "home", l: "توصيل للمنزل" }, { v: "office", l: "توصيل للمكتب" }]} />
            <label className="grid gap-1.5 text-sm font-bold text-white">ملاحظات<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="field-input min-h-20 resize-y" placeholder="ملاحظات إضافية (اختياري)" /></label>
            <div className="flex items-center gap-2 rounded-lg border border-[#FFC107]/15 bg-[#FFC107]/5 p-3 text-sm text-[#FFC107]"><span>{I.cash}</span>الدفع عند الاستلام فقط</div>
            <button type="submit" className="premium-button">تأكيد الطلب</button>
          </form>
          <SumCard subtotal={subtotal} delivery={deliveryFee} total={total} label="تأكيد الطلب" action={() => undefined} />
        </div>
      )}
    </Sec>
  );
}

function FI({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) { return <label className="grid gap-1.5 text-sm font-bold text-white">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field-input" /></label>; }
function FS({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) { return <label className="grid gap-1.5 text-sm font-bold text-white">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="field-input">{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>; }

/* ═══════ ADMIN ═══════ */
function AdminView(props: { unlocked: boolean; adminCode: string; setAdminCode: (v: string) => void; adminError: string; unlockAdmin: (e: FormEvent<HTMLFormElement>) => void; lockAdmin: () => void; fbUser: User | null; tab: AdminTab; setTab: (t: AdminTab) => void; products: Product[]; productDraft: ProductDraft; setProductDraft: (d: ProductDraft) => void; editingProductId: string | null; cancelProductEdit: () => void; saveProduct: (e: FormEvent<HTMLFormElement>) => void; editProduct: (p: Product) => void; deleteProduct: (id: string) => void; orders: Order[]; updateOrderStatus: (id: string, s: OrderStatus) => void; deliverySettings: DeliverySettings; setDeliverySettings: (s: DeliverySettings) => void; deliveryWilaya: string; setDeliveryWilaya: (v: string) => void; deliveryHomeDraft: string; setDeliveryHomeDraft: (v: string) => void; deliveryOfficeDraft: string; setDeliveryOfficeDraft: (v: string) => void; saveDeliverySettings: (e: FormEvent<HTMLFormElement>) => void; branches: Branch[]; branchDraft: BranchDraft; setBranchDraft: (d: BranchDraft) => void; editingBranchId: string | null; saveBranch: (e: FormEvent<HTMLFormElement>) => void; editBranch: (b: Branch) => void; deleteBranch: (id: string) => void; cancelBranchEdit: () => void }) {
  if (!props.unlocked) return (
    <Sec className="flex min-h-screen items-center justify-center py-8">
      <form onSubmit={props.unlockAdmin} className="w-full max-w-sm rounded-xl border border-white/[0.05] bg-white/[0.02] p-6 text-center">
        <img src={LOGO_URL} alt="" className="mx-auto h-14 w-14 rounded-xl object-contain" />
        <h2 className="mt-4 text-lg font-black text-white">لوحة الإدارة</h2>
        <p className="mt-1 text-sm text-[#555]">أدخل كود الإدارة</p>
        <input type="password" value={props.adminCode} onChange={(e) => props.setAdminCode(e.target.value)} className="field-input mt-4 text-center tracking-[0.3em]" placeholder="•••••••" />
        {props.adminError && <p className="mt-2 text-sm text-red-400">{props.adminError}</p>}
        <button type="submit" className="premium-button mt-4 w-full">دخول</button>
      </form>
    </Sec>
  );

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "products", label: "المنتجات", icon: I.box },
    { id: "orders", label: "الطلبات", icon: I.clipboard },
    { id: "delivery", label: "التوصيل", icon: I.truck },
    { id: "branches", label: "الفروع", icon: I.pin },
  ];

  return (
    <Sec className="min-h-screen py-6 sm:py-10">
      <div className="flex items-center justify-between"><Head tag="لوحة الإدارة" title="تحكم كامل" /><button type="button" onClick={props.lockAdmin} className="rounded-lg border border-white/[0.05] px-3 py-1.5 text-xs font-bold text-[#666] hover:text-white">خروج</button></div>
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">{tabs.map((t) => <button key={t.id} type="button" onClick={() => props.setTab(t.id)} className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${props.tab === t.id ? "bg-[#FFC107]/12 text-[#FFC107] border border-[#FFC107]/20" : "border border-white/[0.05] bg-white/[0.02] text-[#666] hover:text-white"}`}><span className="text-current">{t.icon}</span>{t.label}</button>)}</div>
      <div className="mt-5">
        {props.tab === "products" && <AProds {...props} />}
        {props.tab === "orders" && <AOrd orders={props.orders} updateOrderStatus={props.updateOrderStatus} />}
        {props.tab === "delivery" && <ADel {...props} />}
        {props.tab === "branches" && <ABr {...props} />}
      </div>
    </Sec>
  );
}

function AProds(props: Parameters<typeof AdminView>[0]) {
  const d = props.productDraft;
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={props.saveProduct} className="h-fit space-y-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
        <h3 className="text-base font-black text-white">{props.editingProductId ? "تعديل منتج" : "إضافة منتج"}</h3>
        <div className="flex items-start gap-2 rounded-lg border border-[#FFC107]/15 bg-[#FFC107]/5 p-3 text-xs leading-5 text-[#FFC107]/70"><span className="mt-0.5 flex-shrink-0 text-[#FFC107]">{I.info}</span>ارفع الصور على catbox.moe ثم انسخ الرابط المباشر هنا</div>
        <FI label="اسم المنتج" required value={d.name} onChange={(v) => props.setProductDraft({ ...d, name: v })} />
        <FI label="SKU" value={d.sku} onChange={(v) => props.setProductDraft({ ...d, sku: v })} />
        <label className="grid gap-1.5 text-sm font-bold text-white">القسم<input value={d.category} onChange={(e) => props.setProductDraft({ ...d, category: e.target.value })} className="field-input" list="cats" /><datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
        <div className="grid grid-cols-2 gap-2"><FI label="السعر" required type="number" value={d.price} onChange={(v) => props.setProductDraft({ ...d, price: v })} /><FI label="سعر قديم" type="number" value={d.oldPrice} onChange={(v) => props.setProductDraft({ ...d, oldPrice: v })} /></div>
        <div className="grid grid-cols-2 gap-2"><FI label="المخزون" required type="number" value={d.stock} onChange={(v) => props.setProductDraft({ ...d, stock: v })} /><FS label="الحالة" value={d.status} onChange={(v) => props.setProductDraft({ ...d, status: v as StockStatus })} options={[{ v: "متوفر", l: "متوفر" }, { v: "مخزون محدود", l: "مخزون محدود" }, { v: "نفذ المخزون", l: "نفذ المخزون" }, { v: "طلب مسبق", l: "طلب مسبق" }]} /></div>
        <label className="grid gap-1.5 text-sm font-bold text-white">الوصف<textarea value={d.description} onChange={(e) => props.setProductDraft({ ...d, description: e.target.value })} className="field-input min-h-20 resize-y" /></label>
        <label className="grid gap-1.5 text-sm font-bold text-white">روابط الصور<textarea value={d.images} onChange={(e) => props.setProductDraft({ ...d, images: e.target.value })} className="field-input min-h-20 resize-y" placeholder="رابط في كل سطر" /></label>
        <div className="flex gap-4 text-sm text-[#666]"><label className="flex items-center gap-2"><input type="checkbox" checked={d.bestseller} onChange={(e) => props.setProductDraft({ ...d, bestseller: e.target.checked })} className="accent-[#FFC107]" />الأكثر مبيعًا</label><label className="flex items-center gap-2"><input type="checkbox" checked={d.isNewArrival} onChange={(e) => props.setProductDraft({ ...d, isNewArrival: e.target.checked })} className="accent-[#FFC107]" />جديد</label></div>
        <button type="submit" className="premium-button w-full">{props.editingProductId ? "حفظ التعديل" : "إضافة المنتج"}</button>
        {props.editingProductId && <button type="button" onClick={props.cancelProductEdit} className="secondary-button w-full">إلغاء</button>}
      </form>
      <div className="space-y-2">{props.products.map((p) => (
        <div key={p.id} className="flex gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 sm:items-center">
          <img src={firstImage(p)} alt={p.name} className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1"><p className="text-[10px] text-[#FFC107]/60">{p.category} · {p.sku}</p><h4 className="truncate text-sm font-bold text-white">{p.name}</h4><p className="text-xs text-[#555]">{formatDzd(p.price)} · مخزون {p.stock}</p></div>
          <div className="flex flex-shrink-0 gap-1.5"><button type="button" onClick={() => props.editProduct(p)} className="rounded-md border border-white/[0.05] px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10">تعديل</button><button type="button" onClick={() => props.deleteProduct(p.id)} className="rounded-md border border-red-500/15 bg-red-500/8 px-2 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/15">حذف</button></div>
        </div>
      ))}</div>
    </div>
  );
}

function AOrd({ orders, updateOrderStatus }: { orders: Order[]; updateOrderStatus: (id: string, s: OrderStatus) => void }) {
  const sts: OrderStatus[] = ["جديد", "تم الاتصال", "تم الشحن", "تم التسليم"];
  return (
    <div className="space-y-2.5">
      {!orders.length && <p className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-6 text-center text-sm text-[#555]">لا توجد طلبات بعد.</p>}
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] text-[#555]">{new Date(o.createdAt).toLocaleString("ar-DZ")} · {o.id.slice(0, 18)}...</p>
              <h3 className="mt-1 text-base font-black text-white">{o.customerName}</h3>
              <p className="mt-0.5 text-sm text-[#666]">{o.phone} · {o.wilaya} · {o.deliveryType === "home" ? "منزل" : "مكتب"}</p>
              <p className="text-sm text-[#666]">{o.address}</p>
              {o.notes && <p className="mt-1 flex items-center gap-1 text-xs text-[#FFC107]"><span className="text-[#FFC107]/60">{I.note}</span>{o.notes}</p>}
            </div>
            <div className="flex-shrink-0 space-y-2"><span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${orderColor(o.status)}`}>{o.status}</span><select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)} className="field-input text-sm">{sts.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{o.items.map((item) => <div key={`${o.id}-${item.id}`} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[#0A0A0A] p-2"><img src={item.image} alt={item.name} className="h-9 w-9 rounded-md object-cover" /><span className="text-xs text-white">{item.name} <span className="text-[#555]">x{item.quantity}</span></span></div>)}</div>
          <p className="mt-3 text-lg font-black text-[#FFC107]">{formatDzd(o.total)}</p>
        </div>
      ))}
    </div>
  );
}

function ADel(props: Parameters<typeof AdminView>[0]) {
  const s = props.deliverySettings;
  return (
    <form onSubmit={props.saveDeliverySettings} className="space-y-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-base font-black text-white">أسعار التوصيل</h3>
      <div className="grid gap-3 sm:grid-cols-2"><FI label="افتراضي للمنزل" type="number" value={String(s.defaultHome)} onChange={(v) => props.setDeliverySettings({ ...s, defaultHome: Number(v) || 0 })} /><FI label="افتراضي للمكتب" type="number" value={String(s.defaultOffice)} onChange={(v) => props.setDeliverySettings({ ...s, defaultOffice: Number(v) || 0 })} /></div>
      <div className="grid gap-3 sm:grid-cols-3"><FS label="الولاية" value={props.deliveryWilaya} onChange={props.setDeliveryWilaya} options={WILAYAS.map((w) => ({ v: w, l: w }))} /><FI label="منزل" type="number" value={props.deliveryHomeDraft} onChange={props.setDeliveryHomeDraft} /><FI label="مكتب" type="number" value={props.deliveryOfficeDraft} onChange={props.setDeliveryOfficeDraft} /></div>
      <button type="submit" className="premium-button">حفظ أسعار التوصيل</button>
    </form>
  );
}

function ABr(props: Parameters<typeof AdminView>[0]) {
  const d = props.branchDraft;
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={props.saveBranch} className="h-fit space-y-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
        <h3 className="text-base font-black text-white">{props.editingBranchId ? "تعديل فرع" : "إضافة فرع"}</h3>
        <FI label="اسم الفرع" required value={d.name} onChange={(v) => props.setBranchDraft({ ...d, name: v })} />
        <FI label="العنوان" required value={d.address} onChange={(v) => props.setBranchDraft({ ...d, address: v })} />
        <FI label="رابط الصورة" value={d.imageUrl} onChange={(v) => props.setBranchDraft({ ...d, imageUrl: v })} />
        <FI label="رابط Google Maps" value={d.mapUrl} onChange={(v) => props.setBranchDraft({ ...d, mapUrl: v })} />
        <button type="submit" className="premium-button w-full">حفظ</button>
        {props.editingBranchId && <button type="button" onClick={props.cancelBranchEdit} className="secondary-button w-full">إلغاء</button>}
      </form>
      <div className="grid gap-3 sm:grid-cols-2">{props.branches.map((b) => (
        <div key={b.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
          <img src={b.imageUrl} alt={b.name} className="h-28 w-full rounded-lg object-cover" />
          <h4 className="mt-3 font-bold text-white">{b.name}</h4>
          <p className="mt-1 text-sm text-[#666]">{b.address}</p>
          <div className="mt-3 flex gap-1.5">
            <a href={b.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-md bg-[#FFC107]/10 px-2 py-1.5 text-xs font-bold text-[#FFC107]">{I.map}<span>خريطة</span></a>
            <button type="button" onClick={() => props.editBranch(b)} className="rounded-md border border-white/[0.05] px-2 py-1.5 text-xs font-bold text-white hover:bg-white/10">تعديل</button>
            <button type="button" onClick={() => props.deleteBranch(b.id)} className="rounded-md border border-red-500/15 bg-red-500/8 px-2 py-1.5 text-xs font-bold text-red-300">حذف</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

/* ═══════ FOOTER ═══════ */
function Ftr({ branches }: { branches: Branch[] }) {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 sm:p-7">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2"><img src={LOGO_URL} alt="" className="h-9 w-9 rounded-lg object-contain" /><span className="text-base font-black text-white">HD ELECTRIC DZ</span></div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#666]">علامة جزائرية لبيع جميع المعدات واللوازم الكهربائية بتجربة رقمية احترافية.</p>
            <div className="mt-4 space-y-2">
              <a href={`tel:${PHONE.replaceAll(" ", "")}`} className="flex items-center gap-2 text-sm text-white hover:text-[#FFC107]"><span className="text-[#FFC107]">{I.phone}</span>{PHONE}</a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-sm text-[#666] hover:text-white"><span className="text-[#555]">{I.mail}</span>{EMAIL}</a>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white">فروعنا</h3>
            <div className="mt-3 space-y-2">{branches.map((b) => (
              <a key={b.id} href={b.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-[#0A0A0A] p-2.5 transition hover:border-[#FFC107]/15">
                <img src={b.imageUrl} alt={b.name} className="h-11 w-11 rounded-lg object-cover" />
                <span><span className="block text-sm font-bold text-white">{b.name}</span><span className="block text-xs text-[#555]">{b.address}</span></span>
              </a>
            ))}</div>
          </div>
        </div>
        <div className="mt-6 border-t border-white/[0.05] pt-4 text-center text-xs text-[#444]">© {new Date().getFullYear()} HD ELECTRIC DZ — جميع الحقوق محفوظة.</div>
      </div>
    </footer>
  );
}
