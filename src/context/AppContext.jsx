import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  branchApi, categoryApi, productApi,
  purchaseApi, stockInApi, stockOutApi,
} from "../services/api";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [branches,   setBranches]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);
  const [stockIns,   setStockIns]   = useState([]);
  const [stockOuts,  setStockOuts]  = useState([]);
  const [purchases,  setPurchases]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Initial data load ────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, cat, prod, po, si, so] = await Promise.all([
        branchApi.getAll(),
        categoryApi.getAll(),
        productApi.getAll(),
        purchaseApi.getAll(),
        stockInApi.getAll(),
        stockOutApi.getAll(),
      ]);
      setBranches(b.data   || []);
      setCategories(cat.data || []);
      setProducts(prod.data  || []);
      setPurchases(po.data   || []);
      setStockIns(si.data    || []);
      setStockOuts(so.data   || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Branch ───────────────────────────────────────────────────────────────
  const addBranch = async (data) => {
    const res = await branchApi.create(data);
    setBranches((p) => [...p, res.data]);
    return res.data;
  };

  const updateBranch = async (id, data) => {
    const res = await branchApi.update(id, data);
    setBranches((p) => p.map((b) => (b.id === id ? res.data : b)));
    return res.data;
  };

  const deleteBranch = async (id) => {
    await branchApi.remove(id);
    setBranches((p) => p.filter((b) => b.id !== id));
    // Cascade: remove dependent categories & products from local state
    const catIds = categories.filter((c) => c.branchId === id).map((c) => c.id);
    setCategories((p) => p.filter((c) => c.branchId !== id));
    setProducts((p) => p.filter((pr) => !catIds.includes(pr.categoryId)));
  };

  // ── Category ─────────────────────────────────────────────────────────────
  const addCategory = async (data) => {
    const res = await categoryApi.create(data);
    setCategories((p) => [...p, res.data]);
    return res.data;
  };

  const updateCategory = async (id, data) => {
    const res = await categoryApi.update(id, data);
    setCategories((p) => p.map((c) => (c.id === id ? res.data : c)));
    return res.data;
  };

  const deleteCategory = async (id) => {
    await categoryApi.remove(id);
    setCategories((p) => p.filter((c) => c.id !== id));
    setProducts((p) => p.filter((pr) => pr.categoryId !== id));
  };

  // ── Product ──────────────────────────────────────────────────────────────
  const addProduct = async (data) => {
    const res = await productApi.create(data);
    setProducts((p) => [...p, res.data]);
    return res.data;
  };

  const updateProduct = async (id, data) => {
    const res = await productApi.update(id, data);
    setProducts((p) => p.map((pr) => (pr.id === id ? res.data : pr)));
    return res.data;
  };

  const deleteProduct = async (id) => {
    await productApi.remove(id);
    setProducts((p) => p.filter((pr) => pr.id !== id));
  };

  // ── Stock In ─────────────────────────────────────────────────────────────
  const addStockIn = async (data) => {
    const res = await stockInApi.create(data);
    setStockIns((p) => [res.data, ...p]);
    // Refresh product stock from server
    const updated = await productApi.getAll();
    setProducts(updated.data || []);
    return res.data;
  };

  // ── Stock Out ────────────────────────────────────────────────────────────
  const addStockOut = async (data) => {
    const res = await stockOutApi.create(data);
    setStockOuts((p) => [res.data, ...p]);
    const updated = await productApi.getAll();
    setProducts(updated.data || []);
    return res.data;
  };

  // ── Purchase Orders ───────────────────────────────────────────────────────
  const addPurchase = async (data) => {
    const res = await purchaseApi.create(data);
    setPurchases((p) => [res.data, ...p]);
    return res.data;
  };

  const updatePurchase = async (id, data) => {
    const res = await purchaseApi.update(id, data);
    setPurchases((p) => p.map((po) => (po.id === id ? res.data : po)));
    return res.data;
  };

  const deletePurchase = async (id) => {
    await purchaseApi.remove(id);
    setPurchases((p) => p.filter((po) => po.id !== id));
  };

  const receivePurchase = async (id) => {
    const res = await purchaseApi.receive(id);
    setPurchases((p) => p.map((po) => (po.id === id ? res.data : po)));
    // Refresh stocks
    const updated = await productApi.getAll();
    setProducts(updated.data || []);
    return res.data;
  };

  const updatePurchaseStatus = async (id, status) => {
    const res = await purchaseApi.update(id, { status });
    setPurchases((p) => p.map((po) => (po.id === id ? res.data : po)));
    return res.data;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getBranch   = (id) => branches.find((b) => b.id === +id);
  const getCategory = (id) => categories.find((c) => c.id === +id);
  const getProduct  = (id) => products.find((p) => p.id === +id);

  // NOTE: categories don't have branchId in the DB (categories are global)
  // Products have branchId directly
  const branchCategories = (branchId) => {
    const branchProductCatIds = [
      ...new Set(
        products.filter((p) => p.branchId === +branchId).map((p) => p.categoryId)
      ),
    ];
    return categories.filter((c) => branchProductCatIds.includes(c.id));
  };

  const categoryProducts = (categoryId) =>
    products.filter((p) => p.categoryId === +categoryId);

  const branchProducts = (branchId) =>
    products.filter((p) => p.branchId === +branchId);

  const lowStockProducts = () =>
    products.filter((p) => Number(p.stock) <= Number(p.minStock));

  const totalInventoryValue = () =>
    products.reduce((s, p) => s + Number(p.stock) * Number(p.costPrice), 0);

  return (
    <AppContext.Provider
      value={{
        branches, categories, products, stockIns, stockOuts, purchases,
        loading, error, loadAll,
        addBranch, updateBranch, deleteBranch,
        addCategory, updateCategory, deleteCategory,
        addProduct, updateProduct, deleteProduct,
        addStockIn, addStockOut,
        addPurchase, updatePurchase, deletePurchase, receivePurchase, updatePurchaseStatus,
        getBranch, getCategory, getProduct,
        branchCategories, categoryProducts, branchProducts,
        lowStockProducts, totalInventoryValue,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
