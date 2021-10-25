import { createContext, ReactNode, useContext, useState } from 'react';
import { toast, ToastContent } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      const parsedItem = JSON.parse(storagedCart);
      return parsedItem;
    }

    return [];
  });


  // ADICIONANDO UM PRODUTO
  const addProduct = async (productId: number): Promise<void> => {
    try {
      const prodExistsOnCart = cart.find(x => x.id === productId);
      const { data: product } = await api.get<Product>(`products/${productId}`);
      const { data: prodInStock } = await api.get(`stock/${productId}`);

      if (!product || !prodInStock) {
        toast.error("Erro na adição do produto")
        return;
      }

      if (!prodExistsOnCart) {
        if (prodInStock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }])
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([
            ...cart,
            {
              ...product,
              amount: 1
            }
          ]));
          toast("Product added succesfully!");
        } else {
          toast.error("There is no products in stock")
        }
      }
      if (prodExistsOnCart) {
        if (prodInStock.amount > prodExistsOnCart.amount) {
          prodExistsOnCart.amount += 1;
          const index = cart.indexOf(prodExistsOnCart);
          setCart([
            ...cart.slice(0, index),
            {
              ...prodExistsOnCart
            },
            ...cart.slice(index + 1)
          ]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }

    } catch (err) {
      toast.error("Erro na adição do produto");
    }
  };


  // DELETANDO UM PRODUTO
  const removeProduct = async (productId: number) => {
    try {
      const prodInCart = cart.find(x => x.id === productId);
      if (prodInCart) {
        setCart(cart.filter(x => x.id != productId));
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart.filter(x => x.id != productId)));
      }else{
        toast.error("Erro na remoção do produto");
      }

    } catch {
      toast.error("Erro na remoção do produto");
    }
  };


  // UPDATE A PRODUCT
  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Quantidade do produto não pode ser menor doque zero!")
        return;
      }
      const { data: prodInStock } = await api.get(`stock/${productId}`);
      
      if(amount > prodInStock.amount){
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      
      const prodInCart = cart.find(x => x.id === productId);

      if(!prodInCart){
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      if (prodInCart) {
          const index = cart.indexOf(prodInCart);
          prodInCart.amount = amount;

          setCart([
            ...cart.slice(0, index),
            prodInCart,
            ...cart.slice(index + 1)
          ])

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
