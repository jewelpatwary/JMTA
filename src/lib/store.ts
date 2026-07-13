import { create } from 'zustand';
import { saveAs } from 'file-saver';
import { MYAgent, BDAgent, Order, MYPayment, BDPayment, Conversion, Expense, User, CollectionMethod, Withdrawal, Deposit, RateHistory, LoanEntity, LoanTransaction } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  setDoc,
  getDoc,
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firebaseUtils';

// Local storage helpers
const load = (key: string) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Helper to calculate outstanding balances
const calculateOutstanding = (type: 'MY' | 'BD', agent: any, orders: any[], payments: any[], conversions: any[] = []) => {
  const initialBalance = Number(agent.initial_balance) || 0;
  
  if (type === 'MY') {
    const totalOrders = orders.filter(o => o.my_agent_id === agent.id).reduce((sum, o) => sum + Number(o.amount_myr), 0);
    const totalPayments = payments.filter(p => p.my_agent_id === agent.id).reduce((sum, p) => sum + Number(p.amount_myr), 0);
    return initialBalance + totalPayments - totalOrders;
  } else {
    const totalOrders = orders.filter(o => o.bd_agent_id === agent.id).reduce((sum, o) => sum + Number(o.amount_bdt), 0);
    const totalCharges = orders.filter(o => o.bd_agent_id === agent.id).reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
    const totalPayments = payments.filter(p => p.bd_agent_id === agent.id).reduce((sum, p) => sum + Number(p.amount_bdt), 0);
    const totalConversions = conversions.filter(c => c.pay_to_bd_agent_id === agent.id).reduce((sum, c) => sum + Number(c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0))), 0);
    
    return initialBalance + totalPayments + totalConversions - (totalOrders + totalCharges);
  }
};

// Initial Admin User
if (!localStorage.getItem('rf_users')) {
  save('rf_users', [{ id: 1, username: 'admin', password: 'admin123', role: 'admin' }]);
}

interface AppState {
  users: User[];
  myAgents: MYAgent[];
  bdAgents: BDAgent[];
  orders: Order[];
  collectionMethods: CollectionMethod[];
  myPayments: MYPayment[];
  bdPayments: BDPayment[];
  conversions: Conversion[];
  expenses: Expense[];
  withdrawals: Withdrawal[];
  deposits: Deposit[];
  loans: LoanEntity[];
  loanTransactions: LoanTransaction[];
  defaultMobileRate: number;
  defaultBankRate: number;
  rateHistory: RateHistory[];
  dateFormat: string;
  stats: any;
  whatsappDrafts: any[];
  
  // Actions
  refresh: () => (() => void);
  setDefaultRates: (mobileRate: number, bankRate: number, date?: string) => void;
  updateRateHistoryItem: (id: number, mobileRate: number, bankRate: number) => Promise<void>;
  setDateFormat: (format: string) => void;
}

let activeUnsubscribers: (() => void)[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  users: load('rf_users'),
  myAgents: [],
  bdAgents: [],
  orders: [],
  collectionMethods: load('rf_collection_methods'),
  myPayments: load('rf_my_payments'),
  bdPayments: load('rf_bd_payments'),
  conversions: load('rf_conversions'),
  expenses: load('rf_expenses'),
  withdrawals: load('rf_withdrawals'),
  deposits: load('rf_deposits'),
  loans: [],
  loanTransactions: [],
  whatsappDrafts: [],
  defaultMobileRate: Number(localStorage.getItem('rf_default_mobile_rate') || 0),
  defaultBankRate: Number(localStorage.getItem('rf_default_bank_rate') || 0),
  rateHistory: load('rf_rate_history'),
  dateFormat: localStorage.getItem('rf_date_format') || 'DD-MM-YYYY',
  stats: null,

  refresh: () => {
    // Clean up any existing listeners first to prevent duplicates/memory leaks
    if (activeUnsubscribers.length > 0) {
      activeUnsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          console.error("Cleanup error", e);
        }
      });
      activeUnsubscribers = [];
    }

    const unsubscribers: (() => void)[] = [];

    // This internal refresh calculates stats based on current state
    const calculateAllStats = () => {
      const { 
        users, myAgents: myAgentsRaw, bdAgents: bdAgentsRaw, orders, 
        myPayments, bdPayments, conversions, expenses, 
        withdrawals, deposits, rateHistory, collectionMethods 
      } = useAppStore.getState();

      // Pre-compute maps to make lookups O(1) instead of O(N) inside the loop (total O(N) instead of O(N * M))
      const ordersByMyAgent = new Map<number, number>();
      const ordersByBdAgent = new Map<number, number>();
      const orderChargeByBdAgent = new Map<number, number>();
      
      const paymentsByMyAgent = new Map<number, number>();
      const paymentsByBdAgent = new Map<number, number>();
      
      const conversionsByBdAgent = new Map<number, number>();

      orders.forEach(o => {
        const myId = Number(o.my_agent_id);
        const bdId = Number(o.bd_agent_id);
        const amountMyr = Number(o.amount_myr) || 0;
        const amountBdt = Number(o.amount_bdt) || 0;
        const charge = Number(o.charge) || 0;

        if (myId) {
          ordersByMyAgent.set(myId, (ordersByMyAgent.get(myId) || 0) + amountMyr);
        }
        if (bdId) {
          ordersByBdAgent.set(bdId, (ordersByBdAgent.get(bdId) || 0) + amountBdt);
          orderChargeByBdAgent.set(bdId, (orderChargeByBdAgent.get(bdId) || 0) + charge);
        }
      });

      myPayments.forEach(p => {
        const myId = Number(p.my_agent_id);
        const amountMyr = Number(p.amount_myr) || 0;
        if (myId) {
          paymentsByMyAgent.set(myId, (paymentsByMyAgent.get(myId) || 0) + amountMyr);
        }
      });

      bdPayments.forEach(p => {
        const bdId = Number(p.bd_agent_id);
        const amountBdt = Number(p.amount_bdt) || 0;
        if (bdId) {
          paymentsByBdAgent.set(bdId, (paymentsByBdAgent.get(bdId) || 0) + amountBdt);
        }
      });

      conversions.forEach(c => {
        const bdId = Number(c.pay_to_bd_agent_id);
        const amount = Number(c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0))) || 0;
        if (bdId) {
          conversionsByBdAgent.set(bdId, (conversionsByBdAgent.get(bdId) || 0) + amount);
        }
      });

      const myAgents = myAgentsRaw.map(agent => {
        const agentId = Number(agent.id);
        const totalOrdersMyr = ordersByMyAgent.get(agentId) || 0;
        const totalPaymentsMyr = paymentsByMyAgent.get(agentId) || 0;
        const initialBalance = Number(agent.initial_balance) || 0;
        const outstanding = initialBalance + totalPaymentsMyr - totalOrdersMyr;

        return {
          ...agent,
          total_orders_myr: totalOrdersMyr,
          total_payments_myr: totalPaymentsMyr,
          initial_balance: initialBalance,
          outstanding: outstanding
        };
      }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      const bdAgents = bdAgentsRaw.map(agent => {
        const agentId = Number(agent.id);
        const totalOrdersBdt = ordersByBdAgent.get(agentId) || 0;
        const totalCharges = orderChargeByBdAgent.get(agentId) || 0;
        const totalPaymentsBdt = paymentsByBdAgent.get(agentId) || 0;
        const conversionTotal = conversionsByBdAgent.get(agentId) || 0;
        const initialBalance = Number(agent.initial_balance) || 0;
        const outstanding = initialBalance + totalPaymentsBdt + conversionTotal - (totalOrdersBdt + totalCharges);

        return {
          ...agent,
          total_orders_bdt: totalOrdersBdt,
          total_payments_bdt: totalPaymentsBdt + conversionTotal,
          initial_balance: initialBalance,
          outstanding: outstanding
        };
      }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      const totalBdtOrder = orders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
      const totalRmOrderActual = orders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
      const totalBdtConverted = conversions.reduce((sum, c) => sum + Number(c.total_bd_received || c.amount_bdt), 0);
      const totalRmConverted = conversions.reduce((sum, c) => sum + Number(c.amount_myr), 0);
      const currentAvgConvertRate = totalRmConverted > 0 ? totalBdtConverted / totalRmConverted : 0;
      
      const avgConvertRate = currentAvgConvertRate > 0 ? currentAvgConvertRate : (totalRmConverted || 1);

      const todayOrders = orders.filter(o => o.date === today);
      const yesterdayOrders = orders.filter(o => o.date === yesterday);

      const totalConvertedRmCalculated = currentAvgConvertRate > 0 ? totalBdtOrder / currentAvgConvertRate : 0;
      const grossProfit = totalRmOrderActual - totalConvertedRmCalculated;
      const totalCharges = conversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
      const totalExp = expenses.filter(e => e.currency === 'MYR').reduce((sum, e) => sum + Number(e.amount_myr), 0);
      const netProfit = grossProfit - totalCharges - totalExp;

      const getDailyStats = (dateOrders: Order[], dateExpenses: Expense[], dateConversions: Conversion[]) => {
        const volMyr = dateOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
        const volBdt = dateOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
        const exp = dateExpenses.filter(e => e.currency === 'MYR').reduce((sum, e) => sum + Number(e.amount_myr), 0);
        const charges = dateConversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
        const convertedRm = currentAvgConvertRate > 0 ? volBdt / currentAvgConvertRate : 0;
        return { count: dateOrders.length, volume: volMyr, profit: volMyr - convertedRm - exp - charges, expenses: exp };
      };

      const todayPerformance = getDailyStats(todayOrders, expenses.filter(e => e.date === today), conversions.filter(c => c.date === today));
      const yesterdayPerformance = getDailyStats(yesterdayOrders, expenses.filter(e => e.date === yesterday), conversions.filter(c => c.date === yesterday));

      const calculateChange = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

      const bdPaymentsByMethod = new Map<string, number>();
      bdPayments.forEach(p => {
        if (p.payment_method) {
          bdPaymentsByMethod.set(p.payment_method, (bdPaymentsByMethod.get(p.payment_method) || 0) + (Number(p.amount_bdt) || 0));
        }
      });

      const myPaymentsByMethod = new Map<string, number>();
      myPayments.forEach(p => {
        if (p.payment_method) {
          myPaymentsByMethod.set(p.payment_method, (myPaymentsByMethod.get(p.payment_method) || 0) + (Number(p.amount_myr) || 0));
        }
      });

      const depositsByMethodAndType = new Map<string, number>();
      deposits.forEach(d => {
        if (d.method_name) {
          const key = `${d.agent_type || 'MY'}_${d.method_name}`;
          depositsByMethodAndType.set(key, (depositsByMethodAndType.get(key) || 0) + (Number(d.amount) || 0));
        }
      });

      const withdrawalsByMethodAndType = new Map<string, number>();
      withdrawals.forEach(w => {
        if (w.method_name) {
          const key = `${w.agent_type || 'MY'}_${w.method_name}`;
          withdrawalsByMethodAndType.set(key, (withdrawalsByMethodAndType.get(key) || 0) + (Number(w.amount) || 0));
        }
      });

      const bankBalances = collectionMethods.map(m => {
        const totalInitialBalance = (Number(m.initial_balance) || 0) + m.subItems.reduce((sum, s) => sum + (Number(s.initial_balance) || 0), 0);
        if (m.type === 'BD') {
          const inAmount = bdPaymentsByMethod.get(m.name) || 0;
          const inAmountManual = depositsByMethodAndType.get(`BD_${m.name}`) || 0;
          const outAmount = withdrawalsByMethodAndType.get(`BD_${m.name}`) || 0;
          
          const matchingBdAgent = bdAgentsRaw.find(a => a.name === m.name);
          const orderCharges = matchingBdAgent ? (orderChargeByBdAgent.get(Number(matchingBdAgent.id)) || 0) : 0;
          
          return { name: m.name, type: 'BD', balance: totalInitialBalance + inAmount + inAmountManual - outAmount - orderCharges, currency: 'BDT' };
        }
        
        const inAmount = myPaymentsByMethod.get(m.name) || 0;
        const inAmountManual = depositsByMethodAndType.get(`MY_${m.name}`) || 0;
        const outAmount = withdrawalsByMethodAndType.get(`MY_${m.name}`) || 0;
        
        return { 
          name: m.name, type: 'MY', 
          balance: totalInitialBalance + inAmount + inAmountManual - outAmount,
          currency: 'MYR' 
        };
      }).filter(b => b.balance !== 0);

      const stats = {
        today: { count: todayOrders.length, total_myr: todayOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0), total_bdt: todayOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0) },
        changes: { count: calculateChange(todayPerformance.count, yesterdayPerformance.count), volume: calculateChange(todayPerformance.volume, yesterdayPerformance.volume), profit: calculateChange(todayPerformance.profit, yesterdayPerformance.profit), expenses: calculateChange(todayPerformance.expenses, yesterdayPerformance.expenses) },
        netProfit, profitBreakdown: { totalBdtOrder, totalRmOrder: totalRmOrderActual, avgConvertRate: currentAvgConvertRate, totalConvertedRm: totalConvertedRmCalculated, grossProfit, bankCharges: totalCharges, expenses: totalExp, netProfit },
        myAgentsOutstanding: { agents: myAgents.map(a => ({ name: a.name, outstanding: Number(a.outstanding.toFixed(2)) })).filter(a => a.outstanding !== 0), total: myAgents.reduce((sum, a) => sum + a.outstanding, 0) },
        bdAgentsOutstanding: { agents: bdAgents.map(a => ({ name: a.name, outstanding: Number(a.outstanding.toFixed(2)) })).filter(a => a.outstanding !== 0), total: bdAgents.reduce((sum, a) => sum + a.outstanding, 0) },
        bankBalances, expenses: { total_myr: totalExp },
        recentTransactions: orders.slice(0, 5).map(o => ({ ...o, my_agent_name: myAgents.find(a => a.id === o.my_agent_id)?.name || '-' }))
      };

      set({ myAgents, bdAgents, stats });
    };

    // Microtask batching/debouncing to compress multiple concurrent/sequential snapshot events into a single calculation tick
    let pendingCalc = false;
    const debouncedCalculateAllStats = () => {
      if (pendingCalc) return;
      pendingCalc = true;
      Promise.resolve().then(() => {
        calculateAllStats();
        pendingCalc = false;
      });
    };

    // Set up listeners for all collections
    const setupListener = (collectionName: string, stateKey: string) => {
      return onSnapshot(collection(db, collectionName), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), firebase_id: doc.id })) as any[];
        set({ [stateKey]: data } as any);
        debouncedCalculateAllStats();
      }, (error) => handleFirestoreError(error, OperationType.GET, collectionName));
    };

    // Custom listener for users to seed admin if empty
    unsubscribers.push(onSnapshot(collection(db, 'users'), (snapshot) => {
      if (snapshot.empty) {
        addDoc(collection(db, 'users'), { id: 1, username: 'admin', password: 'admin123', role: 'admin' });
      }
      const data = snapshot.docs.map(doc => ({ ...doc.data(), firebase_id: doc.id })) as any[];
      set({ users: data } as any);
      debouncedCalculateAllStats();
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users')));
    unsubscribers.push(setupListener('my_agents', 'myAgents'));
    unsubscribers.push(setupListener('bd_agents', 'bdAgents'));
    unsubscribers.push(setupListener('orders', 'orders'));
    unsubscribers.push(setupListener('my_payments', 'myPayments'));
    unsubscribers.push(setupListener('bd_payments', 'bdPayments'));
    unsubscribers.push(setupListener('conversions', 'conversions'));
    unsubscribers.push(setupListener('expenses', 'expenses'));
    unsubscribers.push(setupListener('withdrawals', 'withdrawals'));
    unsubscribers.push(setupListener('deposits', 'deposits'));
    unsubscribers.push(setupListener('collection_methods', 'collectionMethods'));
    unsubscribers.push(setupListener('rate_history', 'rateHistory'));
    unsubscribers.push(setupListener('loans', 'loans'));
    unsubscribers.push(setupListener('loan_transactions', 'loanTransactions'));
    unsubscribers.push(setupListener('whatsapp_drafts', 'whatsappDrafts'));

    // Listen to global settings
    unsubscribers.push(onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        set({ defaultMobileRate: data.defaultMobileRate, defaultBankRate: data.defaultBankRate });
      }
    }));

    activeUnsubscribers = unsubscribers;
    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (e) {
          // ignore
        }
      });
      activeUnsubscribers = [];
    };
  },

  setDefaultRates: async (mobileRate: number, bankRate: number, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
      await setDoc(doc(db, 'settings', 'global'), { defaultMobileRate: mobileRate, defaultBankRate: bankRate }, { merge: true });
      
      const historyCol = collection(db, 'rate_history');
      const q = query(historyCol, where('date', '==', targetDate));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await updateDoc(doc(db, 'rate_history', snap.docs[0].id), { mobileRate, bankRate });
      } else {
        await addDoc(historyCol, { id: Date.now(), mobileRate, bankRate, date: targetDate });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rate_history');
    }
  },

  updateRateHistoryItem: async (id: number, mobileRate: number, bankRate: number) => {
    try {
      const q = query(collection(db, 'rate_history'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'rate_history', snap.docs[0].id), { mobileRate, bankRate });
        useAppStore.getState().refresh();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rate_history');
    }
  },
  
  setDateFormat: (format: string) => {
    localStorage.setItem('rf_date_format', format);
    set(state => ({ ...state, dateFormat: format }));
  },
}));

// Initialize store data
// useAppStore.getState().refresh();

export const store = {
  getUsers: () => useAppStore.getState().users,
  
  getMYAgents: () => useAppStore.getState().myAgents,

  addMYAgent: async (name: string, initial_balance: number, initial_balance_date?: string, default_mobile_rate: number = 0, default_bank_rate: number = 0) => {
    const newAgent = { 
      id: Date.now(), 
      name, 
      initial_balance: Number(initial_balance) || 0, 
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      default_mobile_rate: Number(default_mobile_rate) || 0,
      default_bank_rate: Number(default_bank_rate) || 0
    };
    try {
      await addDoc(collection(db, 'my_agents'), newAgent);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_agents');
    }
    return newAgent;
  },

  updateMYAgent: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'my_agents'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'my_agents', snap.docs[0].id), data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_agents');
    }
  },

  deleteMYAgent: async (id: number) => {
    try {
      const q = query(collection(db, 'my_agents'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'my_agents', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_agents');
    }
  },

  getBDAgents: () => useAppStore.getState().bdAgents,

  addBDAgent: async (name: string, initial_balance: number, initial_balance_date?: string, phone: string = '') => {
    const newAgent = { 
      id: Date.now(), 
      name, 
      initial_balance: Number(initial_balance) || 0, 
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      phone: phone || '' 
    };
    try {
      await addDoc(collection(db, 'bd_agents'), newAgent);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_agents');
    }
    return newAgent;
  },

  updateBDAgent: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'bd_agents'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'bd_agents', snap.docs[0].id), data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_agents');
    }
  },

  deleteBDAgent: async (id: number) => {
    try {
      const q = query(collection(db, 'bd_agents'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'bd_agents', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_agents');
    }
  },

  getOrders: () => {
    const { orders, myAgents, bdAgents } = useAppStore.getState();
    return orders.map(o => ({
      ...o,
      my_agent_name: myAgents.find(a => a.id === o.my_agent_id)?.name || 'Unknown',
      bd_agent_name: bdAgents.find(a => a.id === o.bd_agent_id)?.name || 'Unknown',
    })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  },

  addOrder: async (data: any) => {
    const { myAgents, bdAgents } = useAppStore.getState();
    const my_agent_id = Number(data.my_agent_id);
    const bd_agent_id = Number(data.bd_agent_id);
    const my_agent_name = myAgents.find(a => a.id === my_agent_id)?.name || 'Unknown';
    const bd_agent_name = bdAgents.find(a => a.id === bd_agent_id)?.name || 'Unknown';
    const orderId = Date.now() + Math.floor(Math.random() * 1000);
    
    const newOrder = { 
      ...data, 
      id: orderId, 
      amount_bdt: Number(data.amount_bdt), 
      rate: Number(data.rate), 
      amount_myr: Number(data.amount_myr), 
      charge: data.charge !== undefined ? Number(data.charge) : 0,
      my_agent_id, 
      bd_agent_id,
      my_agent_name,
      bd_agent_name,
      paid_amount: 0
    };

    try {
      await addDoc(collection(db, 'orders'), newOrder);

      // Handle Charge as Expense
      if (newOrder.charge > 0) {
        const newExpense: Expense = {
          id: Date.now() + Math.floor(Math.random() * 1000) + 1,
          amount_myr: newOrder.charge,
          currency: 'BDT',
          category: 'Order Charge',
          date: newOrder.date,
          note: `Charge for order with ${bd_agent_name}`,
          order_id: orderId
        };
        await addDoc(collection(db, 'expenses'), newExpense);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }

    return newOrder;
  },

  updateOrder: async (id: number, data: any) => {
    const { orders, myAgents, bdAgents } = useAppStore.getState();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const my_agent_id = data.my_agent_id !== undefined ? Number(data.my_agent_id) : order.my_agent_id;
    const bd_agent_id = data.bd_agent_id !== undefined ? Number(data.bd_agent_id) : order.bd_agent_id;
    const my_agent_name = myAgents.find(a => a.id === my_agent_id)?.name || 'Unknown';
    const bd_agent_name = bdAgents.find(a => a.id === bd_agent_id)?.name || 'Unknown';

    const updatedOrder = { 
      ...order, 
      ...data, 
      amount_bdt: data.amount_bdt !== undefined ? Number(data.amount_bdt) : order.amount_bdt, 
      rate: data.rate !== undefined ? Number(data.rate) : order.rate, 
      amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : order.amount_myr, 
      charge: data.charge !== undefined ? Number(data.charge) : (order.charge || 0),
      my_agent_id,
      bd_agent_id,
      my_agent_name,
      bd_agent_name
    };

    try {
      const q = query(collection(db, 'orders'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'orders', snap.docs[0].id), updatedOrder);

        // Update Expense
        const expQ = query(collection(db, 'expenses'), where('order_id', '==', id));
        const expSnap = await getDocs(expQ);
        expSnap.forEach(async (d) => await deleteDoc(d.ref));

        if (updatedOrder.charge > 0) {
          const newExpense: Expense = {
            id: Date.now() + Math.floor(Math.random() * 1000) + 2,
            amount_myr: updatedOrder.charge,
            currency: 'BDT',
            category: 'Order Charge',
            date: updatedOrder.date,
            note: `Charge for order with ${bd_agent_name}`,
            order_id: id
          };
          await addDoc(collection(db, 'expenses'), newExpense);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  },

  deleteOrder: async (id: number) => {
    try {
      const q = query(collection(db, 'orders'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'orders', snap.docs[0].id));
        
        const expQ = query(collection(db, 'expenses'), where('order_id', '==', id));
        const expSnap = await getDocs(expQ);
        expSnap.forEach(async (d) => await deleteDoc(d.ref));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  },

  getCollectionMethods: () => useAppStore.getState().collectionMethods,
  addCollectionMethod: async (name: string, type: 'MY' | 'BD', initial_balance?: number, initial_balance_date?: string) => {
    const newMethod = { 
      id: Date.now(), 
      name, 
      type, 
      initial_balance: Number(initial_balance) || 0,
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      subItems: [] 
    };
    try {
      await addDoc(collection(db, 'collection_methods'), newMethod);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
    return newMethod;
  },
  deleteCollectionMethod: async (id: number) => {
    try {
      const q = query(collection(db, 'collection_methods'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'collection_methods', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
  },
  updateCollectionMethod: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'collection_methods'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const method = snap.docs[0].data();
        const updated = { 
          ...method, 
          ...data,
          initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : method.initial_balance,
          initial_balance_date: data.initial_balance_date || method.initial_balance_date
        };
        await updateDoc(doc(db, 'collection_methods', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
  },
  addCollectionMethodSubItem: async (methodId: number, name: string, initial_balance?: number, initial_balance_date?: string) => {
    try {
      const q = query(collection(db, 'collection_methods'), where('id', '==', methodId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const method = snap.docs[0].data();
        method.subItems.push({ 
          id: Date.now(), 
          name,
          initial_balance: Number(initial_balance) || 0,
          initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0]
        });
        await updateDoc(doc(db, 'collection_methods', snap.docs[0].id), { subItems: method.subItems });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
  },
  deleteCollectionMethodSubItem: async (methodId: number, subItemId: number) => {
    try {
      const q = query(collection(db, 'collection_methods'), where('id', '==', methodId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const method = snap.docs[0].data();
        method.subItems = method.subItems.filter((s: any) => s.id !== subItemId);
        await updateDoc(doc(db, 'collection_methods', snap.docs[0].id), { subItems: method.subItems });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
  },
  updateCollectionMethodSubItem: async (methodId: number, subItemId: number, data: any) => {
    try {
      const q = query(collection(db, 'collection_methods'), where('id', '==', methodId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const method = snap.docs[0].data();
        method.subItems = method.subItems.map((s: any) => s.id === subItemId ? { 
          ...s, 
          ...data,
          initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : s.initial_balance,
          initial_balance_date: data.initial_balance_date || s.initial_balance_date
        } : s);
        await updateDoc(doc(db, 'collection_methods', snap.docs[0].id), { subItems: method.subItems });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'collection_methods');
    }
  },

  getMYPayments: (agentId: number) => {
    const { myPayments } = useAppStore.getState();
    return myPayments
      .filter(p => p.my_agent_id === Number(agentId))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  },

  getAllMYPayments: () => useAppStore.getState().myPayments,

  addMYPayment: async (data: any) => {
    const newPayment = { 
      ...data, 
      id: Date.now() + Math.floor(Math.random() * 1000), 
      amount_myr: Number(data.amount_myr), 
      my_agent_id: Number(data.my_agent_id)
    };
    
    try {
      const batch = writeBatch(db);
      const newPaymentRef = doc(collection(db, 'my_payments'));
      batch.set(newPaymentRef, newPayment);
      
      if (data.order_ids?.length > 0) {
        const { orders } = useAppStore.getState();
        const paymentAmountPerOrder = Number(data.amount_myr) / data.order_ids.length;
        for (const orderId of data.order_ids) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const currentPaidAmount = order.paid_amount || 0;
            const newPaidAmount = currentPaidAmount + paymentAmountPerOrder;
            const newRemainingBalance = order.amount_myr - newPaidAmount;
            const newStatus = newPaidAmount >= order.amount_myr ? 'paid' : 'partial';
            
            if (order.firebase_id) {
              batch.update(doc(db, 'orders', order.firebase_id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
            } else {
              const q = query(collection(db, 'orders'), where('id', '==', orderId));
              const snap = await getDocs(q);
              if (!snap.empty) {
                batch.update(doc(db, 'orders', snap.docs[0].id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
              }
            }
          }
        }
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_payments');
    }
    return newPayment;
  },

  deleteMYPayment: async (id: number) => {
    try {
      const q = query(collection(db, 'my_payments'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const paymentDoc = snap.docs[0];
        const payment = paymentDoc.data();
        
        const batch = writeBatch(db);
        batch.delete(doc(db, 'my_payments', paymentDoc.id));
        
        if (payment.order_ids?.length > 0) {
          const { orders } = useAppStore.getState();
          const paymentAmountPerOrder = Number(payment.amount_myr) / payment.order_ids.length;
          for (const orderId of payment.order_ids) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
              const newPaidAmount = (order.paid_amount || 0) - paymentAmountPerOrder;
              const newRemainingBalance = order.amount_myr - newPaidAmount;
              const newStatus = newPaidAmount <= 0 ? 'unpaid' : 'partial';
              
              if (order.firebase_id) {
                batch.update(doc(db, 'orders', order.firebase_id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
              } else {
                const oq = query(collection(db, 'orders'), where('id', '==', orderId));
                const osnap = await getDocs(oq);
                if (!osnap.empty) {
                  batch.update(doc(db, 'orders', osnap.docs[0].id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
                }
              }
            }
          }
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_payments');
    }
  },

  updateMYPayment: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'my_payments'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = { 
          ...existing, 
          ...data, 
          amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : existing.amount_myr, 
          my_agent_id: data.my_agent_id !== undefined ? Number(data.my_agent_id) : existing.my_agent_id 
        };
        await updateDoc(doc(db, 'my_payments', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'my_payments');
    }
  },

  getBDPayments: (agentId: number) => {
    const { bdPayments, conversions } = useAppStore.getState();
    
    const conversionPayments = conversions
      .filter(c => c.pay_to_bd_agent_id === Number(agentId))
      .map(c => ({
        id: c.id,
        bd_agent_id: c.pay_to_bd_agent_id!,
        amount_bdt: c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0)),
        payment_method: 'Remittance',
        sub_method: '',
        date: c.date,
        note: c.commission_enabled ? 'Including 2.5% Commission' : '',
        is_conversion: true
      }));

    return [...bdPayments.filter(p => p.bd_agent_id === Number(agentId)), ...conversionPayments]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  },

  getAllBDPayments: () => {
    const { bdPayments, conversions } = useAppStore.getState();
    const conversionPayments = conversions
      .filter(c => c.pay_to_bd_agent_id)
      .map(c => ({
        id: c.id,
        bd_agent_id: c.pay_to_bd_agent_id!,
        amount_bdt: c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0)),
        payment_method: 'Remittance',
        sub_method: '',
        date: c.date,
        note: c.commission_enabled ? 'Including 2.5% Commission' : '',
        is_conversion: true
      }));
    return [...bdPayments, ...conversionPayments];
  },

  addBDPayment: async (data: any) => {
    const newPayment = { 
      ...data, 
      id: Date.now() + Math.floor(Math.random() * 1000), 
      amount_bdt: Number(data.amount_bdt), 
      bd_agent_id: Number(data.bd_agent_id)
    };
    
    try {
      const batch = writeBatch(db);
      const newPaymentRef = doc(collection(db, 'bd_payments'));
      batch.set(newPaymentRef, newPayment);
      
      if (data.order_ids?.length > 0) {
        const { orders } = useAppStore.getState();
        const paymentAmountPerOrder = Number(data.amount_bdt) / data.order_ids.length;
        for (const orderId of data.order_ids) {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const currentPaidAmount = order.paid_amount || 0;
            const newPaidAmount = currentPaidAmount + paymentAmountPerOrder;
            const newRemainingBalance = order.amount_bdt - newPaidAmount;
            const newStatus = newPaidAmount >= order.amount_bdt ? 'paid' : 'partial';
            
            if (order.firebase_id) {
              batch.update(doc(db, 'orders', order.firebase_id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
            } else {
              const q = query(collection(db, 'orders'), where('id', '==', orderId));
              const snap = await getDocs(q);
              if (!snap.empty) {
                batch.update(doc(db, 'orders', snap.docs[0].id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
              }
            }
          }
        }
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_payments');
    }
    return newPayment;
  },

  deleteBDPayment: async (id: number) => {
    try {
      const q = query(collection(db, 'bd_payments'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const paymentDoc = snap.docs[0];
        const payment = paymentDoc.data();
        
        const batch = writeBatch(db);
        batch.delete(doc(db, 'bd_payments', paymentDoc.id));
        
        if (payment.order_ids?.length > 0) {
          const { orders } = useAppStore.getState();
          const paymentAmountPerOrder = Number(payment.amount_bdt) / payment.order_ids.length;
          for (const orderId of payment.order_ids) {
            const order = orders.find(o => o.id === orderId);
            if (order) {
              const newPaidAmount = (order.paid_amount || 0) - paymentAmountPerOrder;
              const newRemainingBalance = order.amount_bdt - newPaidAmount;
              const newStatus = newPaidAmount <= 0 ? 'unpaid' : 'partial';
              
              if (order.firebase_id) {
                batch.update(doc(db, 'orders', order.firebase_id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
              } else {
                const oq = query(collection(db, 'orders'), where('id', '==', orderId));
                const osnap = await getDocs(oq);
                if (!osnap.empty) {
                  batch.update(doc(db, 'orders', osnap.docs[0].id), { status: newStatus, paid_amount: newPaidAmount, remaining_balance: newRemainingBalance });
                }
              }
            }
          }
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_payments');
    }
  },

  updateBDPayment: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'bd_payments'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = { 
          ...existing, 
          ...data, 
          amount_bdt: data.amount_bdt !== undefined ? Number(data.amount_bdt) : existing.amount_bdt, 
          bd_agent_id: data.bd_agent_id !== undefined ? Number(data.bd_agent_id) : existing.bd_agent_id 
        };
        await updateDoc(doc(db, 'bd_payments', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bd_payments');
    }
  },

  addConversion: async (data: any) => {
    const commission_amount = data.commission_enabled ? Number(data.amount_bdt) * 0.025 : 0;
    const total_bd_received = Number(data.amount_bdt) + commission_amount;
    
    const newItem = { 
      ...data, 
      id: Date.now() + Math.floor(Math.random() * 1000), 
      rate: Number(data.rate), 
      amount_bdt: Number(data.amount_bdt), 
      bank_charges: Number(data.bank_charges),
      commission_enabled: data.commission_enabled,
      commission_amount,
      total_bd_received,
      pay_to_bd_agent_id: data.pay_to_bd_agent_id ? Number(data.pay_to_bd_agent_id) : undefined
    };
    try {
      await addDoc(collection(db, 'conversions'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversions');
    }
    return newItem;
  },

  updateConversion: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'conversions'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const amount_bdt = data.amount_bdt !== undefined ? Number(data.amount_bdt) : existing.amount_bdt;
        const commission_enabled = data.commission_enabled !== undefined ? data.commission_enabled : existing.commission_enabled;
        const commission_amount = commission_enabled ? amount_bdt * 0.025 : 0;
        const total_bd_received = amount_bdt + commission_amount;

        const updated = { 
          ...existing, 
          ...data, 
          amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : existing.amount_myr, 
          rate: data.rate !== undefined ? Number(data.rate) : existing.rate, 
          amount_bdt: amount_bdt, 
          bank_charges: data.bank_charges !== undefined ? Number(data.bank_charges) : existing.bank_charges,
          commission_enabled,
          commission_amount,
          total_bd_received,
          pay_to_bd_agent_id: data.pay_to_bd_agent_id !== undefined ? (data.pay_to_bd_agent_id ? Number(data.pay_to_bd_agent_id) : undefined) : existing.pay_to_bd_agent_id
        };
        await updateDoc(doc(db, 'conversions', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversions');
    }
  },

  deleteConversion: async (id: number) => {
    try {
      const q = query(collection(db, 'conversions'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'conversions', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversions');
    }
  },

  getExpenses: () => useAppStore.getState().expenses,
  addExpense: async (data: any) => {
    const newItem = { ...data, id: Date.now() + Math.floor(Math.random() * 1000), amount_myr: Number(data.amount_myr) };
    try {
      await addDoc(collection(db, 'expenses'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
    }
    return newItem;
  },

  updateExpense: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'expenses'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = { 
          ...existing, 
          ...data, 
          amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : existing.amount_myr 
        };
        await updateDoc(doc(db, 'expenses', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
    }
  },

  deleteExpense: async (id: number) => {
    try {
      const q = query(collection(db, 'expenses'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'expenses', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
    }
  },

  getWithdrawals: () => useAppStore.getState().withdrawals,
  addWithdrawal: async (data: any) => {
    const newItem = { 
      ...data, 
      id: Date.now() + Math.floor(Math.random() * 1000), 
      amount: Number(data.amount),
      agent_id: Number(data.agent_id)
    };
    try {
      await addDoc(collection(db, 'withdrawals'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
    return newItem;
  },
  updateWithdrawal: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'withdrawals'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = { 
          ...existing, 
          ...data, 
          amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
          agent_id: data.agent_id !== undefined ? Number(data.agent_id) : existing.agent_id
        };
        await updateDoc(doc(db, 'withdrawals', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  },
  deleteWithdrawal: async (id: number) => {
    try {
      const q = query(collection(db, 'withdrawals'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'withdrawals', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  },
  
  getDeposits: () => useAppStore.getState().deposits,
  addDeposit: async (data: any) => {
    const newItem = { 
      ...data, 
      id: Date.now() + Math.floor(Math.random() * 1000), 
      amount: Number(data.amount),
      agent_id: Number(data.agent_id)
    };
    try {
      await addDoc(collection(db, 'deposits'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
    return newItem;
  },
  updateDeposit: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'deposits'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = { 
          ...existing, 
          ...data, 
          amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
          agent_id: data.agent_id !== undefined ? Number(data.agent_id) : existing.agent_id
        };
        await updateDoc(doc(db, 'deposits', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
  },
  deleteDeposit: async (id: number) => {
    try {
      const q = query(collection(db, 'deposits'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'deposits', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
  },

  getLoans: () => useAppStore.getState().loans,
  addLoan: async (name: string) => {
    const newItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name
    };
    try {
      await addDoc(collection(db, 'loans'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loans');
    }
    return newItem;
  },
  deleteLoan: async (id: number) => {
    try {
      const q = query(collection(db, 'loans'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'loans', snap.docs[0].id));
      }
      
      const qTx = query(collection(db, 'loan_transactions'), where('loanId', '==', id));
      const snapTx = await getDocs(qTx);
      const batch = writeBatch(db);
      snapTx.forEach(d => {
        batch.delete(doc(db, 'loan_transactions', d.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loans');
    }
  },

  getLoanTransactions: () => useAppStore.getState().loanTransactions,
  addLoanTransaction: async (data: any) => {
    const newItem = {
      ...data,
      id: Date.now() + Math.floor(Math.random() * 1000),
      loanId: Number(data.loanId)
    };
    try {
      await addDoc(collection(db, 'loan_transactions'), newItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loan_transactions');
    }
    return newItem;
  },
  updateLoanTransaction: async (id: number, data: any) => {
    try {
      const q = query(collection(db, 'loan_transactions'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data();
        const updated = {
          ...existing,
          ...data,
          loanId: data.loanId !== undefined ? Number(data.loanId) : existing.loanId
        };
        await updateDoc(doc(db, 'loan_transactions', snap.docs[0].id), updated);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loan_transactions');
    }
  },
  deleteLoanTransaction: async (id: number) => {
    try {
      const q = query(collection(db, 'loan_transactions'), where('id', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'loan_transactions', snap.docs[0].id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'loan_transactions');
    }
  },

  getCollectionReport: (start_date?: string, end_date?: string, my_agent_id?: any, bd_agent_id?: any) => {
    const { myPayments, withdrawals } = useAppStore.getState();
    
    const requiresFilter = (req: any) => {
       if (!req) return false;
       if (typeof req === 'string') return req !== 'all' && req !== '';
       return req.length > 0 && !req.includes('all') && !(req.length === 1 && req[0] === '');
    };
    
    const matchId = (item_agent: number | undefined, req: any) => {
       if (typeof req === 'string') return item_agent === Number(req);
       return item_agent !== undefined && req.includes(String(item_agent));
    };
    
    const filteredPayments = myPayments.filter(p => {
      if (start_date && p.date < start_date) return false;
      if (end_date && p.date > end_date) return false;
      if (requiresFilter(my_agent_id) && !matchId(p.my_agent_id, my_agent_id)) return false;
      if (requiresFilter(bd_agent_id)) return false; 
      return true;
    });

    const filteredWithdrawals = withdrawals.filter(w => {
      if (w.agent_type !== 'MY') return false;
      if (start_date && w.date < start_date) return false;
      if (end_date && w.date > end_date) return false;
      if (requiresFilter(my_agent_id) && !matchId(w.agent_id, my_agent_id)) return false;
      if (requiresFilter(bd_agent_id)) return false;
      return true;
    });

    const combined = [
      ...filteredPayments.map(p => ({
        date: p.date,
        method: p.sub_method ? `${p.payment_method} - ${p.sub_method}` : p.payment_method,
        collection: Number(p.amount_myr),
        withdraw: 0,
        note: p.note || ''
      })),
      ...filteredWithdrawals.map(w => ({
        date: w.date,
        method: w.sub_method_name ? `${w.method_name} - ${w.sub_method_name}` : w.method_name,
        collection: 0,
        withdraw: Number(w.amount),
        note: w.note || ''
      }))
    ].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

    let balance = 0;
    
    // If there's a start_date, we need to calculate the opening balance
    if (start_date) {
      const pastPayments = myPayments.filter(p => {
        if (p.date >= start_date) return false;
        if (requiresFilter(my_agent_id) && !matchId(p.my_agent_id, my_agent_id)) return false;
        if (requiresFilter(bd_agent_id)) return false;
        return true;
      });
      const pastWithdrawals = withdrawals.filter(w => {
        if (w.agent_type !== 'MY' || w.date >= start_date) return false;
        if (requiresFilter(my_agent_id) && !matchId(w.agent_id, my_agent_id)) return false;
        if (requiresFilter(bd_agent_id)) return false;
        return true;
      });
      
      const pastCollection = pastPayments.reduce((sum, p) => sum + Number(p.amount_myr), 0);
      const pastWithdraw = pastWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
      balance = pastCollection - pastWithdraw;
      
      if (balance !== 0) {
        combined.unshift({
          date: start_date,
          method: 'Opening Balance',
          collection: 0,
          withdraw: 0,
          note: ''
        });
      }
    }

    const data = combined.map(t => {
      balance = balance + t.collection - t.withdraw;
      return { 
        date: t.date,
        method: t.method,
        collection: t.collection,
        withdraw: t.withdraw,
        balance: balance,
        note: t.note
      };
    });

    return data;
  },

  getReports: (params: any) => {
    const { type, my_agent_id, bd_agent_id, start_date, end_date } = params;
    const { orders, conversions, expenses, myPayments, bdPayments, myAgents, bdAgents, collectionMethods } = useAppStore.getState();

    const filter = (data: any[], isConversion = false) => data.filter(item => {
      let match = true;
      if (start_date && item.date < start_date) match = false;
      if (end_date && item.date > end_date) match = false;
      
      const requiresMyAgentFilter = (req: any) => {
         if (!req) return false;
         if (typeof req === 'string') return req !== 'all' && req !== '';
         return req.length > 0 && !req.includes('all') && !(req.length === 1 && req[0] === '');
      };
      
      const matchAgentId = (item_agent: number | undefined, req: any) => {
         if (typeof req === 'string') return item_agent === Number(req);
         return item_agent !== undefined && req.includes(String(item_agent));
      };

      if (requiresMyAgentFilter(my_agent_id)) {
        if ('my_agent_id' in item) {
          if (!matchAgentId(item.my_agent_id, my_agent_id)) match = false;
        } else {
          // If filtering by MY Agent, exclude items that are BD-only (like BD payments or conversions not linked to MY agents)
          if ('bd_agent_id' in item || isConversion) match = false;
        }
      }
      
      if (requiresMyAgentFilter(bd_agent_id)) {
        if (isConversion) {
          if (!matchAgentId(item.pay_to_bd_agent_id, bd_agent_id)) match = false;
        } else if ('bd_agent_id' in item) {
          if (!matchAgentId(item.bd_agent_id, bd_agent_id)) match = false;
        } else {
          // If filtering by BD Agent, exclude items that are MY-only (like MY payments)
          if ('my_agent_id' in item) match = false;
        }
      }
      return match;
    });

    if (type === 'collection') {
      const data = store.getCollectionReport(start_date, end_date, my_agent_id, bd_agent_id);
      return { data, columns: ['Date', 'Method', 'Collection (MYR)', 'Withdraw', 'Balance', 'Note'] };
    }

    if (type === 'summary') {
      const filteredOrders = filter(orders);
      
      const globalConversions = conversions.filter(c => {
        if (start_date && c.date < start_date) return false;
        if (end_date && c.date > end_date) return false;
        return true;
      });
      const globalExpenses = expenses.filter(e => {
        if (start_date && e.date < start_date) return false;
        if (end_date && e.date > end_date) return false;
        if (e.currency === 'BDT') return false;
        return true;
      });
      const globalOrders = orders.filter(o => {
        if (start_date && o.date < start_date) return false;
        if (end_date && o.date > end_date) return false;
        return true;
      });

      const totalBdtOrder = filteredOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
      const totalRmOrder = filteredOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
      
      const totalGlobalBdtOrder = globalOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
      
      const totalBdtConverted = globalConversions.reduce((sum, c) => sum + Number(c.total_bd_received || c.amount_bdt), 0);
      const totalRmConverted = globalConversions.reduce((sum, c) => sum + Number(c.amount_myr), 0);
      
      const avgConvertRate = totalRmConverted > 0 ? totalBdtConverted / totalRmConverted : 0;
      const totalConvertedRm = avgConvertRate > 0 ? totalBdtOrder / avgConvertRate : 0;
      const grossProfit = totalRmOrder - totalConvertedRm;
      
      const totalGlobalCharges = globalConversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
      const totalGlobalExp = globalExpenses.reduce((sum, e) => sum + Number(e.amount_myr), 0);
      
      const requiresMyAgentFilter = (req: any) => {
         if (!req) return false;
         if (typeof req === 'string') return req !== 'all' && req !== '';
         return req.length > 0 && !req.includes('all') && !(req.length === 1 && req[0] === '');
      };
      const isAgentSelected = requiresMyAgentFilter(my_agent_id) || requiresMyAgentFilter(bd_agent_id);
      const proRateFactor = (isAgentSelected && totalGlobalBdtOrder > 0) ? (totalBdtOrder / totalGlobalBdtOrder) : 1;
      
      const totalCharges = totalGlobalCharges * proRateFactor;
      const totalExp = totalGlobalExp * proRateFactor;
      
      const netProfit = grossProfit - totalCharges - totalExp;
      
      return {
        summary: {
          order_count: filteredOrders.length,
          total_myr_orders: totalRmOrder,
          total_myr_converted: totalRmConverted,
          total_bdt_converted: totalBdtConverted,
          avg_rate: avgConvertRate,
          total_expenses: totalExp,
          total_charges: totalCharges,
          profitBreakdown: {
            totalBdtOrder,
            totalRmOrder,
            avgConvertRate,
            totalConvertedRm,
            grossProfit,
            bankCharges: totalCharges,
            expenses: totalExp,
            netProfit
          }
        }
      };
    }

    if (type === 'orders') {
      const data = filter(orders).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(o => ({
        date: o.date,
        my_agent: myAgents.find(a => a.id === o.my_agent_id)?.name || '-',
        bd_agent: bdAgents.find(a => a.id === o.bd_agent_id)?.name || '-',
        type: o.type,
        amount_bdt: Number(o.amount_bdt),
        rate: Number(o.rate),
        amount_myr: Number(o.amount_myr),
        remark: o.remark || ''
      }));
      return { data, columns: ['Date', 'MY Agent', 'BD Agent', 'Type', 'BDT', 'Rate', 'RM', 'Remark'] };
    }

    if (type === 'payments') {
      const myP = filter(myPayments)
        .map(p => ({ ...p, agentObj: myAgents.find(a => a.id === p.my_agent_id), side: 'MY', amount: p.amount_myr }))
        .filter(p => p.agentObj);
      
      const bdP = filter(bdPayments)
        .map(p => ({ ...p, agentObj: bdAgents.find(a => a.id === p.bd_agent_id), side: 'BD', amount: p.amount_bdt }))
        .filter(p => p.agentObj);

      const convP = filter(conversions, true)
        .filter(c => c.pay_to_bd_agent_id)
        .map(c => ({ 
          ...c, 
          agentObj: bdAgents.find(a => a.id === c.pay_to_bd_agent_id), 
          side: 'BD', 
          amount: c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0)),
          payment_method: 'Conversion Remittance'
        }))
        .filter(p => p.agentObj);

      const data = [...myP, ...bdP, ...convP].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).map(p => ({
        date: p.date,
        agent: p.agentObj?.name || '-',
        side: p.side,
        method: p.payment_method,
        amount: Number(p.amount),
        note: p.note || ''
      }));
      return { data, columns: ['Date', 'Agent', 'Side', 'Method', 'Amount', 'Note'] };
    }

    if (type === 'expenses') {
      const data = filter(expenses).map(e => ({
        date: e.date,
        category: e.category,
        amount_myr: Number(e.amount_myr),
        note: e.note || ''
      }));
      return { data, columns: ['Date', 'Category', 'Amount (RM)', 'Note'] };
    }

    if (type === 'conversions') {
      const data = filter(conversions, true).map(c => ({
        date: c.date,
        amount_myr: Number(c.amount_myr),
        rate: Number(c.rate),
        amount_bdt: Number(c.amount_bdt),
        bank_charges: Number(c.bank_charges),
        bd_agent: bdAgents.find(a => a.id === c.pay_to_bd_agent_id)?.name || '-'
      }));
      return { data, columns: ['Date', 'RM Amount', 'Rate', 'BDT Received', 'Charges', 'Paid To Agent'] };
    }

    if (type === 'daily_financial') {
      const filteredOrders = filter(orders);
      const filteredConversions = filter(conversions, true);
      const filteredExpenses = filter(expenses);

      const dates = new Set([
        ...filteredOrders.map(o => o.date),
        ...filteredConversions.map(c => c.date),
        ...filteredExpenses.map(e => e.date)
      ]);
      const sortedDates = Array.from(dates).sort();

      const globalConversions = conversions.filter(c => {
        if (start_date && c.date < start_date) return false;
        if (end_date && c.date > end_date) return false;
        return true;
      });
      const globalOrders = orders.filter(o => {
        if (start_date && o.date < start_date) return false;
        if (end_date && o.date > end_date) return false;
        return true;
      });
      const globalExpenses = expenses.filter(e => {
        if (start_date && e.date < start_date) return false;
        if (end_date && e.date > end_date) return false;
        if (e.currency === 'BDT') return false;
        return true;
      });

      const totalGlobalBdtOrder = globalOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
      const totalGlobalBdtConverted = globalConversions.reduce((sum, c) => sum + Number(c.total_bd_received || c.amount_bdt), 0);
      const totalGlobalRmConverted = globalConversions.reduce((sum, c) => sum + Number(c.amount_myr), 0);
      const avgConvertRate = totalGlobalRmConverted > 0 ? totalGlobalBdtConverted / totalGlobalRmConverted : 0;

      const data = sortedDates.map(date => {
        const dayOrders = filteredOrders.filter(o => o.date === date);
        const dayConversions = filteredConversions.filter(c => c.date === date);
        const dayExpenses = filteredExpenses.filter(e => e.date === date);

        const totalOrdersRm = dayOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
        const totalOrdersBdt = dayOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
        
        const isAgentSelected = !!(my_agent_id || bd_agent_id);
        const dayProRateFactor = (isAgentSelected && totalGlobalBdtOrder > 0) ? (totalOrdersBdt / totalGlobalBdtOrder) : 1;
        
        const dayGlobalConversions = globalConversions.filter(c => c.date === date);
        const dayGlobalExpenses = globalExpenses.filter(e => e.date === date);
        
        const dayGlobalCharges = dayGlobalConversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
        const dayGlobalExp = dayGlobalExpenses.filter(e => e.currency !== 'BDT').reduce((sum, e) => sum + Number(e.amount_myr), 0);

        const dayCharges = isAgentSelected ? (dayGlobalCharges * dayProRateFactor) : dayGlobalCharges;
        const dayExp = isAgentSelected ? (dayGlobalExp * dayProRateFactor) : dayGlobalExp;

        const totalConvertedRm = avgConvertRate > 0 ? totalOrdersBdt / avgConvertRate : 0;
        const grossProfit = totalOrdersRm - totalConvertedRm;
        const netProfit = grossProfit - dayCharges - dayExp;

        return {
          date,
          total_orders: totalOrdersRm,
          avg_rate: avgConvertRate,
          total_converted: totalConvertedRm,
          gross_profit: grossProfit,
          expenses: dayExp + dayCharges,
          net_profit: netProfit
        };
      });

      return { data, columns: ['Date', 'Total Orders (RM)', 'Avg Rate', 'Total Converted (RM)', 'Gross Profit', 'Expenses & Charges', 'Net Profit'] };
    }

    if (type === 'outstanding') {
      let filteredMyAgents: MYAgent[] = [];
      let filteredBdAgents: BDAgent[] = [];

      if (my_agent_id) {
        filteredMyAgents = myAgents.filter(a => a.id === Number(my_agent_id));
      } else if (bd_agent_id) {
        filteredBdAgents = bdAgents.filter(a => a.id === Number(bd_agent_id));
      } else {
        filteredMyAgents = myAgents;
        filteredBdAgents = bdAgents;
      }

      const myAgentsData = filteredMyAgents.map(agent => {
        const outstanding = calculateOutstanding('MY', agent, orders, myPayments);
        return { 
          agent_name: agent.name, 
          type: 'MY Agent', 
          balance_rm: Math.round(outstanding * 100) / 100,
          balance_tk: 0
        };
      }).filter(a => a.balance_rm !== 0);

      const bdAgentsData = filteredBdAgents.map(agent => {
        const outstanding = calculateOutstanding('BD', agent, orders, bdPayments, conversions);
        return { 
          agent_name: agent.name, 
          type: 'BD Agent', 
          balance_rm: 0,
          balance_tk: Math.round(outstanding * 100) / 100
        };
      }).filter(a => a.balance_tk !== 0);

      const data = [...myAgentsData, ...bdAgentsData];
      const columns = ['Agent Name', 'Agent Type', 'Balance (RM)', 'Balance (Tk)'];
      return { data, columns };
    }

    if (type === 'ledger') {
      let ledgerData: any[] = [];
      let balance = 0;
      let isMyAgent = false;
      let initialDate = '';

      if (my_agent_id) {
        isMyAgent = true;
        const agent = myAgents.find(a => a.id === Number(my_agent_id));
        if (agent) {
          initialDate = agent.initial_balance_date || '';
          let currentBalance = Number(agent.initial_balance) || 0;
          
          const agentOrders = orders.filter(o => o.my_agent_id === agent.id);
          const agentPayments = myPayments.filter(p => p.my_agent_id === agent.id);
          
          let allTransactions = [
            ...agentOrders.map(o => ({ 
              id: o.id,
              date: o.date, 
              desc: 'Order', 
              order_amount: Number(o.amount_bdt), 
              rate: Number(o.rate), 
              debit: Number(o.amount_myr), 
              credit: 0 
            })),
            ...agentPayments.map(p => ({ 
              id: p.id,
              date: p.date, 
              desc: `Payment (${p.payment_method}${p.sub_method ? ' - ' + p.sub_method : ''})`, 
              order_amount: '-', 
              rate: '-', 
              debit: 0, 
              credit: Number(p.amount_myr) 
            }))
          ].sort((a, b) => {
            const dateComparison = String(a.date || '').localeCompare(String(b.date || ''));
            if (dateComparison !== 0) return dateComparison;
            return a.id - b.id;
          });

          if (start_date) {
            const previousTransactions = allTransactions.filter(t => t.date < start_date);
            previousTransactions.forEach(t => {
              currentBalance = currentBalance + t.credit - t.debit;
            });
            ledgerData = allTransactions.filter(t => t.date >= start_date && (!end_date || t.date <= end_date));
          } else {
            ledgerData = end_date ? allTransactions.filter(t => t.date <= end_date) : allTransactions;
          }
          
          balance = currentBalance;
        }
      } else if (bd_agent_id) {
        const agent = bdAgents.find(a => a.id === Number(bd_agent_id));
        if (agent) {
          initialDate = agent.initial_balance_date || '';
          let currentBalance = Number(agent.initial_balance) || 0;

          const agentOrders = orders.filter(o => o.bd_agent_id === agent.id);
          const agentPayments = bdPayments.filter(p => p.bd_agent_id === agent.id);
          const agentConversions = conversions.filter(c => c.pay_to_bd_agent_id === agent.id);
          
          let allTransactions = [
            ...agentOrders.map(o => ({ id: o.id, date: o.date, desc: 'Order', debit: Number(o.amount_bdt), credit: 0 })),
            ...agentPayments.map(p => ({ id: p.id, date: p.date, desc: `Payment (${p.payment_method}${p.sub_method ? ' - ' + p.sub_method : ''})`, debit: 0, credit: Number(p.amount_bdt) })),
            ...agentConversions.map(c => ({ 
              id: c.id,
              date: c.date, 
              desc: 'Conversion Remittance', 
              debit: 0, 
              credit: Number(c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0)))
            }))
          ].sort((a, b) => {
            const dateComparison = String(a.date || '').localeCompare(String(b.date || ''));
            if (dateComparison !== 0) return dateComparison;
            return a.id - b.id;
          });

          if (start_date) {
            const previousTransactions = allTransactions.filter(t => t.date < start_date);
            previousTransactions.forEach(t => {
              currentBalance = currentBalance + t.credit - t.debit;
            });
            ledgerData = allTransactions.filter(t => t.date >= start_date && (!end_date || t.date <= end_date));
          } else {
            ledgerData = end_date ? allTransactions.filter(t => t.date <= end_date) : allTransactions;
          }

          balance = currentBalance;
        }
      }

      const data: any[] = [];
      if (balance !== 0 || start_date) {
          const rowDate = start_date || initialDate || '';
          let initialRow: any = {};
          
          if (isMyAgent) {
            initialRow = {
              date: rowDate,
              desc: start_date ? 'Opening Balance' : 'Initial Balance',
              order_amount: '-',
              rate: '-',
              debit: 0,
              credit: 0,
              balance: balance
            };
          } else {
            initialRow = {
              date: rowDate,
              desc: start_date ? 'Opening Balance' : 'Initial Balance',
              debit: 0,
              credit: 0,
              balance: balance
            };
          }
          data.push(initialRow);
      }

      ledgerData.forEach(item => {
          balance = balance + item.credit - item.debit;
          const row: any = {
              date: item.date,
              desc: item.desc,
          };
          
          if (isMyAgent) {
            row.order_amount = item.order_amount;
            row.rate = item.rate;
          }

          row.debit = item.debit;
          row.credit = item.credit;
          row.balance = balance;
          
          data.push(row);
      });

      const columns = isMyAgent 
        ? ['Date', 'Description', 'Order Amt (BDT)', 'Rate', 'Debit', 'Credit', 'Balance']
        : ['Date', 'Description', 'Debit', 'Credit', 'Balance'];

      return { data, columns };
    }

    return { data: [], columns: [] };
  },

  getBackupData: () => {
    const state = useAppStore.getState();
    return {
      users: state.users,
      myAgents: state.myAgents,
      bdAgents: state.bdAgents,
      orders: state.orders,
      myPayments: state.myPayments,
      bdPayments: state.bdPayments,
      conversions: state.conversions,
      expenses: state.expenses,
      withdrawals: state.withdrawals,
      deposits: state.deposits,
      collectionMethods: state.collectionMethods,
      rateHistory: state.rateHistory,
      loans: state.loans,
      loanTransactions: state.loanTransactions,
      backupDate: new Date().toISOString()
    };
  },

  backupData: () => {
    const data = store.getBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `remitflow_backup_${new Date().toISOString().split('T')[0]}.json`);
  },

  restoreData: (jsonData: string) => {
    try {
      // Basic validation to check if it's a valid JSON string
      const trimmed = jsonData.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        throw new Error('Invalid file format. Please ensure you are uploading a valid JSON backup file.');
      }

      const data = JSON.parse(trimmed);
      
      // Check for required fields to ensure it's a RemitFlow backup
      if (!data.users && !data.myAgents && !data.bdAgents && !data.orders) {
        throw new Error('The uploaded file does not appear to be a valid RemitFlow backup.');
      }

      if (data.users) save('rf_users', data.users);
      if (data.myAgents) save('rf_my_agents', data.myAgents);
      if (data.bdAgents) save('rf_bd_agents', data.bdAgents);
      if (data.orders) save('rf_orders', data.orders);
      if (data.myPayments) save('rf_my_payments', data.myPayments);
      if (data.bdPayments) save('rf_bd_payments', data.bdPayments);
      if (data.conversions) save('rf_conversions', data.conversions);
      if (data.expenses) save('rf_expenses', data.expenses);
      if (data.withdrawals) save('rf_withdrawals', data.withdrawals);
      if (data.deposits) save('rf_deposits', data.deposits);
      if (data.collectionMethods) save('rf_collection_methods', data.collectionMethods);
      if (data.rateHistory) save('rf_rate_history', data.rateHistory);
      
      useAppStore.getState().refresh();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getRateHistory: () => useAppStore.getState().rateHistory,

  getWhatsAppDrafts: () => useAppStore.getState().whatsappDrafts,

  addWhatsAppDraft: async (draft: any) => {
    const newDraft = {
      ...draft,
      id: draft.id || Date.now().toString(),
      status: draft.status || 'pending',
      timestamp: draft.timestamp || new Date().toISOString()
    };
    try {
      await addDoc(collection(db, 'whatsapp_drafts'), newDraft);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'whatsapp_drafts');
    }
    return newDraft;
  },

  updateWhatsAppDraft: async (firebaseId: string, status: 'pending' | 'approved' | 'dismissed', parsedData?: any) => {
    try {
      const draftRef = doc(db, 'whatsapp_drafts', firebaseId);
      const updatePayload: any = { status };
      if (parsedData) {
        updatePayload.parsedAmountBdt = parsedData.parsedAmountBdt !== undefined ? Number(parsedData.parsedAmountBdt) : null;
        updatePayload.parsedRate = parsedData.parsedRate !== undefined ? Number(parsedData.parsedRate) : null;
        updatePayload.parsedAmountMyr = parsedData.parsedAmountMyr !== undefined ? Number(parsedData.parsedAmountMyr) : null;
        updatePayload.parsedType = parsedData.parsedType || null;
        updatePayload.parsedAgentName = parsedData.parsedAgentName || null;
        updatePayload.parsedDirection = parsedData.parsedDirection || null;
      }
      await updateDoc(draftRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'whatsapp_drafts');
    }
  },

  deleteWhatsAppDraft: async (firebaseId: string) => {
    try {
      await deleteDoc(doc(db, 'whatsapp_drafts', firebaseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'whatsapp_drafts');
    }
  },

  updateRateHistoryItem: (id: number, mobileRate: number, bankRate: number) => useAppStore.getState().updateRateHistoryItem(id, mobileRate, bankRate)
};
