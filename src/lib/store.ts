import { create } from 'zustand';
import { saveAs } from 'file-saver';
import { MYAgent, BDAgent, Order, MYPayment, BDPayment, Conversion, Expense, User, CollectionMethod, Withdrawal, Deposit, RateHistory } from '../types';

// Helper to load/save from localStorage
const load = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const save = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

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
  save('rf_users', [{ id: 1, username: 'admin', password: 'password123', role: 'admin' }]);
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
  defaultRate: number;
  rateHistory: RateHistory[];
  stats: any;
  
  // Actions
  refresh: () => void;
  setDefaultRate: (rate: number, date?: string) => void;
}

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
  defaultRate: Number(localStorage.getItem('rf_default_rate') || 0),
  rateHistory: load('rf_rate_history'),
  stats: null,

  refresh: () => {
    const users = load('rf_users');
    const myAgentsRaw = load('rf_my_agents') as MYAgent[];
    const bdAgentsRaw = load('rf_bd_agents') as BDAgent[];
    const orders = load('rf_orders') as Order[];
    const myPayments = load('rf_my_payments') as MYPayment[];
    const bdPayments = load('rf_bd_payments') as BDPayment[];
    const conversions = load('rf_conversions') as Conversion[];
    const expenses = (load('rf_expenses') as Expense[]).map(e => ({ ...e, currency: e.currency || 'MYR' }));
    const withdrawals = load('rf_withdrawals') as Withdrawal[];
    const deposits = load('rf_deposits') as Deposit[];
    const rateHistory = load('rf_rate_history') as RateHistory[];
    const collectionMethods = (load('rf_collection_methods') as CollectionMethod[]).map(m => ({ ...m, type: m.type || 'MY' }));

    const myAgents = myAgentsRaw.map(agent => ({
      ...agent,
      total_orders_myr: orders.filter(o => o.my_agent_id === agent.id).reduce((sum, o) => sum + Number(o.amount_myr), 0),
      total_payments_myr: myPayments.filter(p => p.my_agent_id === agent.id).reduce((sum, p) => sum + Number(p.amount_myr), 0),
      initial_balance: Number(agent.initial_balance) || 0,
      outstanding: calculateOutstanding('MY', agent, orders, myPayments)
    })).sort((a, b) => a.name.localeCompare(b.name));

    const bdAgents = bdAgentsRaw.map(agent => {
      const agentConversions = conversions.filter(c => c.pay_to_bd_agent_id === agent.id);
      const conversionTotal = agentConversions.reduce((sum, c) => sum + (c.total_bd_received || (Number(c.amount_bdt) + (c.commission_amount || 0))), 0);
      
      return {
        ...agent,
        total_orders_bdt: orders.filter(o => o.bd_agent_id === agent.id).reduce((sum, o) => sum + Number(o.amount_bdt), 0),
        total_payments_bdt: bdPayments.filter(p => p.bd_agent_id === agent.id).reduce((sum, p) => sum + Number(p.amount_bdt), 0) + conversionTotal,
        initial_balance: Number(agent.initial_balance) || 0,
        outstanding: calculateOutstanding('BD', agent, orders, bdPayments, conversions)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const todayOrders = orders.filter(o => o.date === today);
    const yesterdayOrders = orders.filter(o => o.date === yesterday);
    
    const totalBdtOrder = orders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
    const totalRmOrderActual = orders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
    
    const totalBdtConverted = conversions.reduce((sum, c) => sum + Number(c.total_bd_received || c.amount_bdt), 0);
    const totalRmConverted = conversions.reduce((sum, c) => sum + Number(c.amount_myr), 0);
    const avgConvertRate = totalRmConverted > 0 ? totalBdtConverted / totalRmConverted : 0;
    
    const totalConvertedRmCalculated = avgConvertRate > 0 ? totalBdtOrder / avgConvertRate : 0;
    const grossProfit = totalRmOrderActual - totalConvertedRmCalculated;
    const totalCharges = conversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
    const totalExp = expenses.filter(e => e.currency === 'MYR').reduce((sum, e) => sum + Number(e.amount_myr), 0);
    const netProfit = grossProfit - totalCharges - totalExp;

    // Daily Stats for Comparison
    const getDailyStats = (dateOrders: Order[], dateExpenses: Expense[], dateConversions: Conversion[]) => {
      const volMyr = dateOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0);
      const volBdt = dateOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0);
      const exp = dateExpenses.filter(e => e.currency === 'MYR').reduce((sum, e) => sum + Number(e.amount_myr), 0);
      const charges = dateConversions.reduce((sum, c) => sum + Number(c.bank_charges), 0);
      
      const convertedRm = avgConvertRate > 0 ? volBdt / avgConvertRate : 0;
      const profit = volMyr - convertedRm - exp - charges;
      
      return { count: dateOrders.length, volume: volMyr, profit, expenses: exp };
    };

    const todayExpenses = expenses.filter(e => e.date === today);
    const todayConversions = conversions.filter(c => c.date === today);
    const yesterdayExpenses = expenses.filter(e => e.date === yesterday);
    const yesterdayConversions = conversions.filter(c => c.date === yesterday);

    const todayPerformance = getDailyStats(todayOrders, todayExpenses, todayConversions);
    const yesterdayPerformance = getDailyStats(yesterdayOrders, yesterdayExpenses, yesterdayConversions);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const changes = {
      count: calculateChange(todayPerformance.count, yesterdayPerformance.count),
      volume: calculateChange(todayPerformance.volume, yesterdayPerformance.volume),
      profit: calculateChange(todayPerformance.profit, yesterdayPerformance.profit),
      expenses: calculateChange(todayPerformance.expenses, yesterdayPerformance.expenses)
    };

    const agentsOutstanding = myAgents.map(agent => ({ 
      name: agent.name, 
      outstanding: Number(agent.outstanding.toFixed(2)) 
    })).filter(a => a.outstanding !== 0).sort((a, b) => a.name.localeCompare(b.name));

    const bdAgentsOutstanding = bdAgents.map(agent => ({ 
      name: agent.name, 
      outstanding: Number(agent.outstanding.toFixed(2)) 
    })).filter(a => a.outstanding !== 0).sort((a, b) => a.name.localeCompare(b.name));

    const bankBalances = collectionMethods.map(m => {
      const initialBalance = Number(m.initial_balance) || 0;
      const subItemsInitialBalance = m.subItems.reduce((sum, s) => sum + (Number(s.initial_balance) || 0), 0);
      const totalInitialBalance = initialBalance + subItemsInitialBalance;

      if (m.type === 'BD') {
        const inAmount = bdPayments.filter(p => p.payment_method === m.name).reduce((sum, p) => sum + Number(p.amount_bdt), 0);
        const inAmountManual = deposits.filter(d => d.method_name === m.name && d.agent_type === 'BD').reduce((sum, d) => sum + Number(d.amount), 0);
        const outAmount = withdrawals.filter(w => w.method_name === m.name && w.agent_type === 'BD').reduce((sum, w) => sum + Number(w.amount), 0);
        const orderCharges = orders.filter(o => o.bd_agent_id === bdAgentsRaw.find(a => a.name === m.name)?.id).reduce((sum, o) => sum + (Number(o.charge) || 0), 0);
        return { name: m.name, type: 'BD', balance: totalInitialBalance + inAmount + inAmountManual - outAmount - orderCharges, currency: 'BDT' };
      }
      
      const inAmount = myPayments.filter(p => p.payment_method === m.name).reduce((sum, p) => sum + Number(p.amount_myr), 0);
      const inAmountManual = deposits.filter(d => d.method_name === m.name && d.agent_type === 'MY').reduce((sum, d) => sum + Number(d.amount), 0);
      const outAmount = withdrawals.filter(w => w.method_name === m.name && w.agent_type === 'MY').reduce((sum, w) => sum + Number(w.amount), 0);
      return { name: m.name, type: 'MY', balance: totalInitialBalance + inAmount + inAmountManual - outAmount, currency: 'MYR' };
    }).filter(b => b.balance !== 0);

    const stats = {
      today: {
        count: todayOrders.length,
        total_myr: todayOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0),
        total_bdt: todayOrders.reduce((sum, o) => sum + Number(o.amount_bdt), 0)
      },
      changes,
      netProfit,
      profitBreakdown: {
        totalBdtOrder,
        totalRmOrder: totalRmOrderActual,
        avgConvertRate,
        totalConvertedRm: totalConvertedRmCalculated,
        grossProfit,
        bankCharges: totalCharges,
        expenses: totalExp,
        netProfit
      },
      myAgentsOutstanding: {
        agents: agentsOutstanding,
        total: agentsOutstanding.reduce((sum, a) => sum + a.outstanding, 0)
      },
      bdAgentsOutstanding: {
        agents: bdAgentsOutstanding,
        total: bdAgentsOutstanding.reduce((sum, a) => sum + a.outstanding, 0)
      },
      bankBalances,
      expenses: {
        total_myr: totalExp
      },
      recentTransactions: orders.slice(0, 5).map(o => ({ ...o, my_agent_name: myAgents.find(a => a.id === o.my_agent_id)?.name || '-' }))
    };

    set({ 
      users, 
      myAgents, 
      bdAgents, 
      orders, 
      myPayments, 
      bdPayments, 
      conversions, 
      expenses, 
      withdrawals, 
      deposits,
      collectionMethods,
      rateHistory,
      stats
    });
  },

  setDefaultRate: (rate: number, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    localStorage.setItem('rf_default_rate', rate.toString());
    const history = load('rf_rate_history') as RateHistory[];
    
    // Update or add history for the selected date
    const index = history.findIndex(h => h.date === targetDate);
    if (index !== -1) {
      history[index].rate = rate;
    } else {
      history.push({ id: Date.now(), rate, date: targetDate });
    }
    
    save('rf_rate_history', history);
    set({ defaultRate: rate, rateHistory: history });
  }
}));

// Initialize store data
useAppStore.getState().refresh();

export const store = {
  getUsers: () => useAppStore.getState().users,
  
  getMYAgents: () => useAppStore.getState().myAgents,

  addMYAgent: (name: string, initial_balance: number, initial_balance_date?: string) => {
    const agents = load('rf_my_agents');
    const newAgent = { 
      id: Date.now(), 
      name, 
      initial_balance: Number(initial_balance) || 0, 
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      phone: '', 
      default_bkash_rate: 0, 
      default_bank_rate: 0 
    };
    save('rf_my_agents', [...agents, newAgent]);
    useAppStore.getState().refresh();
    return newAgent;
  },

  updateMYAgent: (id: number, data: any) => {
    const agents = load('rf_my_agents') as MYAgent[];
    const index = agents.findIndex(a => a.id === id);
    if (index !== -1) {
      const existing = agents[index];
      agents[index] = { 
        ...existing, 
        ...data, 
        initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : existing.initial_balance,
        initial_balance_date: data.initial_balance_date || existing.initial_balance_date
      };
      save('rf_my_agents', agents);
      useAppStore.getState().refresh();
    }
  },

  deleteMYAgent: (id: number) => {
    const agents = load('rf_my_agents') as MYAgent[];
    save('rf_my_agents', agents.filter(a => a.id !== id));
    useAppStore.getState().refresh();
  },

  getBDAgents: () => useAppStore.getState().bdAgents,

  addBDAgent: (name: string, initial_balance: number, initial_balance_date?: string) => {
    const agents = load('rf_bd_agents');
    const newAgent = { 
      id: Date.now(), 
      name, 
      initial_balance: Number(initial_balance) || 0, 
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      phone: '' 
    };
    save('rf_bd_agents', [...agents, newAgent]);
    useAppStore.getState().refresh();
    return newAgent;
  },

  updateBDAgent: (id: number, data: any) => {
    const agents = load('rf_bd_agents') as BDAgent[];
    const index = agents.findIndex(a => a.id === id);
    if (index !== -1) {
      const existing = agents[index];
      agents[index] = { 
        ...existing, 
        ...data, 
        initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : existing.initial_balance,
        initial_balance_date: data.initial_balance_date || existing.initial_balance_date
      };
      save('rf_bd_agents', agents);
      useAppStore.getState().refresh();
    }
  },

  deleteBDAgent: (id: number) => {
    const agents = load('rf_bd_agents') as BDAgent[];
    save('rf_bd_agents', agents.filter(a => a.id !== id));
    useAppStore.getState().refresh();
  },

  getOrders: () => {
    const { orders, myAgents, bdAgents } = useAppStore.getState();
    return orders.map(o => ({
      ...o,
      my_agent_name: myAgents.find(a => a.id === o.my_agent_id)?.name || 'Unknown',
      bd_agent_name: bdAgents.find(a => a.id === o.bd_agent_id)?.name || 'Unknown',
    })).sort((a, b) => b.date.localeCompare(a.date));
  },

  addOrder: (data: any) => {
    const orders = load('rf_orders');
    const expenses = load('rf_expenses');
    const { myAgents, bdAgents } = useAppStore.getState();
    const my_agent_id = Number(data.my_agent_id);
    const bd_agent_id = Number(data.bd_agent_id);
    const my_agent_name = myAgents.find(a => a.id === my_agent_id)?.name || 'Unknown';
    const bd_agent_name = bdAgents.find(a => a.id === bd_agent_id)?.name || 'Unknown';
    const orderId = Date.now();
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
      bd_agent_name
    };
    save('rf_orders', [...orders, newOrder]);

    // Handle Charge as Expense
    if (newOrder.charge > 0) {
      const newExpense: Expense = {
        id: Date.now() + 1,
        amount_myr: newOrder.charge,
        currency: 'BDT',
        category: 'Order Charge',
        date: newOrder.date,
        note: `Charge for order with ${bd_agent_name}`,
        order_id: orderId
      };
      save('rf_expenses', [...expenses, newExpense]);
    }

    useAppStore.getState().refresh();
    return newOrder;
  },

  updateOrder: (id: number, data: any) => {
    const orders = load('rf_orders') as Order[];
    const expenses = load('rf_expenses') as Expense[];
    const { myAgents, bdAgents } = useAppStore.getState();
    let updatedExpenses = [...expenses];

    const updated = orders.map(o => {
      if (o.id === id) {
        const my_agent_id = data.my_agent_id !== undefined ? Number(data.my_agent_id) : o.my_agent_id;
        const bd_agent_id = data.bd_agent_id !== undefined ? Number(data.bd_agent_id) : o.bd_agent_id;
        const my_agent_name = myAgents.find(a => a.id === my_agent_id)?.name || 'Unknown';
        const bd_agent_name = bdAgents.find(a => a.id === bd_agent_id)?.name || 'Unknown';
        
        const updatedOrder = { 
          ...o, 
          ...data, 
          amount_bdt: data.amount_bdt !== undefined ? Number(data.amount_bdt) : o.amount_bdt, 
          rate: data.rate !== undefined ? Number(data.rate) : o.rate, 
          amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : o.amount_myr, 
          charge: data.charge !== undefined ? Number(data.charge) : (o.charge || 0),
          my_agent_id,
          bd_agent_id,
          my_agent_name,
          bd_agent_name
        };

        // Update Expense
        updatedExpenses = updatedExpenses.filter(e => e.order_id !== id);
        if (updatedOrder.charge > 0) {
          updatedExpenses.push({
            id: Date.now() + 2,
            amount_myr: updatedOrder.charge,
            currency: 'BDT',
            category: 'Order Charge',
            date: updatedOrder.date,
            note: `Charge for order with ${bd_agent_name}`,
            order_id: id
          });
        }

        return updatedOrder;
      }
      return o;
    });

    save('rf_orders', updated);
    save('rf_expenses', updatedExpenses);
    useAppStore.getState().refresh();
  },

  deleteOrder: (id: number) => {
    const orders = load('rf_orders') as Order[];
    const expenses = load('rf_expenses') as Expense[];
    save('rf_orders', orders.filter(o => o.id !== id));
    save('rf_expenses', expenses.filter(e => e.order_id !== id));
    useAppStore.getState().refresh();
  },

  getCollectionMethods: () => useAppStore.getState().collectionMethods,
  addCollectionMethod: (name: string, type: 'MY' | 'BD', initial_balance?: number, initial_balance_date?: string) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    const newMethod = { 
      id: Date.now(), 
      name, 
      type, 
      initial_balance: Number(initial_balance) || 0,
      initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0],
      subItems: [] 
    };
    save('rf_collection_methods', [...methods, newMethod]);
    useAppStore.getState().refresh();
    return newMethod;
  },
  deleteCollectionMethod: (id: number) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    save('rf_collection_methods', methods.filter(m => m.id !== id));
    useAppStore.getState().refresh();
  },
  updateCollectionMethod: (id: number, data: any) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    const updated = methods.map(m => m.id === id ? { 
      ...m, 
      ...data,
      initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : m.initial_balance,
      initial_balance_date: data.initial_balance_date || m.initial_balance_date
    } : m);
    save('rf_collection_methods', updated);
    useAppStore.getState().refresh();
  },
  addCollectionMethodSubItem: (methodId: number, name: string, initial_balance?: number, initial_balance_date?: string) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    const method = methods.find(m => m.id === methodId);
    if (method) {
      method.subItems.push({ 
        id: Date.now(), 
        name,
        initial_balance: Number(initial_balance) || 0,
        initial_balance_date: initial_balance_date || new Date().toISOString().split('T')[0]
      });
      save('rf_collection_methods', methods);
      useAppStore.getState().refresh();
    }
  },
  deleteCollectionMethodSubItem: (methodId: number, subItemId: number) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    const method = methods.find(m => m.id === methodId);
    if (method) {
      method.subItems = method.subItems.filter(s => s.id !== subItemId);
      save('rf_collection_methods', methods);
      useAppStore.getState().refresh();
    }
  },
  updateCollectionMethodSubItem: (methodId: number, subItemId: number, data: any) => {
    const methods = load('rf_collection_methods') as CollectionMethod[];
    const method = methods.find(m => m.id === methodId);
    if (method) {
      method.subItems = method.subItems.map(s => s.id === subItemId ? { 
        ...s, 
        ...data,
        initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : s.initial_balance,
        initial_balance_date: data.initial_balance_date || s.initial_balance_date
      } : s);
      save('rf_collection_methods', methods);
      useAppStore.getState().refresh();
    }
  },

  getMYPayments: (agentId: number) => {
    const { myPayments } = useAppStore.getState();
    return myPayments
      .filter(p => p.my_agent_id === Number(agentId))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getAllMYPayments: () => useAppStore.getState().myPayments,

  addMYPayment: (data: any) => {
    const payments = load('rf_my_payments');
    const newPayment = { 
      ...data, 
      id: Date.now(), 
      amount_myr: Number(data.amount_myr), 
      my_agent_id: Number(data.my_agent_id)
    };
    save('rf_my_payments', [...payments, newPayment]);
    
    if (data.order_ids?.length > 0) {
      const orders = load('rf_orders') as Order[];
      const updated = orders.map(o => data.order_ids.includes(o.id) ? { ...o, status: 'paid' } : o);
      save('rf_orders', updated);
    }
    useAppStore.getState().refresh();
    return newPayment;
  },

  deleteMYPayment: (id: number) => {
    const payments = load('rf_my_payments') as MYPayment[];
    const payment = payments.find(p => p.id === id);

    if (payment && payment.order_ids && payment.order_ids.length > 0) {
      const orders = load('rf_orders') as Order[];
      const updatedOrders = orders.map(o => 
        payment.order_ids?.includes(o.id) ? { ...o, status: 'unpaid' } : o
      );
      save('rf_orders', updatedOrders);
    }

    save('rf_my_payments', payments.filter(p => p.id !== id));
    useAppStore.getState().refresh();
  },

  updateMYPayment: (id: number, data: any) => {
    const payments = load('rf_my_payments') as MYPayment[];
    const index = payments.findIndex(p => p.id === id);
    if (index !== -1) {
      const existing = payments[index];
      payments[index] = { 
        ...existing, 
        ...data, 
        amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : existing.amount_myr, 
        my_agent_id: data.my_agent_id !== undefined ? Number(data.my_agent_id) : existing.my_agent_id 
      };
      save('rf_my_payments', payments);
      useAppStore.getState().refresh();
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
      .sort((a, b) => b.date.localeCompare(a.date));
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

  addBDPayment: (data: any) => {
    const payments = load('rf_bd_payments');
    const newPayment = { 
      ...data, 
      id: Date.now(), 
      amount_bdt: Number(data.amount_bdt), 
      bd_agent_id: Number(data.bd_agent_id)
    };
    save('rf_bd_payments', [...payments, newPayment]);
    
    if (data.order_ids?.length > 0) {
      const orders = load('rf_orders') as Order[];
      const updated = orders.map(o => data.order_ids.includes(o.id) ? { ...o, status: 'paid' } : o);
      save('rf_orders', updated);
    }
    useAppStore.getState().refresh();
    return newPayment;
  },

  deleteBDPayment: (id: number) => {
    const payments = load('rf_bd_payments') as BDPayment[];
    const payment = payments.find(p => p.id === id);
    
    if (payment && payment.order_ids && payment.order_ids.length > 0) {
      const orders = load('rf_orders') as Order[];
      const updatedOrders = orders.map(o => 
        payment.order_ids?.includes(o.id) ? { ...o, status: 'unpaid' } : o
      );
      save('rf_orders', updatedOrders);
    }

    save('rf_bd_payments', payments.filter(p => p.id !== id));
    useAppStore.getState().refresh();
  },

  updateBDPayment: (id: number, data: any) => {
    const payments = load('rf_bd_payments') as BDPayment[];
    const index = payments.findIndex(p => p.id === id);
    if (index !== -1) {
      const existing = payments[index];
      payments[index] = { 
        ...existing, 
        ...data, 
        amount_bdt: data.amount_bdt !== undefined ? Number(data.amount_bdt) : existing.amount_bdt, 
        bd_agent_id: data.bd_agent_id !== undefined ? Number(data.bd_agent_id) : existing.bd_agent_id 
      };
      save('rf_bd_payments', payments);
      useAppStore.getState().refresh();
    }
  },

  getConversions: () => useAppStore.getState().conversions,
  addConversion: (data: any) => {
    const items = load('rf_conversions');
    const commission_amount = data.commission_enabled ? Number(data.amount_bdt) * 0.025 : 0;
    const total_bd_received = Number(data.amount_bdt) + commission_amount;
    
    const newItem = { 
      ...data, 
      id: Date.now(), 
      amount_myr: Number(data.amount_myr), 
      rate: Number(data.rate), 
      amount_bdt: Number(data.amount_bdt), 
      bank_charges: Number(data.bank_charges),
      commission_enabled: data.commission_enabled,
      commission_amount,
      total_bd_received,
      pay_to_bd_agent_id: data.pay_to_bd_agent_id ? Number(data.pay_to_bd_agent_id) : undefined
    };
    save('rf_conversions', [...items, newItem]);
    useAppStore.getState().refresh();
    return newItem;
  },

  updateConversion: (id: number, data: any) => {
    const items = load('rf_conversions') as Conversion[];
    const index = items.findIndex(c => c.id === id);
    if (index !== -1) {
      const existing = items[index];
      const amount_bdt = data.amount_bdt !== undefined ? Number(data.amount_bdt) : existing.amount_bdt;
      const commission_enabled = data.commission_enabled !== undefined ? data.commission_enabled : existing.commission_enabled;
      const commission_amount = commission_enabled ? amount_bdt * 0.025 : 0;
      const total_bd_received = amount_bdt + commission_amount;

      items[index] = { 
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
      save('rf_conversions', items);
      useAppStore.getState().refresh();
    }
  },

  deleteConversion: (id: number) => {
    const items = load('rf_conversions') as Conversion[];
    save('rf_conversions', items.filter(c => c.id !== id));
    useAppStore.getState().refresh();
  },

  getExpenses: () => useAppStore.getState().expenses,
  addExpense: (data: any) => {
    const items = load('rf_expenses');
    const newItem = { ...data, id: Date.now(), amount_myr: Number(data.amount_myr) };
    save('rf_expenses', [...items, newItem]);
    useAppStore.getState().refresh();
    return newItem;
  },

  updateExpense: (id: number, data: any) => {
    const items = load('rf_expenses') as Expense[];
    const index = items.findIndex(e => e.id === id);
    if (index !== -1) {
      const existing = items[index];
      items[index] = { 
        ...existing, 
        ...data, 
        amount_myr: data.amount_myr !== undefined ? Number(data.amount_myr) : existing.amount_myr 
      };
      save('rf_expenses', items);
      useAppStore.getState().refresh();
    }
  },

  deleteExpense: (id: number) => {
    const items = load('rf_expenses') as Expense[];
    save('rf_expenses', items.filter(e => e.id !== id));
    useAppStore.getState().refresh();
  },

  getWithdrawals: () => useAppStore.getState().withdrawals,
  addWithdrawal: (data: any) => {
    const items = load('rf_withdrawals');
    const newItem = { 
      ...data, 
      id: Date.now(), 
      amount: Number(data.amount),
      agent_id: Number(data.agent_id)
    };
    save('rf_withdrawals', [...items, newItem]);
    useAppStore.getState().refresh();
    return newItem;
  },
  updateWithdrawal: (id: number, data: any) => {
    const items = load('rf_withdrawals') as Withdrawal[];
    const index = items.findIndex(w => w.id === id);
    if (index !== -1) {
      const existing = items[index];
      items[index] = { 
        ...existing, 
        ...data, 
        amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
        agent_id: data.agent_id !== undefined ? Number(data.agent_id) : existing.agent_id
      };
      save('rf_withdrawals', items);
      useAppStore.getState().refresh();
    }
  },
  deleteWithdrawal: (id: number) => {
    const items = load('rf_withdrawals') as Withdrawal[];
    save('rf_withdrawals', items.filter(w => w.id !== id));
    useAppStore.getState().refresh();
  },
  
  getDeposits: () => useAppStore.getState().deposits,
  addDeposit: (data: any) => {
    const items = load('rf_deposits');
    const newItem = { 
      ...data, 
      id: Date.now(), 
      amount: Number(data.amount),
      agent_id: Number(data.agent_id)
    };
    save('rf_deposits', [...items, newItem]);
    useAppStore.getState().refresh();
    return newItem;
  },
  updateDeposit: (id: number, data: any) => {
    const items = load('rf_deposits') as Deposit[];
    const index = items.findIndex(d => d.id === id);
    if (index !== -1) {
      const existing = items[index];
      items[index] = { 
        ...existing, 
        ...data, 
        amount: data.amount !== undefined ? Number(data.amount) : existing.amount,
        agent_id: data.agent_id !== undefined ? Number(data.agent_id) : existing.agent_id
      };
      save('rf_deposits', items);
      useAppStore.getState().refresh();
    }
  },
  deleteDeposit: (id: number) => {
    const items = load('rf_deposits') as Deposit[];
    save('rf_deposits', items.filter(d => d.id !== id));
    useAppStore.getState().refresh();
  },

  getCollectionReport: (start_date?: string, end_date?: string, my_agent_id?: string, bd_agent_id?: string) => {
    const { myPayments, withdrawals } = useAppStore.getState();
    
    const filteredPayments = myPayments.filter(p => {
      if (start_date && p.date < start_date) return false;
      if (end_date && p.date > end_date) return false;
      if (my_agent_id && p.my_agent_id !== Number(my_agent_id)) return false;
      // BD agent filter doesn't directly apply to MY payments in this report
      if (bd_agent_id) return false; 
      return true;
    });

    const filteredWithdrawals = withdrawals.filter(w => {
      if (w.agent_type !== 'MY') return false;
      if (start_date && w.date < start_date) return false;
      if (end_date && w.date > end_date) return false;
      if (my_agent_id && w.agent_id !== Number(my_agent_id)) return false;
      if (bd_agent_id) return false;
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
    ].sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    
    // If there's a start_date, we need to calculate the opening balance
    if (start_date) {
      const pastPayments = myPayments.filter(p => {
        if (p.date >= start_date) return false;
        if (my_agent_id && p.my_agent_id !== Number(my_agent_id)) return false;
        if (bd_agent_id) return false;
        return true;
      });
      const pastWithdrawals = withdrawals.filter(w => {
        if (w.agent_type !== 'MY' || w.date >= start_date) return false;
        if (my_agent_id && w.agent_id !== Number(my_agent_id)) return false;
        if (bd_agent_id) return false;
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
      
      if (my_agent_id) {
        const agentId = Number(my_agent_id);
        if ('my_agent_id' in item) {
          if (item.my_agent_id !== agentId) match = false;
        } else {
          // If filtering by MY Agent, exclude items that are BD-only (like BD payments or conversions not linked to MY agents)
          // Note: Conversions in this system don't have my_agent_id, they are global or linked to BD agents.
          // Orders have both, so they are handled by the 'my_agent_id' in item check.
          if ('bd_agent_id' in item || isConversion) match = false;
        }
      }
      
      if (bd_agent_id) {
        const agentId = Number(bd_agent_id);
        if (isConversion) {
          if (item.pay_to_bd_agent_id !== agentId) match = false;
        } else if ('bd_agent_id' in item) {
          if (item.bd_agent_id !== agentId) match = false;
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
      
      const isAgentSelected = !!(my_agent_id || bd_agent_id);
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
      const data = filter(orders).sort((a, b) => b.date.localeCompare(a.date)).map(o => ({
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

      const data = [...myP, ...bdP, ...convP].sort((a, b) => a.date.localeCompare(b.date)).map(p => ({
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
        const dayGlobalExp = dayGlobalExpenses.reduce((sum, e) => sum + Number(e.amount_myr), 0);

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
            const dateComparison = a.date.localeCompare(b.date);
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
            const dateComparison = a.date.localeCompare(b.date);
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
    return {
      users: load('rf_users'),
      myAgents: load('rf_my_agents'),
      bdAgents: load('rf_bd_agents'),
      orders: load('rf_orders'),
      myPayments: load('rf_my_payments'),
      bdPayments: load('rf_bd_payments'),
      conversions: load('rf_conversions'),
      expenses: load('rf_expenses'),
      withdrawals: load('rf_withdrawals'),
      deposits: load('rf_deposits'),
      collectionMethods: load('rf_collection_methods'),
      defaultRate: localStorage.getItem('rf_default_rate'),
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
      if (data.defaultRate) localStorage.setItem('rf_default_rate', data.defaultRate);
      
      useAppStore.getState().refresh();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getRateHistory: () => useAppStore.getState().rateHistory
};
