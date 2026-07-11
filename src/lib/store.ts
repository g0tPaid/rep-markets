import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  size?: string;
  color?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string, size?: string) => void;
  setQuantity: (productId: string, quantity: number, size?: string) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

function sameLine(a: CartItem, productId: string, size?: string) {
  return a.productId === productId && (a.size || '') === (size || '');
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
      addItem: (item) => {
        const qty = item.quantity ?? 1;
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, item.productId, item.size));
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.size)
                  ? { ...i, quantity: i.quantity + qty }
                  : i,
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, quantity: qty }],
            isOpen: true,
          };
        });
      },
      removeItem: (productId, size) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, size)),
        })),
      setQuantity: (productId, quantity, size) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !sameLine(i, productId, size))
              : state.items.map((i) =>
                  sameLine(i, productId, size) ? { ...i, quantity } : i,
                ),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'pt-cart' },
  ),
);

export const useWishlist = create<{
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [...state.ids, id],
        })),
      has: (id) => get().ids.includes(id),
    }),
    { name: 'pt-wishlist' },
  ),
);
