import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Globe, 
  ArrowRightLeft, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Plus,
  Search,
  ChevronDown,
  TrendingUp,
  Wallet,
  Clock,
  Banknote,
  AlertCircle,
  Trash2,
  Eye,
  Edit,
  RefreshCw,
  CreditCard,
  Sun,
  Moon,
  Scale,
  FileText,
  Check,
  Download,
  ArrowUpDown,
  Calculator
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn, formatCurrency, formatDate } from './lib/utils';
import { store, useAppStore } from './lib/store';
import { User, MYAgent, BDAgent, Order, MYPayment, BDPayment, Conversion, Expense, CollectionMethod, Withdrawal } from './types';

// --- Components ---

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden", className)} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  type = 'button',
  form,
  disabled,
  size = 'md'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'default';
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  key?: any;
}) => {
  const variants = {
    primary: 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100',
    default: 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 dark:hover:bg-slate-100',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      type={type}
      form={form}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant as keyof typeof variants] || variants.primary,
        sizes[size as keyof typeof sizes] || sizes.md,
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ label, className, helpText, ...props }: { label?: string; helpText?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
    <input 
      {...props} 
      className={cn("w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent outline-none transition-all text-xs dark:text-white", className)}
    />
    {helpText && <p className="text-[10px] text-slate-500">{helpText}</p>}
  </div>
);

const Select = ({ label, options, ...props }: { label?: string; options: { value: any; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      <select 
        {...props} 
        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent outline-none transition-all appearance-none text-xs dark:text-white"
      >
        {options.map((opt, idx) => <option key={`${opt.value}-${idx}`} value={opt.value}>{opt.label}</option>)}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  </div>
);

const SearchableSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder = "Select an option",
  required 
}: { 
  label?: string; 
  value: string | number; 
  options: { value: any; label: string }[]; 
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(opt => opt.value.toString() === value.toString());
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1">
      {label && <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>}
      <div 
        onClick={() => setIsOpen(true)}
        className={cn(
          "w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer flex items-center justify-between text-xs dark:text-white min-h-[32px]",
          !selectedOption && "text-slate-400"
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
      </div>

      {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div 
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm dark:text-white">{label || "Select Option"}</h3>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <Plus className="rotate-45 w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
                  <div 
                    key={`${opt.value}-${idx}`}
                    onClick={() => {
                      onChange(opt.value.toString());
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group",
                      value.toString() === opt.value.toString() 
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="text-sm">{opt.label}</span>
                    {value.toString() === opt.value.toString() && <Check size={16} />}
                  </div>
                )) : (
                  <div className="py-8 text-center text-slate-500 text-sm">No results found</div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

// --- Modals ---

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <AlertCircle size={24} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>Delete</Button>
        </div>
      </div>
    </div>
  );
};


const PaymentModal = ({ 
  isOpen, 
  onClose, 
  agent, 
  type, 
  token, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: any; 
  type: 'MY' | 'BD'; 
  token: string;
  onSuccess: () => void;
}) => {
  const { orders, bdAgents: allBdAgents, collectionMethods } = useAppStore();
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    sub_method: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [bdAgents, setBdAgents] = useState<any[]>([]);
  const [transferFromAgentId, setTransferFromAgentId] = useState('');
  const [isTransfer, setIsTransfer] = useState(false);

  const filteredMethods = collectionMethods.filter(m => (m.type || 'MY') === type);

  useEffect(() => {
    if (isOpen && agent) {
      const filtered = orders.filter(o => type === 'MY' ? o.my_agent_id === agent.id : o.bd_agent_id === agent.id);
      // Prioritize unpaid orders and sort by date descending
      const unpaid = filtered.filter(o => o.status !== 'paid').sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      const paid = filtered.filter(o => o.status === 'paid').sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      
      setRecentOrders([...unpaid, ...paid]);

      if (type === 'BD') {
        const agents = allBdAgents.filter((a: any) => a.id !== agent.id);
        setBdAgents(agents);
      }
    } else {
      setSelectedOrders(new Set());
      setRecentOrders([]);
      setTransferFromAgentId('');
      setIsTransfer(false);
    }
  }, [isOpen, agent, type, orders, allBdAgents]);

  if (!isOpen) return null;

  const toggleOrder = (order: any) => {
    if (order.status === 'paid') return; // Cannot select paid orders
    
    const newSet = new Set(selectedOrders);
    if (newSet.has(order.id)) {
      newSet.delete(order.id);
    } else {
      newSet.add(order.id);
    }
    setSelectedOrders(newSet);
    
    let total = 0;
    recentOrders.forEach(o => {
      if (newSet.has(o.id)) {
        total += type === 'MY' ? o.amount_myr : o.amount_bdt;
      }
    });
    setFormData(prev => ({ ...prev, amount: total > 0 ? total.toFixed(2) : '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'BD' && isTransfer && transferFromAgentId) {
       const amount = parseFloat(formData.amount);
       const sourceAgent = bdAgents.find(a => a.id === parseInt(transferFromAgentId));
       
       // Credit current agent
       store.addBDPayment({ 
         bd_agent_id: agent.id, 
         amount_bdt: amount, 
         payment_method: formData.payment_method, 
         date: formData.date, 
         note: `Transfer from ${sourceAgent?.name}. ${formData.note}`, 
         order_ids: Array.from(selectedOrders) 
       });

       // Debit source agent
       store.addBDPayment({ 
         bd_agent_id: parseInt(transferFromAgentId), 
         amount_bdt: -amount, 
         payment_method: formData.payment_method, 
         date: formData.date, 
         note: `Transfer to ${agent.name}. ${formData.note}`, 
         order_ids: [] 
       });
    } else {
      const payload = type === 'MY' 
        ? { my_agent_id: agent.id, amount_myr: parseFloat(formData.amount), payment_method: formData.payment_method, sub_method: formData.sub_method, date: formData.date, note: formData.note, order_ids: Array.from(selectedOrders) }
        : { bd_agent_id: agent.id, amount_bdt: parseFloat(formData.amount), payment_method: formData.payment_method, sub_method: formData.sub_method, date: formData.date, note: formData.note, order_ids: Array.from(selectedOrders) };

      if (type === 'MY') {
        store.addMYPayment(payload);
      } else {
        store.addBDPayment(payload);
      }
    }

    setFormData({
      amount: '',
      payment_method: '',
      sub_method: '',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setTransferFromAgentId('');
    setIsTransfer(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Payment - {agent.name}</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              {type === 'MY' ? 'Incoming Funds (RM)' : 'Outgoing Funds (BDT)'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
        </div>
        
        <div className="grid gap-6 flex-1 grid-cols-1 md:grid-cols-2">
          <div>
            <Card className="p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Payment Details</h3>
              <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
                <Input 
                  label={`Amount (${type === 'MY' ? 'RM' : 'BDT'})`} 
                  type="number" 
                  step="0.01" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  required 
                />
                
                {type === 'BD' && (
                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      id="is_transfer" 
                      checked={isTransfer} 
                      onChange={e => {
                        setIsTransfer(e.target.checked);
                        if (!e.target.checked) setTransferFromAgentId('');
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-slate-900 dark:focus:ring-white"
                    />
                    <label htmlFor="is_transfer" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Transfer from another agent?
                    </label>
                  </div>
                )}

                {isTransfer && (
                  <SearchableSelect 
                    label="Transfer From Agent" 
                    value={transferFromAgentId} 
                    onChange={val => setTransferFromAgentId(val)}
                    options={[{value: '', label: 'Select Source Agent'}, ...bdAgents.map(a => ({value: a.id, label: a.name}))]} 
                    required
                  />
                )}

                <div className="space-y-3">
                  <Select 
                    label="Payment Method" 
                    value={formData.payment_method} 
                    onChange={e => setFormData({...formData, payment_method: e.target.value, sub_method: ''})}
                    options={[
                      {value: '', label: 'Select Method'}, 
                      ...filteredMethods.map(m => ({value: m.name, label: m.name}))
                    ]}
                    required
                  />

                  <Select 
                    label="Sub-Method" 
                    value={formData.sub_method} 
                    onChange={e => setFormData({...formData, sub_method: e.target.value})}
                    options={[
                      {value: '', label: 'Select Sub-Method'}, 
                      ...(formData.payment_method 
                        ? filteredMethods.find(m => m.name === formData.payment_method)?.subItems.map(s => ({value: s.name, label: s.name})) || []
                        : []
                      )
                    ]}
                    required
                  />
                </div>

                <Input 
                  label="Payment Date" 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
                <Input 
                  label="Remark" 
                  value={formData.note} 
                  onChange={e => setFormData({...formData, note: e.target.value})} 
                  placeholder="Optional notes" 
                />
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button type="submit" form="payment-form" className="w-full">Confirm Payment</Button>
                </div>
              </form>
            </Card>
          </div>

          <div>
            <Card className="p-5 h-full flex flex-col">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Select Orders to Knock Off</h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[60vh]">
                {recentOrders.length > 0 ? recentOrders.map(order => {
                  const isPaid = order.status === 'paid';
                  const isSelected = selectedOrders.has(order.id);
                  const amount = type === 'MY' ? order.amount_myr : order.amount_bdt;
                  
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => toggleOrder(order)}
                      className={cn(
                        "grid grid-cols-12 gap-2 items-center p-3 rounded-xl border transition-all text-xs",
                        isPaid ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700",
                        isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <div className="col-span-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{formatDate(order.date)}</div>
                        {isPaid && <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded uppercase">Paid</span>}
                      </div>
                      <div className="col-span-2 text-slate-500 dark:text-slate-400">
                        {order.type}
                      </div>
                      <div className="col-span-4 text-slate-500 dark:text-slate-400 truncate" title={order.remark}>
                        {order.remark || '-'}
                      </div>
                      <div className="col-span-3 text-right">
                        <div className={cn("font-bold", isPaid ? "text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-white")}>
                          {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-slate-400">
                           {type === 'MY' ? order.amount_bdt.toLocaleString() + ' BDT' : formatCurrency(order.amount_myr)}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No recent orders found.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewPaymentsModal({ 
  isOpen, 
  onClose, 
  agent, 
  type, 
  token,
  onViewLedger,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: any; 
  type: 'MY' | 'BD'; 
  token: string;
  onViewLedger?: () => void;
  onSuccess?: () => void;
}) {
  const { myPayments, bdPayments, collectionMethods } = useAppStore();
  const [filterDate, setFilterDate] = useState('');
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editMethod, setEditMethod] = useState('');
  const [editSubMethod, setEditSubMethod] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const payments = type === 'MY' 
    ? myPayments.filter(p => p.my_agent_id === agent.id) 
    : bdPayments.filter(p => p.bd_agent_id === agent.id);

  const handleDelete = (id: number) => {
    setPaymentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;
    if (type === 'MY') {
      store.deleteMYPayment(paymentToDelete);
    } else {
      store.deleteBDPayment(paymentToDelete);
    }
    if (onSuccess) onSuccess();
    setPaymentToDelete(null);
    setShowDeleteConfirm(false);
  };

  const filteredMethods = collectionMethods.filter(m => (m.type || 'MY') === type);

  const handleEditClick = (p: any) => {
    setEditingPayment(p);
    setEditMethod(p.payment_method || '');
    setEditSubMethod(p.sub_method || '');
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (type === 'MY') {
      store.updateMYPayment(editingPayment.id, data);
    } else {
      store.updateBDPayment(editingPayment.id, data);
    }
    setEditingPayment(null);
    if (onSuccess) onSuccess();
  };

  if (!isOpen) return null;

  const filteredPayments = payments.filter(p => !filterDate || p.date === filterDate);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const currentPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Payments - {agent.name}</h2>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">
              {type === 'MY' ? 'Incoming Funds (RM)' : 'Outgoing Funds (BDT)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onViewLedger && (
              <Button variant="outline" size="sm" onClick={onViewLedger} className="h-9 px-3 text-xs gap-2 border-slate-200 hover:bg-slate-100">
                <Receipt size={14} /> View Ledger
              </Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600" /></button>
          </div>
        </div>
        
        <Card className="p-5 flex-1 flex flex-col">
          <div className="mb-4">
            <Input label="Filter by Date" type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Method</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Remark</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase w-fit",
                          p.payment_method === 'bkash' ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {p.payment_method}
                        </span>
                        {p.sub_method && (
                          <span className="text-[10px] text-slate-500 font-medium mt-0.5 ml-0.5">
                            {p.sub_method}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold">{type === 'MY' ? formatCurrency((p as MYPayment).amount_myr) : `${(p as BDPayment).amount_bdt.toLocaleString()} BDT`}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{p.note}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEditClick(p)} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredPayments.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-xs text-slate-900 text-right border-r border-slate-200">TOTAL:</td>
                    <td className="px-3 py-2 text-xs text-slate-900 border-r border-slate-200">
                      {type === 'MY' 
                        ? formatCurrency(filteredPayments.reduce((sum, p) => sum + Number((p as MYPayment).amount_myr), 0))
                        : `${filteredPayments.reduce((sum, p) => sum + Number((p as BDPayment).amount_bdt), 0).toLocaleString()} BDT`
                      }
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200"></td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
              <div className="text-xs text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} entries
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 text-xs"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {editingPayment && (
        <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Payment</h2>
              <button onClick={() => setEditingPayment(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <Input name="date" label="Date" type="date" defaultValue={editingPayment.date} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select 
                    name="payment_method" 
                    label="Payment Method" 
                    value={editMethod} 
                    onChange={(e) => {
                      setEditMethod(e.target.value);
                      setEditSubMethod('');
                    }}
                    options={[
                      {value: '', label: 'Select Method'}, 
                      ...filteredMethods.map(m => ({value: m.name, label: m.name}))
                    ]} 
                    required
                  />
                  <Select 
                    name="sub_method" 
                    label="Sub-Method" 
                    value={editSubMethod} 
                    onChange={(e) => setEditSubMethod(e.target.value)}
                    options={[
                      {value: '', label: 'Select Sub-Method'}, 
                      ...(editMethod 
                        ? filteredMethods.find(m => m.name === editMethod)?.subItems.map(s => ({value: s.name, label: s.name})) || []
                        : []
                      )
                    ]} 
                    required
                  />
                </div>
                {type === 'MY' ? (
                  <Input name="amount_myr" label="Amount (RM)" type="number" step="0.01" defaultValue={editingPayment.amount_myr} required />
                ) : (
                  <Input name="amount_bdt" label="Amount (BDT)" type="number" defaultValue={editingPayment.amount_bdt} required />
                )}
                <Input name="note" label="Remark" defaultValue={editingPayment.note} />
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1" onClick={() => setEditingPayment(null)} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">Save Changes</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
      />
    </div>
  );
}

function ViewLedgerModal({ 
  isOpen, 
  onClose, 
  agent, 
  type 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: any; 
  type: 'MY' | 'BD'; 
}) {
  const { stats } = useAppStore();
  const [reportData, setReportData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen) fetchLedger();
  }, [isOpen, startDate, endDate, stats]);

  const fetchLedger = () => {
    const filters = {
      type: 'ledger',
      [type === 'MY' ? 'my_agent_id' : 'bd_agent_id']: agent.id.toString(),
      start_date: startDate,
      end_date: endDate
    };
    const data = store.getReports(filters);
    setReportData(data);
  };

  if (!isOpen) return null;

  const { data, columns } = reportData || { data: [], columns: [] };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agent Ledger - {agent.name}</h2>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">
              Full Transaction History ({type === 'MY' ? 'RM' : 'BDT'})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600" /></button>
        </div>

        <Card className="p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </Card>
        
        <Card className="p-0 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  {columns.map((col: string) => (
                    <th key={col} className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.length > 0 ? data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j} className={cn(
                        "px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap",
                        typeof val === 'number' ? "font-mono text-right" : ""
                      )}>
                        {typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (
                          columns[j].toLowerCase().includes('date') ? formatDate(val as string) : val
                        )}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-xs italic">No transactions found.</td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                    {columns.slice(2).map((col: string, idx: number) => {
                      const colIdx = idx + 2;
                      const isNumeric = typeof data[0][Object.keys(data[0])[colIdx]] === 'number';
                      const sum = isNumeric ? data.reduce((acc: number, row: any) => acc + (Number(Object.values(row)[colIdx]) || 0), 0) : null;
                      
                      // For balance column, we might want the last value instead of sum, 
                      // but the request says "sum of that column of numbers accurately".
                      // Usually for ledger, we sum IN and OUT, but balance is a running total.
                      // Let's see if we should sum balance. Probably not, but let's follow "sum of column".
                      // Actually, for Ledger, only BDT IN/OUT and MYR IN/OUT should be summed.
                      // Balance should probably show the final balance.
                      
                      const isBalance = col.toLowerCase().includes('balance');
                      const displayVal = isBalance 
                        ? Object.values(data[data.length - 1])[colIdx] 
                        : sum;

                      return (
                        <td key={col} className="px-3 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700 last:border-r-0">
                          {typeof displayVal === 'number' ? displayVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}


function ViewTransactionsModal({ 
  isOpen, 
  onClose, 
  agent, 
  type, 
  token 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: any; 
  type: 'MY' | 'BD'; 
  token: string;
}) {
  const { orders } = useAppStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const transactions = orders.filter(o => type === 'MY' ? o.my_agent_id === agent.id : o.bd_agent_id === agent.id);

  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Transactions - {agent.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600" /></button>
        </div>
        
        <Card className="p-5 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase w-32 border-r border-slate-200 dark:border-slate-700">Date</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Type</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">BDT</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Rate</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">RM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">{formatDate(t.date)}</td>
                    <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        t.type === 'bkash' ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs font-mono text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{t.amount_bdt.toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{t.rate}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(t.amount_myr)}</td>
                  </tr>
                ))}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={2} className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                    <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{filteredTransactions.reduce((sum, t) => sum + Number(t.amount_bdt), 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">-</td>
                    <td className="px-2 py-2 text-xs text-slate-900 dark:text-white">{formatCurrency(filteredTransactions.reduce((sum, t) => sum + Number(t.amount_myr), 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

const ProfileSidebar = ({ 
  isOpen, 
  onClose, 
  theme, 
  onThemeChange, 
  user, 
  onLogout,
  fontSize,
  setFontSize,
  fontStyle,
  setFontStyle
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  theme: 'light' | 'dark'; 
  onThemeChange: (theme: 'light' | 'dark') => void;
  user: User | null;
  onLogout: () => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  fontStyle: string;
  setFontStyle: (style: string) => void;
}) => {
  const { collectionMethods } = useAppStore();
  const [newMethod, setNewMethod] = useState('');
  const [expandedMethodId, setExpandedMethodId] = useState<number | null>(null);
  const [editingMethodId, setEditingMethodId] = useState<number | null>(null);
  const [editingSubId, setEditingSubId] = useState<{methodId: number, subId: number} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedType, setSelectedType] = useState<'MY' | 'BD'>('MY');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  const [showFontStyleModal, setShowFontStyleModal] = useState(false);
  const [detailsData, setDetailsData] = useState<{
    type: 'method' | 'subItem';
    methodId: number;
    subId?: number;
    name: string;
    initial_balance: number;
    initial_balance_date: string;
  } | null>(null);

  const handleAddMethod = () => {
    if (newMethod.trim()) {
      store.addCollectionMethod(newMethod, selectedType);
      setNewMethod('');
    }
  };

  const handleDeleteMethod = (id: number) => {
    store.deleteCollectionMethod(id);
  };

  const handleUpdateMethod = (id: number) => {
    if (editValue.trim()) {
      store.updateCollectionMethod(id, { name: editValue });
      setEditingMethodId(null);
      setEditValue('');
    }
  };

  const handleUpdateSubItem = (methodId: number, subId: number) => {
    if (editValue.trim()) {
      store.updateCollectionMethodSubItem(methodId, subId, { name: editValue });
      setEditingSubId(null);
      setEditValue('');
    }
  };

  const handleSaveDetails = () => {
    if (!detailsData) return;

    if (detailsData.type === 'method') {
      store.updateCollectionMethod(detailsData.methodId, {
        name: detailsData.name,
        initial_balance: detailsData.initial_balance,
        initial_balance_date: detailsData.initial_balance_date
      });
    } else if (detailsData.type === 'subItem' && detailsData.subId) {
      store.updateCollectionMethodSubItem(detailsData.methodId, detailsData.subId, {
        name: detailsData.name,
        initial_balance: detailsData.initial_balance,
        initial_balance_date: detailsData.initial_balance_date
      });
    }
    setShowDetailsModal(false);
    setDetailsData(null);
  };

  const filteredMethods = collectionMethods.filter(m => (m.type || 'MY') === selectedType);

  return (
    <>
      {isOpen && (
        <>
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <aside 
            className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base dark:text-white">Settings</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

              <div className={cn("flex-1 overflow-y-auto p-4 space-y-6", fontSize, fontStyle)}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appearance</h5>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                      onClick={() => onThemeChange('light')}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        theme === 'light' 
                          ? "bg-white dark:bg-slate-700 text-yellow-500 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      )}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onThemeChange('dark')}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        theme === 'dark' 
                          ? "bg-white dark:bg-slate-700 text-indigo-400 shadow-sm" 
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      )}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2 relative">
                  <button onClick={() => { setShowFontSizeModal(!showFontSizeModal); setShowFontStyleModal(false); }} className="flex-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-1.5 rounded uppercase">Font Size</button>
                  <button onClick={() => { setShowFontStyleModal(!showFontStyleModal); setShowFontSizeModal(false); }} className="flex-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-1.5 rounded uppercase">Font Style</button>
                  
                  {showFontSizeModal && (
                    <div className="absolute top-10 left-0 right-0 bg-white dark:bg-slate-900 border rounded-lg shadow-xl p-2 z-10 space-y-1">
                      {['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'].map(size => (
                        <button key={size} onClick={() => { setFontSize(size); setShowFontSizeModal(false); }} className="w-full text-left text-xs p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">{size === 'text-xs' ? 'Extra Small' : size === 'text-sm' ? 'Small' : size === 'text-base' ? 'Medium' : size === 'text-lg' ? 'Large' : 'Extra Large'}</button>
                      ))}
                    </div>
                  )}
                  {showFontStyleModal && (
                    <div className="absolute top-10 left-0 right-0 bg-white dark:bg-slate-900 border rounded-lg shadow-xl p-2 z-10 space-y-1 max-h-60 overflow-y-auto">
                      {[
                        ...Array(50).fill(0).map((_, i) => ({
                          name: `Font Style ${i + 1}`,
                          class: i % 3 === 0 ? 'font-sans' : i % 3 === 1 ? 'font-serif' : 'font-mono'
                        }))
                      ].map((style, i) => (
                        <button key={i} onClick={() => { setFontStyle(style.class); setShowFontStyleModal(false); }} className={cn("w-full text-left text-xs p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded", style.class)}>{style.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <CreditCard size={12} />
                    </div>
                    <h5 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Payment Methods</h5>
                  </div>
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[8px] font-bold text-slate-500 rounded-full">
                    {filteredMethods.length}
                  </span>
                </div>

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    onClick={() => setSelectedType('MY')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                      selectedType === 'MY' 
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    MY Agent
                  </button>
                  <button
                    onClick={() => setSelectedType('BD')}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                      selectedType === 'BD' 
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    BD Agent
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="relative group px-1">
                    <input 
                      type="text" 
                      value={newMethod} 
                      onChange={(e) => setNewMethod(e.target.value)}
                      placeholder={`Add ${selectedType} method...`}
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all shadow-sm"
                    />
                    <button 
                      onClick={handleAddMethod} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredMethods.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-medium text-slate-400">No payment methods added yet.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">Method</th>
                              <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredMethods.map(method => (
                              <React.Fragment key={method.id}>
                                <tr 
                                  onClick={() => setExpandedMethodId(expandedMethodId === method.id ? null : method.id)}
                                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                >
                                  <td className="px-3 py-2">
                                    {editingMethodId === method.id ? (
                                      <input 
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleUpdateMethod(method.id)}
                                        onKeyDown={e => e.key === 'Enter' && handleUpdateMethod(method.id)}
                                        onClick={e => e.stopPropagation()}
                                        className="text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1 outline-none dark:text-white w-full"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className={cn("transition-transform duration-300", expandedMethodId === method.id ? "rotate-180" : "")}>
                                          <ChevronDown size={12} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{method.name}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button 
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setDetailsData({
                                            type: 'method',
                                            methodId: method.id,
                                            name: method.name,
                                            initial_balance: method.initial_balance || 0,
                                            initial_balance_date: method.initial_balance_date || new Date().toISOString().split('T')[0]
                                          });
                                          setShowDetailsModal(true);
                                        }} 
                                        className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                                      >
                                        <Settings size={12} />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingMethodId(method.id); setEditValue(method.name); }} 
                                        className="p-1 text-slate-400 hover:text-blue-500 transition-all"
                                      >
                                        <Edit size={12} />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMethod(method.id); }} 
                                        className="p-1 text-slate-400 hover:text-red-500 transition-all"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {expandedMethodId === method.id && (
                                  <tr>
                                    <td colSpan={2} className="bg-slate-50/30 dark:bg-slate-800/20 p-2">
                                      <div className="space-y-1">
                                        {method.subItems.map(sub => (
                                          <div key={sub.id} className="flex items-center justify-between group/sub px-3 py-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all">
                                            <div className="flex items-center gap-2 flex-1">
                                              <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                              {editingSubId?.subId === sub.id ? (
                                                <input 
                                                  autoFocus
                                                  value={editValue}
                                                  onChange={e => setEditValue(e.target.value)}
                                                  onBlur={() => handleUpdateSubItem(method.id, sub.id)}
                                                  onKeyDown={e => e.key === 'Enter' && handleUpdateSubItem(method.id, sub.id)}
                                                  className="text-[10px] font-semibold bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1 outline-none dark:text-white w-full"
                                                />
                                              ) : (
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{sub.name}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button 
                                                onClick={() => { 
                                                  setDetailsData({
                                                    type: 'subItem',
                                                    methodId: method.id,
                                                    subId: sub.id,
                                                    name: sub.name,
                                                    initial_balance: sub.initial_balance || 0,
                                                    initial_balance_date: sub.initial_balance_date || new Date().toISOString().split('T')[0]
                                                  });
                                                  setShowDetailsModal(true);
                                                }} 
                                                className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                                              >
                                                <Settings size={10} />
                                              </button>
                                              <button 
                                                onClick={() => { setEditingSubId({methodId: method.id, subId: sub.id}); setEditValue(sub.name); }} 
                                                className="p-1 text-slate-400 hover:text-blue-500 transition-all"
                                              >
                                                <Edit size={10} />
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  store.deleteCollectionMethodSubItem(method.id, sub.id);
                                                }} 
                                                className="p-1 text-slate-400 hover:text-red-500 transition-all"
                                              >
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        <div className="relative mt-2 px-1">
                                          <input 
                                            type="text" 
                                            placeholder={`Add sub-item...`}
                                            className="w-full pl-3 pr-10 py-1.5 text-[10px] rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                store.addCollectionMethodSubItem(method.id, e.currentTarget.value.trim());
                                                e.currentTarget.value = '';
                                              }
                                            }}
                                          />
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none">
                                            <span className="text-[6px] font-bold text-slate-400 uppercase">Enter</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Management</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => store.backupData()}
                      className="flex items-center justify-center gap-2 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <FileText size={14} />
                      Backup Data (.json)
                    </button>
                    <label className="flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">
                      <RefreshCw size={14} />
                      Restore Data
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".json,application/json,text/plain,*/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              const result = store.restoreData(content);
                              if (result.success) {
                                alert('Data restored successfully!');
                              } else {
                                alert('Failed to restore data: ' + (result.error || 'Unknown error'));
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => { onLogout(); onClose(); }}
                      className="flex items-center justify-center gap-3 w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <LogOut size={20} />
                      Logout Account
                    </button>
                  </div>
                </div>
              </div>
            </aside>

          {showDetailsModal && detailsData && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm dark:text-white">Initial Balance Settings</h3>
                  <button onClick={() => setShowDetailsModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                    <Plus className="rotate-45" size={18} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                    <input 
                      type="text"
                      value={detailsData.name}
                      onChange={e => setDetailsData({ ...detailsData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Balance ({selectedType === 'MY' ? 'RM' : 'Tk'})</label>
                    <input 
                      type="number"
                      value={detailsData.initial_balance}
                      onChange={e => setDetailsData({ ...detailsData, initial_balance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Balance Date</label>
                    <input 
                      type="date"
                      value={detailsData.initial_balance_date}
                      onChange={e => setDetailsData({ ...detailsData, initial_balance_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveDetails}
                    className="flex-1 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

function MethodLedgerView({ agentId, agentType, methodName, subMethodName, onBack }: {
  agentId: number;
  agentType: 'MY' | 'BD';
  methodName: string;
  subMethodName?: string;
  onBack: () => void;
}) {
  const { myPayments, bdPayments, withdrawals: allWithdrawals, deposits: allDeposits, collectionMethods } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editTarget, setEditTarget] = useState<any | null>(null);

  useEffect(() => {
    const method = collectionMethods.find(m => m.name === methodName && m.type === agentType);
    let initialBalance = 0;
    let initialDate = '';

    if (method) {
      if (subMethodName) {
        const subItem = method.subItems.find(s => s.name === subMethodName);
        if (subItem) {
          initialBalance = Number(subItem.initial_balance) || 0;
          initialDate = subItem.initial_balance_date || '';
        }
      } else {
        initialBalance = Number(method.initial_balance) || 0;
        initialDate = method.initial_balance_date || '';
      }
    }

    const payments = agentType === 'MY' 
      ? myPayments.filter(p => (agentId === 0 || p.my_agent_id === agentId) && p.payment_method === methodName && (subMethodName ? p.sub_method === subMethodName : true))
      : bdPayments.filter(p => (agentId === 0 || p.bd_agent_id === agentId) && p.payment_method === methodName && (subMethodName ? p.sub_method === subMethodName : true));
    
    const withdrawals = allWithdrawals.filter(w => 
      (agentId === 0 || w.agent_id === agentId) && 
      w.agent_type === agentType && 
      w.method_name === methodName && 
      (subMethodName ? w.sub_method_name === subMethodName : true)
    );

    const deposits = allDeposits.filter(d => 
      (agentId === 0 || d.agent_id === agentId) && 
      d.agent_type === agentType && 
      d.method_name === methodName && 
      (subMethodName ? d.sub_method_name === subMethodName : true)
    );

    const combined = [
      ...(initialBalance !== 0 || initialDate ? [{
        id: -1,
        date: initialDate || '2000-01-01',
        type: 'Initial Balance',
        amount: initialBalance,
        note: 'Opening Balance',
        isWithdrawal: false,
        isInitial: true
      }] : []),
      ...payments.map(p => ({
        id: p.id,
        date: p.date,
        type: 'Collection',
        amount: agentType === 'MY' ? (p as MYPayment).amount_myr : (p as BDPayment).amount_bdt,
        note: p.note || '',
        isWithdrawal: false,
        rawType: 'payment'
      })),
      ...deposits.map(d => ({
        id: d.id,
        date: d.date,
        type: 'Deposit',
        amount: d.amount,
        note: d.note || '',
        isWithdrawal: false,
        rawType: 'deposit'
      })),
      ...withdrawals.map(w => ({
        id: w.id,
        date: w.date,
        type: 'Withdrawal',
        amount: w.amount,
        note: w.note || '',
        isWithdrawal: true,
        rawType: 'withdrawal'
      }))
    ].sort((a, b) => {
      const dateComp = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateComp !== 0) return dateComp;
      if ('isInitial' in a && a.isInitial) return -1;
      if ('isInitial' in b && b.isInitial) return 1;
      return 0;
    });

    let runningBalance = 0;
    const withBalance = combined.map(t => {
      if (t.isWithdrawal) {
        runningBalance -= t.amount;
      } else {
        runningBalance += t.amount;
      }
      return { ...t, balance: runningBalance };
    });

    const filtered = withBalance.filter(t => {
       if (startDate && t.date < startDate) return false;
       if (endDate && t.date > endDate) return false;
       return true;
    });

    setTransactions(filtered); // Show oldest first (ascending)
  }, [agentId, agentType, methodName, subMethodName, myPayments, bdPayments, allWithdrawals, allDeposits, startDate, endDate]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    const tableColumn = ["Date", "Type", "Debit (In)", "Credit (Out)", "Balance", "Note"];
    const tableRows: any[] = [];

    transactions.forEach(t => {
      const transactionData = [
        formatDate(t.date),
        t.type,
        !t.isWithdrawal ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-',
        t.isWithdrawal ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-',
        t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        t.note
      ];
      tableRows.push(transactionData);
    });

    const totalDebit = transactions.reduce((sum, t) => sum + (!t.isWithdrawal ? t.amount : 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (t.isWithdrawal ? t.amount : 0), 0);
    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

    const totalRow = [
      "TOTAL",
      "",
      totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      ""
    ];

    doc.text(`${methodName} Ledger`, 14, 15);
    if (subMethodName) {
      doc.text(`Sub-method: ${subMethodName}`, 14, 22);
    }
    
    autoTable(doc, {
      startY: subMethodName ? 30 : 25,
      head: [tableColumn],
      body: tableRows,
      foot: [totalRow],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
      footStyles: { fillColor: [203, 213, 225], textColor: [15, 23, 42], fontStyle: 'bold' } // Slate-300 like color for highlight
    });

    // Add Report Stamp
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generated by Juel Money Transfer Apps on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`${methodName}_ledger.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{methodName} Ledger</h2>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
              {subMethodName ? subMethodName : 'Full Transaction History'}
            </p>
          </div>
          <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-6 h-6 text-slate-600" />
          </button>
        </div>

        <Card className="p-5 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
              <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={handleExportPDF} className="h-10 gap-2">
              <FileText size={16} /> Export PDF (.pdf)
            </Button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0">Date</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0">Type</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right border-r border-slate-200 dark:border-slate-700 last:border-r-0">Debit (In)</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right border-r border-slate-200 dark:border-slate-700 last:border-r-0">Credit (Out)</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right border-r border-slate-200 dark:border-slate-700 last:border-r-0">Balance</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0">Note</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length > 0 ? transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(t.date)}</td>
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        t.isWithdrawal ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap text-right font-bold text-emerald-600 font-mono">
                      {!t.isWithdrawal ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap text-right font-bold text-red-600 font-mono">
                      {t.isWithdrawal ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap text-right font-bold text-slate-900 dark:text-white font-mono">
                      {t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-xs border-r border-slate-100 dark:border-slate-800 last:border-r-0 whitespace-nowrap text-slate-500 dark:text-slate-400 italic">{t.note}</td>
                    <td className="px-3 py-2 text-right">
                      {(t.rawType === 'deposit' || t.rawType === 'withdrawal') && (
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => setEditTarget(t)}
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this transaction?')) {
                                if (t.rawType === 'deposit') {
                                  store.deleteDeposit(t.id);
                                } else {
                                  store.deleteWithdrawal(t.id);
                                }
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-xs italic">No transactions found</td>
                  </tr>
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot className="bg-slate-200 dark:bg-slate-700 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-300 dark:border-slate-600">TOTAL:</td>
                    <td className="px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 text-right border-r border-slate-300 dark:border-slate-600 font-mono">
                      {transactions.reduce((sum, t) => sum + (!t.isWithdrawal ? t.amount : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-700 dark:text-red-400 text-right border-r border-slate-300 dark:border-slate-600 font-mono">
                      {transactions.reduce((sum, t) => sum + (t.isWithdrawal ? t.amount : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-300 dark:border-slate-600 font-mono">
                      {transactions[transactions.length - 1].balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </div>

      {editTarget && (
        <EditTransactionModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          transaction={editTarget}
        />
      )}
    </div>
  );
}

function EditTransactionModal({ isOpen, onClose, transaction }: {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}) {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transaction.rawType === 'deposit') {
      store.updateDeposit(transaction.id, {
        amount: Number(amount),
        date,
        note
      });
    } else {
      store.updateWithdrawal(transaction.id, {
        amount: Number(amount),
        date,
        note
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit {transaction.type}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-6 h-6 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <Input label="Note" value={note} onChange={e => setNote(e.target.value)} />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" className="flex-1 bg-slate-900 text-white">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BankBalancePage() {
  const { collectionMethods: methods, myPayments, bdPayments, withdrawals, deposits } = useAppStore();
  
  const [agentType, setAgentType] = useState<'MY' | 'BD'>('MY');
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [transactionTarget, setTransactionTarget] = useState<{method: string, subMethod?: string, id?: number, parentId?: number} | null>(null);
  
  const [ledgerTarget, setLedgerTarget] = useState<{method: string, subMethod?: string} | null>(null);

  if (ledgerTarget) {
    return (
      <MethodLedgerView 
        agentId={0}
        agentType={agentType}
        methodName={ledgerTarget.method}
        subMethodName={ledgerTarget.subMethod}
        onBack={() => setLedgerTarget(null)}
      />
    );
  }

  const filteredMethods = methods.filter(m => (m.type || 'MY') === agentType);

  const flatMethodBalances = filteredMethods
    .map(method => {
      const payments = agentType === 'MY' 
        ? myPayments.filter(p => p.payment_method === method.name)
        : bdPayments.filter(p => p.payment_method === method.name);
      
      const methodWithdrawals = withdrawals.filter(w => 
        w.agent_type === agentType && 
        w.method_name === method.name
      );

      const methodDeposits = deposits.filter(d => 
        d.agent_type === agentType && 
        d.method_name === method.name
      );

      const balance = payments.reduce((sum, p) => sum + (agentType === 'MY' ? (p as MYPayment).amount_myr : (p as BDPayment).amount_bdt), 0);
      const manualDeposits = methodDeposits.reduce((sum, d) => sum + d.amount, 0);
      const withdrawn = methodWithdrawals.reduce((sum, w) => sum + w.amount, 0);

      const subItems = method.subItems.map(sub => {
        const subPayments = payments.filter(p => p.sub_method === sub.name);
        const subWithdrawals = methodWithdrawals.filter(w => w.sub_method_name === sub.name);
        const subDeposits = methodDeposits.filter(d => d.sub_method_name === sub.name);
        
        const subBalance = subPayments.reduce((sum, p) => sum + (agentType === 'MY' ? (p as MYPayment).amount_myr : (p as BDPayment).amount_bdt), 0);
        const subManualDeposits = subDeposits.reduce((sum, d) => sum + d.amount, 0);
        const subWithdrawn = subWithdrawals.reduce((sum, w) => sum + w.amount, 0);

        return {
          id: sub.id,
          parentId: method.id,
          name: sub.name,
          balance: subBalance + subManualDeposits,
          withdrawn: subWithdrawn,
          net: subBalance + subManualDeposits - subWithdrawn,
          parentMethod: method.name,
          initial_balance: sub.initial_balance || 0,
          initial_balance_date: sub.initial_balance_date || ''
        };
      });

      return {
        id: method.id,
        name: method.name,
        balance: balance + manualDeposits,
        withdrawn,
        net: balance + manualDeposits - withdrawn,
        subItems,
        initial_balance: method.initial_balance || 0,
        initial_balance_date: method.initial_balance_date || ''
      };
    })
    .flatMap(m => {
      if (m.subItems.length === 0) {
        return [{ id: m.id, name: m.name, balance: m.balance, withdrawn: m.withdrawn, net: m.net, parentMethod: m.name, isSub: false, initial_balance: m.initial_balance, initial_balance_date: m.initial_balance_date }];
      }
      return m.subItems.map(s => ({ ...s, isSub: true }));
    });

  const handleWithdraw = (method: string, subMethod?: string) => {
    setTransactionTarget({ method, subMethod });
    setShowWithdrawModal(true);
  };

  const handleAddBalance = (method: string, subMethod?: string) => {
    setTransactionTarget({ method, subMethod });
    setShowAddBalanceModal(true);
  };

  const handleEditDetails = (item: any) => {
    setTransactionTarget({ 
      method: item.parentMethod || item.name, 
      subMethod: item.isSub ? item.name : undefined,
      id: item.id,
      parentId: item.parentId
    });
    setShowEditDetailsModal(true);
  };

  const handleViewLedger = (method: string, subMethod?: string) => {
    setLedgerTarget({ method, subMethod });
  };

  const totalBalance = flatMethodBalances.reduce((sum, m) => sum + m.balance, 0);
  const totalWithdrawn = flatMethodBalances.reduce((sum, m) => sum + m.withdrawn, 0);
  const totalNet = totalBalance - totalWithdrawn;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Agent Type" 
            value={agentType} 
            onChange={e => {
              setAgentType(e.target.value as 'MY' | 'BD');
            }}
            options={[
              { value: 'MY', label: 'MY Agent' },
              { value: 'BD', label: 'BD Agent' }
            ]}
          />
        </div>
      <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Item Name</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right border-r border-slate-200 dark:border-slate-700">Balance</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right border-r border-slate-200 dark:border-slate-700">Withdrawn</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right border-r border-slate-200 dark:border-slate-700">Net Balance</th>
                  <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {flatMethodBalances.map((item, idx) => (
                  <tr key={`${item.parentMethod}-${item.name}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                      {item.isSub ? `${item.parentMethod}: ${item.name}` : item.name}
                    </td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-red-600 border-r border-slate-200 dark:border-slate-700">{item.withdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-emerald-600 border-r border-slate-200 dark:border-slate-700">{item.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" onClick={() => handleAddBalance(item.parentMethod, item.isSub ? item.name : undefined)}>
                          Add Balance
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleWithdraw(item.parentMethod, item.isSub ? item.name : undefined)}>
                          Withdraw
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleViewLedger(item.parentMethod, item.isSub ? item.name : undefined)}>
                          Ledger
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-slate-50 text-slate-700" onClick={() => handleEditDetails(item)}>
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-xs text-red-600 text-right border-r border-slate-200 dark:border-slate-700">{totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-xs text-emerald-600 text-right border-r border-slate-200 dark:border-slate-700">{totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

      {showWithdrawModal && transactionTarget && (
        <WithdrawModal 
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          agentId={0}
          agentType={agentType}
          methodName={transactionTarget.method}
          subMethodName={transactionTarget.subMethod}
          onSuccess={() => {}}
        />
      )}

      {showAddBalanceModal && transactionTarget && (
        <AddBalanceModal 
          isOpen={showAddBalanceModal}
          onClose={() => setShowAddBalanceModal(false)}
          agentId={0}
          agentType={agentType}
          methodName={transactionTarget.method}
          subMethodName={transactionTarget.subMethod}
          onSuccess={() => {}}
        />
      )}

      {showEditDetailsModal && transactionTarget && (
        <EditMethodDetailsModal
          isOpen={showEditDetailsModal}
          onClose={() => setShowEditDetailsModal(false)}
          item={transactionTarget}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

function EditMethodDetailsModal({ isOpen, onClose, item, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSuccess: () => void;
}) {
  const { collectionMethods } = useAppStore();
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [initialBalanceDate, setInitialBalanceDate] = useState('');

  useEffect(() => {
    if (item.parentId) {
      const method = collectionMethods.find(m => m.id === item.parentId);
      const sub = method?.subItems.find(s => s.id === item.id);
      if (sub) {
        setName(sub.name);
        setInitialBalance(sub.initial_balance?.toString() || '0');
        setInitialBalanceDate(sub.initial_balance_date || new Date().toISOString().split('T')[0]);
      }
    } else {
      const method = collectionMethods.find(m => m.id === item.id);
      if (method) {
        setName(method.name);
        setInitialBalance(method.initial_balance?.toString() || '0');
        setInitialBalanceDate(method.initial_balance_date || new Date().toISOString().split('T')[0]);
      }
    }
  }, [item, collectionMethods]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item.parentId) {
      store.updateCollectionMethodSubItem(item.parentId, item.id, {
        name,
        initial_balance: Number(initialBalance),
        initial_balance_date: initialBalanceDate
      });
    } else {
      store.updateCollectionMethod(item.id, {
        name,
        initial_balance: Number(initialBalance),
        initial_balance_date: initialBalanceDate
      });
    }
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Bank Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-6 h-6 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Initial Balance" type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} required />
          <Input label="Initial Balance Date" type="date" value={initialBalanceDate} onChange={e => setInitialBalanceDate(e.target.value)} required />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" className="flex-1 bg-slate-900 text-white">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


function WithdrawModal({ isOpen, onClose, agentId, agentType, methodName, subMethodName, onSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  agentId: number; 
  agentType: 'MY' | 'BD';
  methodName: string;
  subMethodName?: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addWithdrawal({
      agent_id: agentId,
      agent_type: agentType,
      method_name: methodName,
      sub_method_name: subMethodName,
      amount: Number(amount),
      date,
      note
    });
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Withdraw Balance</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-6 h-6 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Method</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {methodName} {subMethodName ? `(${subMethodName})` : ''}
            </p>
          </div>
          <Input label="Amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" />
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <Input label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for withdrawal..." />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">Withdraw</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddBalanceModal({ isOpen, onClose, agentId, agentType, methodName, subMethodName, onSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  agentId: number; 
  agentType: 'MY' | 'BD';
  methodName: string;
  subMethodName?: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addDeposit({
      agent_id: agentId,
      agent_type: agentType,
      method_name: methodName,
      sub_method_name: subMethodName,
      amount: Number(amount),
      date,
      note
    });
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Balance</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-6 h-6 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Method</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {methodName} {subMethodName ? `(${subMethodName})` : ''}
            </p>
          </div>
          <Input label="Amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" />
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <Input label="Note" value={note} onChange={e => setNote(e.target.value)} placeholder="Source of funds..." />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">Add Balance</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main App ---

function PaymentPage({ token, onViewLedger, onPaymentAdded }: { token: string; onViewLedger: (type: 'MY' | 'BD', id: number) => void; onPaymentAdded?: () => void }) {
  const { myAgents, bdAgents, stats } = useAppStore();
  const [activeTab, setActiveTab] = useState<'MY' | 'BD'>('MY');
  const [selectedAgent, setSelectedAgent] = useState<MYAgent | BDAgent | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddPayment = (agent: MYAgent | BDAgent) => {
    setSelectedAgent(agent);
    setShowPayment(true);
  };

  const handleViewPayments = (agent: MYAgent | BDAgent) => {
    setSelectedAgent(agent);
    setShowView(true);
  };

  const handleViewLedger = (agent: MYAgent | BDAgent) => {
    setSelectedAgent(agent);
    setShowLedger(true);
  };

  const filteredAgents = (activeTab === 'MY' ? myAgents : bdAgents).filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'MY' ? 'MY' : 'BD'} agents...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none dark:text-white"
          />
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('MY')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'MY' 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            MY Agents
          </button>
          <button
            onClick={() => setActiveTab('BD')}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === 'BD' 
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            BD Agents
          </button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Agent Name</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Balance ({activeTab === 'MY' ? 'RM' : 'BDT'})</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent: any) => (
                  <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{agent.name}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                      {activeTab === 'MY' 
                        ? formatCurrency(agent.outstanding)
                        : `${agent.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tk`
                      }
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="py-1 px-2 text-[10px] h-7 whitespace-nowrap" onClick={() => handleAddPayment(agent)}>
                          <Plus size={12} /> Add Payment
                        </Button>
                        <Button variant="outline" className="py-1 px-2 text-[10px] h-7 whitespace-nowrap" onClick={() => handleViewPayments(agent)}>
                          <Eye size={12} /> View
                        </Button>
                        <Button variant="outline" className="py-1 px-2 text-[10px] h-7 whitespace-nowrap" onClick={() => handleViewLedger(agent)}>
                          <Receipt size={12} /> Ledger
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No agents found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredAgents.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {activeTab === 'MY' 
                      ? formatCurrency(filteredAgents.reduce((sum, agent: any) => sum + agent.outstanding, 0))
                      : `${filteredAgents.reduce((sum, agent: any) => sum + agent.outstanding, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tk`
                    }
                  </td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {selectedAgent && (
        <>
          <PaymentModal 
            isOpen={showPayment} 
            onClose={() => setShowPayment(false)} 
            agent={selectedAgent} 
            type={activeTab} 
            token={token} 
            onSuccess={() => {
              if (onPaymentAdded) onPaymentAdded();
            }} 
          />
          <ViewPaymentsModal 
            isOpen={showView} 
            onClose={() => setShowView(false)} 
            agent={selectedAgent} 
            type={activeTab}
            token={token}
            onViewLedger={() => {
              setShowView(false);
              setShowLedger(true);
            }}
            onSuccess={() => {
              if (onPaymentAdded) onPaymentAdded();
            }}
          />

          <ViewLedgerModal
            isOpen={showLedger}
            onClose={() => setShowLedger(false)}
            agent={selectedAgent}
            type={activeTab}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  const { refresh, myAgents, bdAgents, orders, myPayments, bdPayments, conversions, expenses, collectionMethods, stats } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fontSize, setFontSize] = useState('text-xs');
  const [fontStyle, setFontStyle] = useState('font-sans');
  const [theme, setTheme] = useState<'light' | 'dark'>(localStorage.getItem('theme') as 'light' | 'dark' || 'light');
  const [orderFilters, setOrderFilters] = useState<{start: string, end: string} | null>(null);
  const [reportFilters, setReportFilters] = useState<{type: string, my_agent_id?: string, bd_agent_id?: string} | null>(null);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkOrderUpload, setShowBulkOrderUpload] = useState(false);
  const [bulkUploadType, setBulkUploadType] = useState<'MY' | 'BD'>('MY');

  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 5): Promise<Response> => {
    let retries = maxRetries;
    let delay = 2000;
    let lastResponse: Response | null = null;

    while (retries > 0) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        lastResponse = response;
        const contentType = response.headers.get('content-type');

        // Success case
        if (response.ok && contentType && contentType.includes('application/json')) {
          return response;
        }

        // Handle HTML responses (likely platform loading page or SPA fallback)
        if (contentType && contentType.includes('text/html')) {
          const text = await response.text();
          // Use regex for more robust detection of the "Starting Server..." page
          const isStartingPage = /Starting Server\.\.\./i.test(text) || /<title>Starting Server\.\.\.<\/title>/i.test(text);
          
          if (isStartingPage) {
            console.log(`Server is still starting (retry ${maxRetries - retries + 1}/${maxRetries})...`);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 1.5;
              continue;
            }
          }
          
          // If it's not the starting page, it might be the SPA fallback (404)
          // On mobile, we might get the SPA fallback if the route is wrong or server is in a weird state
          console.error('Server returned HTML instead of JSON. Content snippet:', text.substring(0, 200));
          throw new Error('Server returned an HTML page instead of JSON. This usually means the API route was not found or the server is restarting.');
        }

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error: any) {
        // Don't retry if it's a confirmed HTML error that isn't the starting page
        if (error.message.includes('HTML page') && !error.message.includes('restarting')) {
          throw error;
        }
        
        if (retries <= 1) {
          throw error;
        }
        
        console.log(`Fetch failed, retrying (${maxRetries - retries + 1}/${maxRetries})...`, error.message);
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
    throw new Error(lastResponse ? `Failed after ${maxRetries} retries. Status: ${lastResponse.status}` : 'Failed to connect to server');
  };

  const handleBulkUpload = (type: 'MY' | 'BD') => {
    setBulkUploadType(type);
    setShowBulkUpload(true);
  };

  useEffect(() => {
    if (token) {
      const promptShown = localStorage.getItem('rf_backup_prompt_shown');
      if (!promptShown) {
        setShowBackupPrompt(true);
      }
    }
  }, [token]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const { users } = useAppStore.getState();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      const mockToken = 'mock-token-' + Date.now();
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(mockToken);
      setUser(user);
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
          <Card className="p-8">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="text-white dark:text-slate-900 w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Juel Money Transfer Apps</h1>
              <p className="text-slate-500 dark:text-slate-400">Money Transfer Management System</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input name="username" label="Username" placeholder="Enter username" required />
              <Input name="password" label="Password" type="password" placeholder="••••••••" required />
              <Button type="submit" className="w-full py-3">Login to Dashboard</Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors", fontSize, fontStyle)}>
      {/* Modals */}

      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center">
              <Globe className="text-white dark:text-slate-900 w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight dark:text-white">Juel Money Transfer Apps</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-500">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'default-rate'} onClick={() => { setActiveTab('default-rate'); setIsMobileMenuOpen(false); }} icon={<TrendingUp size={20} />} label="Default Rate" />
          <NavItem active={activeTab === 'my-agents'} onClick={() => { setActiveTab('my-agents'); setIsMobileMenuOpen(false); }} icon={<Users size={20} />} label="MY Agents" />
          <NavItem active={activeTab === 'bd-agents'} onClick={() => { setActiveTab('bd-agents'); setIsMobileMenuOpen(false); }} icon={<Globe size={20} />} label="BD Agents" />
          <NavItem active={activeTab === 'orders'} onClick={() => { setOrderFilters(null); setActiveTab('orders'); setIsMobileMenuOpen(false); }} icon={<ArrowRightLeft size={20} />} label="Orders" />
          <NavItem active={activeTab === 'payment'} onClick={() => { setActiveTab('payment'); setIsMobileMenuOpen(false); }} icon={<Wallet size={20} />} label="Payment" />
          <NavItem active={activeTab === 'conversion'} onClick={() => { setActiveTab('conversion'); setIsMobileMenuOpen(false); }} icon={<Banknote size={20} />} label="RM Conversion" />
          <NavItem active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setIsMobileMenuOpen(false); }} icon={<Receipt size={20} />} label="Expenses" />
          <NavItem active={activeTab === 'balances'} onClick={() => { setActiveTab('balances'); setIsMobileMenuOpen(false); }} icon={<Scale size={20} />} label="Bank Balance" />
          <NavItem active={activeTab === 'calculation'} onClick={() => { setActiveTab('calculation'); setIsMobileMenuOpen(false); }} icon={<Calculator size={20} />} label="Calculation" />
          <NavItem active={activeTab === 'loan'} onClick={() => { setActiveTab('loan'); setIsMobileMenuOpen(false); }} icon={<FileText size={20} />} label="Loan" />
          <NavItem active={activeTab === 'reports'} onClick={() => { setReportFilters(null); setActiveTab('reports'); setIsMobileMenuOpen(false); }} icon={<BarChart3 size={20} />} label="Reports" />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen flex flex-col">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
              <LayoutDashboard size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-lg transition-colors group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{user?.username || 'Admin User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'Administrator'}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <Users size={20} className="text-slate-600 dark:text-slate-400" />
              </div>
            </button>
          </div>
        </header>

        <div className="p-4">
          {activeTab === 'dashboard' && <Dashboard stats={stats} onReload={refresh} onViewAll={() => {
            const today = new Date().toISOString().split('T')[0];
            setOrderFilters({ start: today, end: today });
            setActiveTab('orders');
          }} />}
          {activeTab === 'default-rate' && <DefaultRateSettings />}
          {activeTab === 'my-agents' && <MYAgents token={token!} onAgentAdded={refresh} onBulkUpload={() => handleBulkUpload('MY')} />}
          {activeTab === 'bd-agents' && <BDAgents token={token!} onAgentAdded={refresh} onBulkUpload={() => handleBulkUpload('BD')} />}
          {activeTab === 'orders' && <Orders token={token!} onOrderAdded={refresh} initialFilters={orderFilters} onBulkUpload={() => setShowBulkOrderUpload(true)} />}
          {activeTab === 'payment' && <PaymentPage token={token!} onPaymentAdded={refresh} onViewLedger={(type, id) => {
            setReportFilters({
              type: 'ledger',
              [type === 'MY' ? 'my_agent_id' : 'bd_agent_id']: id.toString()
            });
            setActiveTab('reports');
          }} />}
          {activeTab === 'conversion' && <ConversionTab token={token!} onConversionAdded={refresh} />}
          {activeTab === 'expenses' && <Expenses token={token!} onExpenseAdded={refresh} />}
          {activeTab === 'balances' && <BankBalancePage />}
          {activeTab === 'calculation' && <CalculationPage />}
          {activeTab === 'loan' && <LoanPage />}
          {activeTab === 'reports' && <Reports token={token!} stats={stats} initialFilters={reportFilters} />}
        </div>
      </main>

      <ProfileSidebar 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        theme={theme} 
        onThemeChange={setTheme}
        user={user}
        onLogout={handleLogout}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontStyle={fontStyle}
        setFontStyle={setFontStyle}
      />
      <BulkPaymentUploadModal 
        isOpen={showBulkUpload} 
        onClose={() => setShowBulkUpload(false)} 
        type={bulkUploadType} 
      />
      <BulkOrderUploadModal
        isOpen={showBulkOrderUpload}
        onClose={() => setShowBulkOrderUpload(false)}
      />
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 w-full rounded-lg transition-all duration-200",
        active 
          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-200 dark:shadow-none" 
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// --- Dashboard Component ---
function Dashboard({ stats, onViewAll, onReload }: { stats: any; onViewAll: () => void; onReload: () => void }) {
  const [isReloading, setIsReloading] = useState(false);

  if (!stats) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="animate-spin text-slate-400">
        <RefreshCw size={32} />
      </div>
      <p className="text-slate-500 font-medium">Loading statistics...</p>
    </div>
  );

  const handleReload = async () => {
    setIsReloading(true);
    await onReload();
    // Artificial delay for better UX
    setTimeout(() => setIsReloading(false), 600);
  };

  const cards = [
    { 
      title: "Today's Orders", 
      value: stats.today?.count || 0, 
      icon: <ArrowRightLeft className="text-blue-600" />, 
      sub: "Total transactions",
      change: stats.changes?.count || 0
    },
    { 
      title: "Today's Volume", 
      value: formatCurrency(stats.today?.total_myr || 0), 
      icon: <TrendingUp className="text-emerald-600" />, 
      sub: (
        <div className="flex flex-col gap-0.5 mt-1">
          <span>{(stats.today?.total_bdt || 0).toLocaleString()} Tk</span>
          <span className="text-[9px] text-slate-400">Avg Order Rate: {stats.profitBreakdown?.avgOrderRate?.toFixed(2) || '0.00'}</span>
          <span className="text-[9px] text-slate-400">Avg Convert Rate: {stats.profitBreakdown?.avgConvertRate?.toFixed(2) || '0.00'}</span>
        </div>
      ),
      change: stats.changes?.volume || 0
    },
    { 
      title: "Total Net Profit", 
      value: formatCurrency(stats.netProfit || 0), 
      icon: <Wallet className="text-indigo-600" />, 
      sub: "Total earnings after expenses",
      change: stats.changes?.profit || 0
    },
    { 
      title: "Total Expenses", 
      value: formatCurrency(stats.expenses?.total_myr || 0), 
      icon: <Receipt className="text-red-600" />, 
      sub: "Operational costs",
      change: stats.changes?.expenses || 0
    },
  ];

  return (
    <div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md">{React.cloneElement(card.icon as React.ReactElement, { size: 18 })}</div>
              {card.change !== 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  card.change > 0 
                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" 
                    : "text-red-600 bg-red-50 dark:bg-red-900/20"
                )}>
                  {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                </span>
              )}
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium">{card.title}</h3>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{card.value}</p>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{card.sub}</div>
          </Card>
        ))}
        


        {/* Bank Balance Summary Card */}
        <Card className="p-4 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col h-auto min-h-[200px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md"><Wallet className="text-slate-600" size={18} /></div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold">Bank Balance Summary</h3>
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
            {stats.bankBalances?.length > 0 ? (
              stats.bankBalances.map((balance: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", balance.type === 'MY' ? "bg-emerald-500" : "bg-blue-500")} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{balance.name}</span>
                  </div>
                  <span className={cn(
                    "font-mono font-bold",
                    balance.balance < 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                  )}>
                    {balance.currency === 'MYR' ? formatCurrency(balance.balance) : `${balance.balance.toLocaleString()} Tk`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">No balances available</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total MYR</span>
             <span className="text-sm font-bold text-slate-900 dark:text-white">
               {formatCurrency(stats.bankBalances?.filter((b: any) => b.currency === 'MYR').reduce((sum: number, b: any) => sum + b.balance, 0) || 0)}
             </span>
          </div>
        </Card>

        {/* Outstanding Report Card */}
        <Card className="p-4 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col h-auto min-h-[200px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md"><ArrowRightLeft className="text-slate-600" size={18} /></div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold">Outstanding Report</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* MY Agents Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">MY Agents (Receivable)</span>
              </div>
              <div className="space-y-1 pr-2">
                {stats.myAgentsOutstanding?.agents?.length > 0 ? (
                  stats.myAgentsOutstanding.agents.map((agent: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[60%]">{agent.name}</span>
                      <span className={cn(
                        "font-mono font-medium",
                        agent.outstanding < 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                      )}>
                        {formatCurrency(agent.outstanding)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No outstanding balances</p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(stats.myAgentsOutstanding?.total || 0)}</span>
              </div>
            </div>

            {/* BD Agents Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">BD Agents (Payable)</span>
              </div>
              <div className="space-y-1 pr-2">
                {stats.bdAgentsOutstanding?.agents?.length > 0 ? (
                  stats.bdAgentsOutstanding.agents.map((agent: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[60%]">{agent.name}</span>
                      <span className={cn(
                        "font-mono font-medium",
                        agent.outstanding < 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                      )}>
                        {agent.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tk
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No outstanding balances</p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{(stats.bdAgentsOutstanding?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tk</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BulkOrderUploadModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const { myAgents, bdAgents } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const downloadSample = () => {
    const headers = ['MY Agent', 'BD Agent', 'Type', 'Amount BDT', 'Rate', 'Charge', 'Date', 'Remark'];
    const sampleData = [
      ['MY Agent A', 'BD Agent X', 'bkash', '10000', '25.5', '0', '2024-01-01', 'Sample Order'],
      ['MY Agent B', 'BD Agent Y', 'bank', '5000', '25.6', '10', '2024-01-02', 'Another Sample']
    ];
    
    const csvContent = Papa.unparse({ fields: headers, data: sampleData });
    saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), `bulk_order_sample.csv`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccessCount(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const requiredHeaders = ['MY Agent', 'BD Agent', 'Type', 'Amount BDT', 'Rate', 'Charge', 'Date', 'Remark'];
          
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            const msg = `Critical Error: Column mismatch in CSV. Missing: ${missingHeaders.join(', ')}. Upload rejected.`;
            alert(msg);
            setError(msg);
            setIsUploading(false);
            return;
          }

          const data = results.data as any[];
          const errors: string[] = [];
          const validOrders: any[] = [];

          data.forEach((row: any, index: number) => {
            const myAgentName = row['MY Agent'];
            const bdAgentName = row['BD Agent'];
            const type = (row['Type'] || 'bkash').toLowerCase();
            const amountBdt = parseFloat(row['Amount BDT']);
            const rate = parseFloat(row['Rate']);
            const charge = parseFloat(row['Charge']) || 0;
            const date = row['Date'] || new Date().toISOString().split('T')[0];
            const remark = row['Remark'] || '';

            if (!myAgentName || !bdAgentName || isNaN(amountBdt) || isNaN(rate)) {
              errors.push(`Row ${index + 2}: Invalid data format (Check MY Agent, BD Agent, Amount BDT, Rate)`);
              return;
            }

            const myAgent = myAgents.find(a => a.name.toLowerCase() === myAgentName.toString().toLowerCase());
            const bdAgent = bdAgents.find(a => a.name.toLowerCase() === bdAgentName.toString().toLowerCase());

            if (!myAgent) {
              errors.push(`Row ${index + 2}: MY Agent "${myAgentName}" not found. Follow existing agent info.`);
            }
            if (!bdAgent) {
              errors.push(`Row ${index + 2}: BD Agent "${bdAgentName}" not found. Follow existing agent info.`);
            }

            if (myAgent && bdAgent) {
              const amountMyr = amountBdt / rate;
              validOrders.push({
                my_agent_id: myAgent.id,
                bd_agent_id: bdAgent.id,
                type: type as any,
                amount_bdt: amountBdt,
                rate,
                amount_myr: amountMyr.toFixed(2),
                charge,
                date,
                remark
              });
            }
          });

          if (errors.length > 0) {
            const errorMsg = `Upload Rejected. Found ${errors.length} errors:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more.' : ''}`;
            alert(errorMsg);
            setError(errors.join('\n'));
            setIsUploading(false);
          } else {
            // All rows are valid, add them all
            validOrders.forEach(order => store.addOrder(order));
            setSuccessCount(validOrders.length);
            setIsUploading(false);
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        },
        error: (err: any) => {
          const msg = 'Failed to parse CSV file: ' + err.message;
          alert(msg);
          setError(msg);
          setIsUploading(false);
        }
      });
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Bulk Upload Orders</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <div className="flex gap-3">
              <AlertCircle className="text-indigo-600 dark:text-indigo-400 w-5 h-5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Instructions</p>
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  1. Download the sample CSV file.<br />
                  2. Fill in your order data.<br />
                  3. Ensure agent names match exactly.<br />
                  4. Upload the completed file.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={downloadSample} className="w-full gap-2">
              <Download size={16} /> Download Sample CSV (.csv)
            </Button>
            
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="primary" className="w-full gap-2" disabled={isUploading}>
                {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                {isUploading ? 'Uploading...' : 'Upload CSV File'}
              </Button>
            </div>
          </div>

          {successCount > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Check size={14} /> Successfully uploaded {successCount} orders!
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-[10px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function BulkPaymentUploadModal({ 
  isOpen, 
  onClose, 
  type 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'MY' | 'BD'; 
}) {
  const { myAgents, bdAgents } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const downloadSample = () => {
    const headers = ['Agent Name', 'Amount', 'Method', 'Sub-Method', 'Date', 'Remark'];
    const sampleData = [
      ['Agent A', '1000', 'Bank', 'Maybank', '2024-01-01', 'Sample Payment'],
      ['Agent B', '500', 'Bkash', 'Personal', '2024-01-02', 'Another Sample']
    ];
    
    const csvContent = Papa.unparse({ fields: headers, data: sampleData });
    saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), `bulk_payment_sample_${type}.csv`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccessCount(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const requiredHeaders = ['Agent Name', 'Amount', 'Method', 'Sub-Method', 'Date', 'Remark'];
          
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          if (missingHeaders.length > 0) {
            const msg = `Critical Error: Column mismatch in CSV. Missing: ${missingHeaders.join(', ')}. Upload rejected.`;
            alert(msg);
            setError(msg);
            setIsUploading(false);
            return;
          }

          const data = results.data as any[];
          const errors: string[] = [];
          const validPayments: any[] = [];

          data.forEach((row: any, index: number) => {
            const agentName = row['Agent Name'];
            const amount = parseFloat(row['Amount']);
            const method = row['Method'];
            const subMethod = row['Sub-Method'] || '';
            const date = row['Date'] || new Date().toISOString().split('T')[0];
            const remark = row['Remark'] || '';

            if (!agentName || isNaN(amount) || !method) {
              errors.push(`Row ${index + 2}: Invalid data format (Check Agent Name, Amount, Method)`);
              return;
            }

            if (type === 'MY') {
              const agent = myAgents.find(a => a.name.toLowerCase() === agentName.toString().toLowerCase());
              if (!agent) {
                errors.push(`Row ${index + 2}: MY Agent "${agentName}" not found. Follow existing agent info.`);
                return;
              }
              validPayments.push({
                my_agent_id: agent.id,
                amount_myr: amount,
                payment_method: method,
                sub_method: subMethod,
                date,
                note: remark
              });
            } else {
              const agent = bdAgents.find(a => a.name.toLowerCase() === agentName.toString().toLowerCase());
              if (!agent) {
                errors.push(`Row ${index + 2}: BD Agent "${agentName}" not found. Follow existing agent info.`);
                return;
              }
              validPayments.push({
                bd_agent_id: agent.id,
                amount_bdt: amount,
                payment_method: method,
                sub_method: subMethod,
                date,
                note: remark
              });
            }
          });

          if (errors.length > 0) {
            const errorMsg = `Upload Rejected. Found ${errors.length} errors:\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...and more.' : ''}`;
            alert(errorMsg);
            setError(errors.join('\n'));
            setIsUploading(false);
          } else {
            // All rows are valid
            validPayments.forEach(payment => {
              if (type === 'MY') {
                store.addMYPayment(payment);
              } else {
                store.addBDPayment(payment);
              }
            });
            setSuccessCount(validPayments.length);
            setIsUploading(false);
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        },
        error: (err: any) => {
          const msg = 'Failed to parse CSV file: ' + err.message;
          alert(msg);
          setError(msg);
          setIsUploading(false);
        }
      });
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Bulk Upload {type} Payments</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-600 dark:text-blue-400 w-5 h-5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Instructions</p>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  1. Download the sample CSV file.<br />
                  2. Fill in your payment data.<br />
                  3. Ensure agent names match exactly.<br />
                  4. Upload the completed file.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={downloadSample} className="w-full gap-2">
              <Download size={16} /> Download Sample CSV (.csv)
            </Button>
            
            <div className="relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="primary" className="w-full gap-2" disabled={isUploading}>
                {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                {isUploading ? 'Uploading...' : 'Upload CSV File'}
              </Button>
            </div>
          </div>

          {successCount > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Check size={14} /> Successfully uploaded {successCount} payments!
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-[10px] font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// --- Default Rate Settings Component ---
function DefaultRateSettings() {
  const { defaultRate, setDefaultRate } = useAppStore();
  const [rate, setRate] = useState(defaultRate.toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setDefaultRate(parseFloat(rate) || 0, date);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-md mx-auto mt-8 relative">
      {showSuccess && (
        <div 
          className="absolute -top-16 left-0 right-0 flex justify-center z-50"
        >
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 font-bold">
            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            Default Rate Saved Successfully!
          </div>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Default Order Rate</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Set the standard rate for new orders.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="text-[10px] h-8 gap-1">
            <Clock size={14} /> History
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Exchange Rate (BDT per RM)</label>
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">BDT</div>
            </div>
            <p className="text-[11px] text-slate-400 italic">This rate will be pre-filled when creating new orders.</p>
          </div>

          <Button type="submit" className="w-full py-3 text-sm font-bold shadow-lg shadow-indigo-500/20">
            Save Default Rate
          </Button>
        </form>
      </Card>
      
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex gap-3">
        <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={20} />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>Note:</strong> Changing this rate only affects <strong>new</strong> orders. Existing orders will keep the rate they were created with.
        </p>
      </div>

      {showHistory && <RateHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}

function RateHistoryModal({ onClose }: { onClose: () => void }) {
  const history = [...store.getRateHistory()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rate History</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <Plus className="rotate-45 w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm italic">No history available.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors hover:border-indigo-200 dark:hover:border-indigo-900">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{h.rate.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal ml-1">BDT/RM</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Rate used for new orders on this day</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                      {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MY Agents Component ---
function MYAgents({ token, onAgentAdded, onBulkUpload }: { token: string; onAgentAdded?: () => void; onBulkUpload?: () => void }) {
  const { myAgents: agents } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<MYAgent | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [editingAgent, setEditingAgent] = useState<MYAgent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const initial_balance = parseFloat(formData.get('initial_balance') as string) || 0;
    const initial_balance_date = formData.get('initial_balance_date') as string;
    
    if (editingAgent) {
      store.updateMYAgent(editingAgent.id, { name, initial_balance, initial_balance_date });
    } else {
      store.addMYAgent(name, initial_balance, initial_balance_date);
    }
    setShowAdd(false);
    setEditingAgent(null);
    if (onAgentAdded) onAgentAdded();
  };

  const handleEdit = (agent: MYAgent) => {
    setEditingAgent(agent);
    setShowAdd(true);
  };

  const handleDelete = (id: number) => {
    setAgentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (agentToDelete) {
      store.deleteMYAgent(agentToDelete);
      if (onAgentAdded) onAgentAdded();
      setAgentToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const currentAgents = filteredAgents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search MY Agent..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBulkUpload} className="text-xs py-1.5 whitespace-nowrap gap-2">
            <Download size={16} className="rotate-180" /> Bulk Upload
          </Button>
          <Button onClick={() => { setEditingAgent(null); setShowAdd(true); }} className="text-xs py-1.5 whitespace-nowrap"><Plus size={16} /> Add Agent</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Agent Name</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Balance (RM)</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{agent.name}</td>
                  <td className="px-2 py-2 text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {formatCurrency((agent.total_payments_myr - agent.total_orders_myr) + (Number(agent.initial_balance) || 0))}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => handleEdit(agent)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Edit Agent">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(agent.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Delete Agent">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredAgents.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {formatCurrency(filteredAgents.reduce((sum, agent) => sum + ((agent.total_payments_myr - agent.total_orders_myr) + (Number(agent.initial_balance) || 0)), 0))}
                  </td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAgents.length)} of {filteredAgents.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingAgent ? 'Edit Malaysia Agent' : 'Add Malaysia Agent'}</h2>
              <button onClick={() => { setShowAdd(false); setEditingAgent(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" label="Agent Name" placeholder="e.g. Agent Alpha" defaultValue={editingAgent?.name} required />
                <Input name="initial_balance" label="Initial Balance (RM)" type="number" step="0.01" placeholder="0.00" defaultValue={editingAgent?.initial_balance} />
                <Input name="initial_balance_date" label="Initial Balance Date" type="date" defaultValue={editingAgent?.initial_balance_date || new Date().toISOString().split('T')[0]} />
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditingAgent(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingAgent ? 'Update Agent' : 'Save Agent'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This action cannot be undone and may affect related orders and payments."
      />

      {selectedAgent && (
        <>
          <PaymentModal 
            isOpen={showPayment} 
            onClose={() => setShowPayment(false)} 
            agent={selectedAgent} 
            type="MY" 
            token={token} 
            onSuccess={() => {
              if (onAgentAdded) onAgentAdded();
            }} 
          />
          <ViewPaymentsModal 
            isOpen={showView} 
            onClose={() => setShowView(false)} 
            agent={selectedAgent} 
            type="MY" 
            token={token} 
          />
        </>
      )}
    </div>
  );
}

// --- Orders Component ---
function Orders({ token, onOrderAdded, initialFilters, onBulkUpload }: { token: string; onOrderAdded?: () => void; initialFilters?: {start: string, end: string} | null; onBulkUpload?: () => void }) {
  const { orders, myAgents, bdAgents, refresh, defaultRate } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Filter states
  const [filterMYAgent, setFilterMYAgent] = useState('');
  const [filterBDAgent, setFilterBDAgent] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(initialFilters?.start || '');
  const [filterEndDate, setFilterEndDate] = useState(initialFilters?.end || '');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    my_agent_id: '',
    bd_agent_id: '',
    type: 'bkash',
    amount_bdt: '',
    rate: defaultRate > 0 ? defaultRate.toString() : '',
    amount_myr: '',
    charge: '0',
    date: new Date().toISOString().split('T')[0],
    remark: ''
  });

  const handleReload = async () => {
    setIsReloading(true);
    refresh();
    setTimeout(() => setIsReloading(false), 600);
  };

  const handleCalc = (bdt: string, rate: string) => {
    if (bdt && rate) {
      const myr = parseFloat(bdt) / parseFloat(rate);
      setFormData(prev => ({ ...prev, amount_bdt: bdt, rate, amount_myr: myr.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, amount_bdt: bdt, rate, amount_myr: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      store.updateOrder(editingOrder.id, formData);
    } else {
      store.addOrder(formData);
    }
    setShowAdd(false);
    setEditingOrder(null);
    setFormData({
      my_agent_id: '',
      bd_agent_id: '',
      type: 'bkash',
      amount_bdt: '',
      rate: defaultRate > 0 ? defaultRate.toString() : '',
      amount_myr: '',
      charge: '0',
      date: new Date().toISOString().split('T')[0],
      remark: ''
    });
    if (onOrderAdded) onOrderAdded();
  };

  const handleDelete = (id: number) => {
    setOrderToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    store.deleteOrder(orderToDelete);
    handleReload();
    if (onOrderAdded) onOrderAdded();
    setOrderToDelete(null);
  };

  const handleBulkDelete = () => {
    if (selectedOrders.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    selectedOrders.forEach(id => {
      store.deleteOrder(id);
    });
    setSelectedOrders(new Set());
    setShowBulkDeleteConfirm(false);
    handleReload();
    if (onOrderAdded) onOrderAdded();
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      my_agent_id: order.my_agent_id.toString(),
      bd_agent_id: order.bd_agent_id.toString(),
      type: order.type,
      amount_bdt: order.amount_bdt.toString(),
      rate: order.rate.toString(),
      amount_myr: order.amount_myr.toString(),
      charge: (order.charge || 0).toString(),
      date: order.date,
      remark: order.remark || ''
    });
    setShowAdd(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMYAgent, filterBDAgent, filterStartDate, filterEndDate, searchTerm]);

  const [sortBy, setSortBy] = useState<'date' | 'amount_bdt' | 'amount_myr'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredOrders = orders.filter(order => {
    const matchesMYAgent = filterMYAgent === '' || filterMYAgent === 'all' || order.my_agent_id === parseInt(filterMYAgent);
    const matchesBDAgent = filterBDAgent === '' || filterBDAgent === 'all' || order.bd_agent_id === parseInt(filterBDAgent);
    
    let matchesDate = true;
    if (filterStartDate && filterEndDate) {
      matchesDate = order.date >= filterStartDate && order.date <= filterEndDate;
    } else if (filterStartDate) {
      matchesDate = order.date >= filterStartDate;
    } else if (filterEndDate) {
      matchesDate = order.date <= filterEndDate;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      order.my_agent_name?.toLowerCase().includes(searchLower) ||
      order.bd_agent_name?.toLowerCase().includes(searchLower) ||
      order.remark?.toLowerCase().includes(searchLower) ||
      order.amount_bdt.toString().includes(searchTerm) ||
      order.amount_myr.toString().includes(searchTerm);
    
    return matchesMYAgent && matchesBDAgent && matchesDate && matchesSearch;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = String(a.date || '').localeCompare(String(b.date || ''));
    } else if (sortBy === 'amount_bdt') {
      comparison = Number(a.amount_bdt) - Number(b.amount_bdt);
    } else if (sortBy === 'amount_myr') {
      comparison = Number(a.amount_myr) - Number(b.amount_myr);
    }
    
    if (comparison === 0) comparison = a.id - b.id;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleOrder = (id: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOrders(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedOrders.size === currentOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(currentOrders.map(o => o.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div className="flex flex-1 items-center gap-2 max-w-2xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none dark:text-white"
            />
          </div>
          
          <div className="relative flex items-center">
            <div className="absolute left-3 pointer-events-none text-slate-500 dark:text-slate-400">
              <ArrowUpDown size={16} />
            </div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy as any);
                setSortOrder(newSortOrder as any);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm pl-10 pr-10 py-2 outline-none dark:text-white min-w-[200px] appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount_bdt-desc">Amount BDT (High to Low)</option>
              <option value="amount_bdt-asc">Amount BDT (Low to High)</option>
              <option value="amount_myr-desc">Amount RM (High to Low)</option>
              <option value="amount_myr-asc">Amount RM (Low to High)</option>
            </select>
            <div className="absolute right-3 pointer-events-none text-slate-500 dark:text-slate-400">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedOrders.size > 0 && (
            <Button variant="danger" onClick={handleBulkDelete} className="text-xs py-1.5 whitespace-nowrap gap-2">
              <Trash2 size={16} /> Delete Selected ({selectedOrders.size})
            </Button>
          )}
          <Button variant="outline" onClick={onBulkUpload} className="text-xs py-1.5 whitespace-nowrap gap-2">
            <Download size={16} className="rotate-180" /> Bulk Upload
          </Button>
          <Button onClick={() => {
            setEditingOrder(null);
            setFormData({
              my_agent_id: '',
              bd_agent_id: '',
              type: 'bkash',
              amount_bdt: '',
              rate: defaultRate > 0 ? defaultRate.toString() : '',
              amount_myr: '',
              charge: '0',
              date: new Date().toISOString().split('T')[0],
              remark: ''
            });
            setShowAdd(true);
          }} className="text-xs py-1.5 whitespace-nowrap"><Plus size={16} /> New Order</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <SearchableSelect 
            label="MY Agent" 
            value={filterMYAgent}
            onChange={val => setFilterMYAgent(val)}
            options={[{value: '', label: 'Blank'}, {value: 'all', label: 'All MY Agents'}, ...myAgents.map(a => ({value: a.id, label: a.name}))]} 
          />
          <SearchableSelect 
            label="BD Agent" 
            value={filterBDAgent}
            onChange={val => setFilterBDAgent(val)}
            options={[{value: '', label: 'Blank'}, {value: 'all', label: 'All BD Agents'}, ...bdAgents.map(a => ({value: a.id, label: a.name}))]} 
          />
          <Input 
            label="Start Date" 
            type="date" 
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
          />
          <Input 
            label="End Date" 
            type="date" 
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
          />
          <div className="flex items-end">
            <Button variant="outline" className="w-full text-xs py-1.5" onClick={() => { 
              setFilterMYAgent(''); 
              setFilterBDAgent('');
              setFilterStartDate(''); 
              setFilterEndDate(''); 
              setSearchTerm('');
            }}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 border-r border-slate-200 dark:border-slate-700 w-8 text-center">
                  <input 
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    checked={currentOrders.length > 0 && selectedOrders.size === currentOrders.length}
                    onChange={handleToggleAll}
                  />
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase w-32 border-r border-slate-200 dark:border-slate-700">Date</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">MY Agent</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">BD Agent</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Type</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">BDT</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Rate</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">RM</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Charge (BD)</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Remark</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentOrders.length > 0 ? currentOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                    <input 
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => handleToggleOrder(order.id)}
                    />
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">{formatDate(order.date)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{order.my_agent_name}</td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{order.bd_agent_name}</td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                      order.type === 'bkash' ? "bg-pink-100 text-pink-700" : order.type === 'nagad' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{order.amount_bdt.toLocaleString()}</td>
                  <td className="px-2 py-2 font-mono text-xs dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{order.rate}</td>
                  <td className="px-2 py-2 font-bold text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{formatCurrency(order.amount_myr)}</td>
                  <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700">{Number(order.charge || 0).toLocaleString()} <span className="text-[10px] opacity-70">BDT</span></td>
                  <td className="px-2 py-2 text-[10px] text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 max-w-[150px] truncate" title={order.remark}>
                    {order.remark || '-'}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1.5">
                      <Button variant="outline" className="py-1 px-2 text-[10px]" onClick={() => handleEdit(order)}>Edit</Button>
                      <Button variant="danger" className="py-1 px-2 text-[10px]" onClick={() => handleDelete(order.id)}><Trash2 size={12} /></Button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={11} className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">No orders found matching the filters.</td>
                </tr>
              )}
            </tbody>
            {filteredOrders.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{filteredOrders.reduce((sum, o) => sum + o.amount_bdt, 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">-</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{formatCurrency(filteredOrders.reduce((sum, o) => sum + Number(o.amount_myr), 0))}</td>
                  <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {filteredOrders.reduce((sum, o) => sum + Number(o.charge || 0), 0).toLocaleString()} <span className="text-[10px] opacity-70">BDT</span>
                  </td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingOrder ? 'Edit Order' : 'Create New Order'}</h2>
              <button onClick={() => { setShowAdd(false); setEditingOrder(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-5 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <SearchableSelect 
                    label="Malaysia Agent" 
                    value={formData.my_agent_id || ''}
                    options={myAgents.map(a => ({value: a.id, label: a.name}))} 
                    onChange={val => {
                      setFormData(prev => ({ 
                        ...prev, 
                        my_agent_id: val
                      }));
                    }}
                    required
                  />
                  <SearchableSelect 
                    label="Bangladesh Agent" 
                    value={formData.bd_agent_id || ''}
                    options={bdAgents.map(a => ({value: a.id, label: a.name}))} 
                    onChange={val => setFormData(prev => ({ ...prev, bd_agent_id: val }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select 
                    label="Transfer Type" 
                    value={formData.type || ''}
                    options={[{value: 'bkash', label: 'Bkash'}, {value: 'bank', label: 'Bank Transfer'}, {value: 'nagad', label: 'Nagad'}]} 
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any, charge: e.target.value === 'bank' ? prev.charge : '0' }))}
                  />
                  <Input label="Date" type="date" value={formData.date || ''} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="w-full">
                  <Input 
                    label="BDT Amount" 
                    type="number" 
                    value={formData.amount_bdt || ''} 
                    placeholder="0.00" 
                    onChange={e => handleCalc(e.target.value, formData.rate)} 
                    required 
                    className="text-lg py-2 font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Input label="Exchange Rate" type="number" step="0.01" value={formData.rate || ''} onChange={e => handleCalc(formData.amount_bdt, e.target.value)} required />
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total RM (Auto)</label>
                    <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white text-xs">
                      {formData.amount_myr || '0.00'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Charge (BD)" 
                    type="number" 
                    step="0.01"
                    disabled={formData.type !== 'bank'} 
                    value={formData.charge} 
                    onChange={e => setFormData(prev => ({ ...prev, charge: e.target.value }))}
                    className={formData.type !== 'bank' ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}
                  />
                </div>
                <Input 
                  label="Remark" 
                  value={formData.remark || ''} 
                  placeholder="Optional notes..." 
                  onChange={e => setFormData(prev => ({ ...prev, remark: e.target.value }))} 
                />
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditingOrder(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingOrder ? 'Update Order' : 'Confirm Order'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
      />
      
      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Orders"
        message={`Are you sure you want to delete ${selectedOrders.size} selected order(s)? This action cannot be undone.`}
      />
    </div>
  );
}

// --- BD Agents Component ---
function BDAgents({ token, onAgentAdded, onBulkUpload }: { token: string; onAgentAdded?: () => void; onBulkUpload?: () => void }) {
  const { bdAgents: agents } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<BDAgent | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [editingAgent, setEditingAgent] = useState<BDAgent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const initial_balance = parseFloat(formData.get('initial_balance') as string) || 0;
    const initial_balance_date = formData.get('initial_balance_date') as string;
    
    if (editingAgent) {
      store.updateBDAgent(editingAgent.id, { name, initial_balance, initial_balance_date });
    } else {
      store.addBDAgent(name, initial_balance, initial_balance_date);
    }
    setShowAdd(false);
    setEditingAgent(null);
    if (onAgentAdded) onAgentAdded();
  };

  const handleEdit = (agent: BDAgent) => {
    setEditingAgent(agent);
    setShowAdd(true);
  };

  const handleDelete = (id: number) => {
    setAgentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (agentToDelete) {
      store.deleteBDAgent(agentToDelete);
      if (onAgentAdded) onAgentAdded();
      setAgentToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const currentAgents = filteredAgents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(`BD Agent Report`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = filteredAgents.map(a => [
      a.id,
      a.name,
      a.initial_balance.toLocaleString(),
      a.initial_balance_date
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Name', 'Initial Balance', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save('bd_agents_report.pdf');
  };

  const exportToExcel = () => {
    const tableData = filteredAgents.map(a => ({
      'ID': a.id,
      'Name': a.name,
      'Initial Balance': a.initial_balance,
      'Date': a.initial_balance_date
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BD Agents');
    XLSX.writeFile(wb, 'bd_agents_report.xlsx');
  };
  
  const exportToCSV = () => {
      const csv = Papa.unparse(filteredAgents.map(a => ({
          'ID': a.id,
          'Name': a.name,
          'Initial Balance': a.initial_balance,
          'Date': a.initial_balance_date
      })));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'bd_agents_report.csv');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search BD agents..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF} className="text-xs py-1.5 whitespace-nowrap gap-2">PDF</Button>
          <Button variant="outline" onClick={exportToExcel} className="text-xs py-1.5 whitespace-nowrap gap-2">Excel</Button>
          <Button variant="outline" onClick={exportToCSV} className="text-xs py-1.5 whitespace-nowrap gap-2">CSV</Button>
          <Button variant="outline" onClick={onBulkUpload} className="text-xs py-1.5 whitespace-nowrap gap-2">
            <Download size={16} className="rotate-180" /> Bulk Upload
          </Button>
          <Button onClick={() => { setEditingAgent(null); setShowAdd(true); }} className="text-xs py-1.5 whitespace-nowrap"><Plus size={16} /> Add BD Agent</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Agent Name</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Balance (BDT)</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentAgents.map(agent => (
                <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{agent.name}</td>
                  <td className="px-2 py-2 text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {(agent.total_payments_bdt - agent.total_orders_bdt + (Number(agent.initial_balance) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1.5 items-center">
                      <button onClick={() => handleEdit(agent)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Edit Agent">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(agent.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Delete Agent">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredAgents.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                    {filteredAgents.reduce((sum, agent) => sum + (agent.total_payments_bdt - agent.total_orders_bdt + (Number(agent.initial_balance) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                  </td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAgents.length)} of {filteredAgents.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingAgent ? 'Edit BD Agent' : 'Add BD Agent'}</h2>
              <button onClick={() => { setShowAdd(false); setEditingAgent(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" label="Agent Name" placeholder="e.g. BD Express" defaultValue={editingAgent?.name} required />
                <Input name="initial_balance" label="Initial Balance (BDT)" type="number" step="0.01" placeholder="0.00" defaultValue={editingAgent?.initial_balance} />
                <Input name="initial_balance_date" label="Initial Balance Date" type="date" defaultValue={editingAgent?.initial_balance_date || new Date().toISOString().split('T')[0]} />
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditingAgent(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingAgent ? 'Update Agent' : 'Save Agent'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Agent"
        message="Are you sure you want to delete this agent? This action cannot be undone and may affect related orders and payments."
      />

      {selectedAgent && (
        <>
          <PaymentModal 
            isOpen={showPayment} 
            onClose={() => setShowPayment(false)} 
            agent={selectedAgent} 
            type="BD" 
            token={token} 
            onSuccess={() => {
              if (onAgentAdded) onAgentAdded();
            }} 
          />
          <ViewPaymentsModal 
            isOpen={showView} 
            onClose={() => setShowView(false)} 
            agent={selectedAgent} 
            type="BD" 
            token={token} 
          />
        </>
      )}
    </div>
  );
}

// --- Conversion Component ---
function ConversionTab({ token, onConversionAdded }: { token: string; onConversionAdded?: () => void }) {
  const { conversions, bdAgents, refresh } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [editingConversion, setEditingConversion] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversionToDelete, setConversionToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount_myr: '',
    rate: '',
    amount_bdt: '',
    bank_charges: '0',
    commission_enabled: false,
    pay_to_bd_agent_id: ''
  });

  const handleReload = () => {
    setIsReloading(true);
    refresh();
    setTimeout(() => setIsReloading(false), 600);
  };

  // Calculate Final Rate and Amounts
  const baseRate = parseFloat(formData.rate) || 0;
  const finalRate = formData.commission_enabled ? baseRate * 1.025 : baseRate;
  
  // Recalculate amounts when inputs change
  const handleCalc = (myr: string, rate: string, commission_enabled: boolean) => {
    const myrVal = parseFloat(myr) || 0;
    const rateVal = parseFloat(rate) || 0;
    
    // Base BDT (before commission)
    const baseBdt = myrVal * rateVal;
    
    // Commission Amount
    const commission = commission_enabled ? baseBdt * 0.025 : 0;
    
    // Total BD Received (Base + Commission)
    // This is equivalent to myr * finalRate
    const totalBdt = baseBdt + commission;

    setFormData(prev => ({ 
      ...prev, 
      amount_myr: myr, 
      rate: rate, 
      commission_enabled: commission_enabled,
      amount_bdt: baseBdt.toFixed(2) // Store Base BDT for display/reference
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // We want to store the Final Rate and Total Amount
    // But store.ts expects 'rate' and 'amount_bdt'. 
    // If we store Final Rate as 'rate', then amount_bdt should be Total Amount.
    // However, we also want to track commission.
    
    // Let's calculate the values to send to store
    const myrVal = parseFloat(formData.amount_myr);
    const rateVal = parseFloat(formData.rate); // Base Rate
    const finalRateVal = formData.commission_enabled ? rateVal * 1.025 : rateVal;
    
    // We will store the Final Rate as the 'rate' so it reflects everywhere
    // And we store the Base Amount as 'amount_bdt' to keep commission calculation consistent in store?
    // Wait, store.ts calculates commission based on amount_bdt * 0.02 if enabled.
    // If we pass Final Rate, store might miscalculate.
    
    // Let's look at store.ts addConversion logic:
    // const commission_amount = data.commission_enabled ? Number(data.amount_bdt) * 0.02 : 0;
    // const total_bd_received = Number(data.amount_bdt) + commission_amount;
    
    // So store expects 'amount_bdt' to be the Base Amount.
    // And 'rate' to be the Base Rate (implied, since amount_bdt = myr * rate).
    
    // The user wants "Final Conversion Rate" reflected everywhere.
    // If we store Base Rate in DB, we must display Final Rate in UI by calculating it.
    // Let's do that. We store Base Rate and Base Amount.
    // In the table, we display Final Rate.
    
    if (editingConversion) {
      store.updateConversion(editingConversion.id, formData);
    } else {
      store.addConversion(formData);
    }
    setShowAdd(false);
    setEditingConversion(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount_myr: '',
      rate: '',
      amount_bdt: '',
      bank_charges: '0',
      commission_enabled: false,
      pay_to_bd_agent_id: ''
    });
    if (onConversionAdded) onConversionAdded();
  };

  const handleEdit = (conv: any) => {
    setEditingConversion(conv);
    setFormData({
      date: conv.date,
      amount_myr: conv.amount_myr.toString(),
      rate: conv.rate.toString(),
      amount_bdt: conv.amount_bdt.toString(),
      bank_charges: conv.bank_charges.toString(),
      commission_enabled: conv.commission_enabled || false,
      pay_to_bd_agent_id: conv.pay_to_bd_agent_id?.toString() || ''
    });
    setShowAdd(true);
  };

  const handleDelete = (id: number) => {
    setConversionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (conversionToDelete) {
      store.deleteConversion(conversionToDelete);
      if (onConversionAdded) onConversionAdded();
      setConversionToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const commissionAmount = formData.commission_enabled && formData.amount_bdt 
    ? (parseFloat(formData.amount_bdt) * 0.02) 
    : 0;
  
  const totalBdReceived = formData.amount_bdt 
    ? parseFloat(formData.amount_bdt) + commissionAmount 
    : 0;
  
  const totalPages = Math.ceil(conversions.length / itemsPerPage);
  const currentConversions = conversions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">RM Convert</h2>
          <p className="text-xs text-slate-500">Track MYR to BDT conversions through banks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReload} className="text-xs py-1.5 h-10">
            <RefreshCw size={16} className={cn(isReloading && "animate-spin")} />
          </Button>
          <Button onClick={() => { setEditingConversion(null); setShowAdd(true); }} className="text-xs py-1.5 h-10"><Plus size={16} /> Log RM Convert</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase w-32 border-r border-slate-200 dark:border-slate-700">Date</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Total Send RM</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Final Rate</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">BD Amount</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">2.5% Commission</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Total BD Received</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Pay To</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Bank Charge</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentConversions.map(conv => {
                // Calculate Final Rate for display
                const displayRate = conv.commission_enabled ? conv.rate * 1.025 : conv.rate;
                return (
                  <tr key={conv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">{formatDate(conv.date)}</td>
                    <td className="px-2 py-2 text-xs font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{formatCurrency(conv.amount_myr)}</td>
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{displayRate.toFixed(2)}</td>
                    <td className="px-2 py-2 text-xs font-mono text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{conv.amount_bdt.toLocaleString()}</td>
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{conv.commission_enabled ? (conv.amount_bdt * 0.025).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                    <td className="px-2 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{(conv.total_bd_received || conv.amount_bdt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{bdAgents.find(a => a.id === conv.pay_to_bd_agent_id)?.name || '-'}</td>
                    <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700">{formatCurrency(conv.bank_charges)}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleEdit(conv)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Edit Conversion">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(conv.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Delete Conversion">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {conversions.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{formatCurrency(conversions.reduce((sum, c) => sum + Number(c.amount_myr), 0))}</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">-</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{conversions.reduce((sum, c) => sum + Number(c.amount_bdt), 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{conversions.reduce((sum, c) => sum + (c.commission_enabled ? Number(c.amount_bdt) * 0.025 : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-xs text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{conversions.reduce((sum, c) => sum + Number(c.total_bd_received || c.amount_bdt), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">-</td>
                  <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700">{formatCurrency(conversions.reduce((sum, c) => sum + Number(c.bank_charges), 0))}</td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, conversions.length)} of {conversions.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingConversion ? 'Edit RM Convert' : 'Log RM Convert'}</h2>
              <button onClick={() => { setShowAdd(false); setEditingConversion(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                
                <Input 
                  label="Total Send RM" 
                  type="number" 
                  step="0.01" 
                  value={formData.amount_myr} 
                  onChange={e => handleCalc(e.target.value, formData.rate, formData.commission_enabled)} 
                  required 
                />

                <Input 
                  label="Conversion Rate" 
                  type="number" 
                  step="0.01" 
                  value={formData.rate} 
                  onChange={e => handleCalc(formData.amount_myr, e.target.value, formData.commission_enabled)} 
                  required 
                />

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Final Conversion Rate</label>
                  <div className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white">
                    {finalRate.toFixed(2)}
                  </div>
                </div>

                <Input 
                  label="BDT Amount (Auto)" 
                  type="number" 
                  value={formData.amount_bdt} 
                  readOnly 
                  className="bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" 
                  required 
                />
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="commission" 
                      checked={formData.commission_enabled} 
                      onChange={e => handleCalc(formData.amount_myr, formData.rate, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-slate-900 dark:focus:ring-white"
                    />
                    <label htmlFor="commission" className="text-sm font-medium text-slate-700 dark:text-slate-300">Add 2.5% Commission</label>
                  </div>
                  
                  <div className="flex justify-between text-sm p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">Commission Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT</span>
                  </div>
                  
                  <div className="flex justify-between text-sm p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-100 dark:border-emerald-800/50">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Total BD Received:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalBdReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT</span>
                  </div>
                </div>

                <Select 
                  label="Pay To (BD Agent)" 
                  value={formData.pay_to_bd_agent_id}
                  options={[{value: '', label: 'Select Agent (Optional)'}, ...bdAgents.map(a => ({value: a.id, label: a.name}))]} 
                  onChange={e => setFormData({...formData, pay_to_bd_agent_id: e.target.value})}
                />

                <Input label="Bank Charges (RM)" type="number" step="0.01" value={formData.bank_charges} onChange={e => setFormData({...formData, bank_charges: e.target.value})} />
                
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditingConversion(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingConversion ? 'Update RM Convert' : 'Save RM Convert'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Conversion"
        message="Are you sure you want to delete this conversion record? This action cannot be undone."
      />
    </div>
  );
}

// --- Expenses Component ---
function Expenses({ token, onExpenseAdded }: { token: string; onExpenseAdded?: () => void }) {
  const { expenses } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCurrency, setActiveCurrency] = useState<'MYR' | 'BDT'>('MYR');
  const itemsPerPage = 50;

  const filteredExpenses = expenses
    .filter(e => e.currency === activeCurrency)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (editingExpense) {
      store.updateExpense(editingExpense.id, { ...data, currency: activeCurrency });
    } else {
      store.addExpense({ ...data, currency: activeCurrency });
    }
    setShowAdd(false);
    setEditingExpense(null);
    if (onExpenseAdded) onExpenseAdded();
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setShowAdd(true);
  };

  const handleDelete = (id: number) => {
    setExpenseToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      store.deleteExpense(expenseToDelete);
      if (onExpenseAdded) onExpenseAdded();
      setExpenseToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const currentExpenses = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Expenses</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Track operational costs and overheads</p>
        </div>
        <Button onClick={() => { setEditingExpense(null); setShowAdd(true); }} className="text-xs py-1.5 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"><Plus size={18} /> Add Expense</Button>
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
        <button 
          onClick={() => { setActiveCurrency('MYR'); setCurrentPage(1); }}
          className={cn(
            "px-4 py-2 text-[10px] font-bold rounded-lg transition-all",
            activeCurrency === 'MYR' 
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-slate-200/20" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Malaysia (RM)
        </button>
        <button 
          onClick={() => { setActiveCurrency('BDT'); setCurrentPage(1); }}
          className={cn(
            "px-4 py-2 text-[10px] font-bold rounded-lg transition-all",
            activeCurrency === 'BDT' 
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-slate-200/20" 
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          Bangladesh (BDT)
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase w-32 border-r border-slate-200 dark:border-slate-700">Date</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Category</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700 w-40">Amount</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700">Note</th>
                <th className="px-2 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">{formatDate(exp.date)}</td>
                  <td className="px-2 py-2 text-xs font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{exp.category}</td>
                  <td className="px-2 py-2 text-xs font-bold text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700">
                    {activeCurrency === 'MYR' ? formatCurrency(exp.amount_myr) : `${exp.amount_myr.toLocaleString()} BDT`}
                  </td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400 text-[10px] border-r border-slate-200 dark:border-slate-700">{exp.note}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => handleEdit(exp)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Edit Expense">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors" title="Delete Expense">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {expenses.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700 sticky bottom-0 z-10">
                <tr>
                  <td colSpan={2} className="px-2 py-2 text-xs text-slate-900 dark:text-white text-right border-r border-slate-200 dark:border-slate-700">TOTAL:</td>
                  <td className="px-2 py-2 text-xs text-red-600 dark:text-red-400 border-r border-slate-200 dark:border-slate-700">
                    {activeCurrency === 'MYR' 
                      ? formatCurrency(filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount_myr), 0))
                      : `${filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount_myr), 0).toLocaleString()} BDT`
                    }
                  </td>
                  <td className="px-2 py-2 border-r border-slate-200 dark:border-slate-700"></td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, expenses.length)} of {expenses.length} entries
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button onClick={() => { setShowAdd(false); setEditingExpense(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="date" label="Date" type="date" defaultValue={editingExpense?.date || new Date().toISOString().split('T')[0]} required />
                <Select label="Category" defaultValue={editingExpense?.category} options={[
                  {value: 'Rent', label: 'Rent'},
                  {value: 'Transportation', label: 'Transportation'},
                  {value: 'Incentives', label: 'Incentives'},
                  {value: 'Bad Debt', label: 'Bad Debt'},
                  {value: 'Other', label: 'Other'}
                ]} name="category" required />
                <Input name="amount_myr" label={`Amount (${activeCurrency})`} type="number" step="0.01" defaultValue={editingExpense?.amount_myr} required />
                <Input name="note" label="Note" placeholder="Optional description" defaultValue={editingExpense?.note} />
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setEditingExpense(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
      />
    </div>
  );
}

// --- Loan Component ---
interface LoanEntity {
  id: number;
  name: string;
}

interface LoanTransaction {
  id: number;
  loanId: number;
  date: string;
  description: string;
  drAmount: string;
  crAmount: string;
}

function LoanPage() {
  const [loans, setLoans] = useState<LoanEntity[]>(() => {
    const saved = localStorage.getItem('demo_loans');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<LoanTransaction[]>(() => {
    const saved = localStorage.getItem('demo_loan_tx');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeLoan, setActiveLoan] = useState<LoanEntity | null>(null);

  // General States
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [loanName, setLoanName] = useState('');
  
  // Ledger states
  const [isExport, setIsExport] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<LoanTransaction | null>(null);
  const [addTxData, setAddTxData] = useState({ date: new Date().toISOString().split('T')[0], description: '', drAmount: '', crAmount: '' });

  useEffect(() => {
    localStorage.setItem('demo_loans', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem('demo_loan_tx', JSON.stringify(transactions));
  }, [transactions]);

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName.trim()) return;
    setLoans([...loans, { id: Date.now(), name: loanName }]);
    setLoanName('');
    setShowAddLoan(false);
  };
  
  const handleDeleteLoan = (id: number) => {
    if (confirm('Are you sure you want to delete this loan and all its transactions?')) {
      setLoans(loans.filter(l => l.id !== id));
      setTransactions(transactions.filter(t => t.loanId !== id));
    }
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoan) return;
    if (editingTx) {
      setTransactions(transactions.map(t => t.id === editingTx.id ? {
        ...t,
        date: addTxData.date,
        description: addTxData.description,
        drAmount: addTxData.drAmount,
        crAmount: addTxData.crAmount
      } : t));
    } else {
      setTransactions([...transactions, {
        id: Date.now(),
        loanId: activeLoan.id,
        date: addTxData.date,
        description: addTxData.description,
        drAmount: addTxData.drAmount,
        crAmount: addTxData.crAmount
      }]);
    }
    setShowAddTx(false);
    setEditingTx(null);
    setAddTxData({ date: new Date().toISOString().split('T')[0], description: '', drAmount: '', crAmount: '' });
  };
  
  const handleEditTx = (t: LoanTransaction) => {
    setEditingTx(t);
    setAddTxData({
      date: t.date,
      description: t.description,
      drAmount: t.drAmount,
      crAmount: t.crAmount
    });
    setShowAddTx(true);
  };
  
  const handleDeleteTx = (id: number) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const exportToPDF = () => {
    if (!activeLoan) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(`Loan Ledger: ${activeLoan.name}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    let balance = 0;
    const tableData = transactions.filter(t => t.loanId === activeLoan.id).map(t => {
      const dr = parseFloat(t.drAmount) || 0;
      const cr = parseFloat(t.crAmount) || 0;
      balance += (dr - cr);
      return [
        t.date,
        t.description,
        t.drAmount || '-',
        t.crAmount || '-',
        balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Description', 'Cr Amount', 'Dr Amount', 'Balance']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`loan_ledger_${activeLoan.name}.pdf`);
  };

  const exportToExcel = () => {
    if (!activeLoan) return;
    let balance = 0;
    const tableData = transactions.filter(t => t.loanId === activeLoan.id).map(t => {
      const dr = parseFloat(t.drAmount) || 0;
      const cr = parseFloat(t.crAmount) || 0;
      balance += (dr - cr);
      return {
        'Date': t.date,
        'Description': t.description,
        'Cr Amount': t.drAmount,
        'Dr Amount': t.crAmount,
        'Balance': balance.toFixed(2)
      };
    });

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loan Ledger');
    XLSX.writeFile(wb, `loan_ledger_${activeLoan.name}.xlsx`);
  };

  const exportToJPG = async () => {
    setIsExport(true);
    await new Promise(r => setTimeout(r, 100));

    const element = document.getElementById('loan-ledger-content');
    if (element) {
      try {
        const width = element.scrollWidth;
        const height = element.scrollHeight;
        const dataUrl = await toJpeg(element, {
          backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          pixelRatio: 2,
          width,
          height,
          style: { overflow: 'visible', height: height + 'px', width: width + 'px' }
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `loan_ledger_${activeLoan?.name}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExport(false);
      }
    } else {
      setIsExport(false);
    }
  };

  if (activeLoan) {
    const loanTxs = transactions.filter(t => t.loanId === activeLoan.id);
    let runningBalance = 0;
    
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveLoan(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <Plus className="rotate-45 w-6 h-6" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Loan Ledger: {activeLoan.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Detailed transaction statement.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToPDF}><FileText size={16}/> Export PDF</Button>
            <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToExcel}><FileText size={16}/> Export Excel</Button>
            <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToJPG}><FileText size={16}/> Export JPG</Button>
          </div>
        </div>

        <Card id="loan-ledger-content" className={cn("p-6", isExport ? "rounded-none border-0 shadow-none m-0 max-w-4xl" : "")}>
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">LOAN LEDGER</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{activeLoan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generated On</p>
              <p className="text-sm font-mono text-slate-900 dark:text-white">{new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className={cn(isExport ? "" : "overflow-x-auto")}>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 w-32">Date</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Description</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">Cr Amount</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">Dr Amount</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">Balance</th>
                  {!isExport && <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loanTxs.map((t) => {
                  const dr = parseFloat(t.drAmount) || 0;
                  const cr = parseFloat(t.crAmount) || 0;
                  runningBalance += (dr - cr);
                  return (
                    <tr key={t.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500">{t.date}</td>
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white">{t.description || '-'}</td>
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white text-right">{t.drAmount || '-'}</td>
                      <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white text-right">{t.crAmount || '-'}</td>
                      <td className={cn("px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-right", runningBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {!isExport && (
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleEditTx(t)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 rounded-md transition-colors flex justify-center">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDeleteTx(t.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 rounded-md transition-colors flex justify-center">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {loanTxs.length === 0 && (
                  <tr>
                    <td colSpan={isExport ? 5 : 6} className="px-4 py-8 text-center text-slate-500 text-xs text-muted-foreground">No transactions found for this loan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {!isExport && (
            <div className="mt-4 flex justify-end items-center">
              <Button onClick={() => setShowAddTx(true)} variant="outline" className="text-xs py-1.5 h-8 gap-1"><Plus size={14}/> Add Row</Button>
            </div>
          )}
        </Card>

        {showAddTx && (
          <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
            <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h2>
                <button onClick={() => { setShowAddTx(false); setEditingTx(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
              </div>
              <Card className="p-6">
                <form onSubmit={handleAddTx} className="space-y-4">
                  <Input label="Date" type="date" value={addTxData.date} onChange={(e) => setAddTxData({...addTxData, date: e.target.value})} required />
                  <Input label="Description" value={addTxData.description} onChange={(e) => setAddTxData({...addTxData, description: e.target.value})} />
                  <Input label="Cr Amount" type="number" step="any" value={addTxData.drAmount} onChange={(e) => setAddTxData({...addTxData, drAmount: e.target.value})} placeholder="0.00" />
                  <Input label="Dr Amount" type="number" step="any" value={addTxData.crAmount} onChange={(e) => setAddTxData({...addTxData, crAmount: e.target.value})} placeholder="0.00" />
                  <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <Button variant="outline" className="flex-1" onClick={() => { setShowAddTx(false); setEditingTx(null); }} type="button">Cancel</Button>
                    <Button type="submit" className="flex-1">{editingTx ? 'Update' : 'Save'}</Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Loans</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage individual loans and ledgers.</p>
        </div>
        <Button onClick={() => setShowAddLoan(true)} className="text-xs py-1.5 h-10 gap-2"><Plus size={16}/> Add Loan</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Name</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">Current Balance</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loans.map(loan => {
                const loanTxs = transactions.filter(t => t.loanId === loan.id);
                const balance = loanTxs.reduce((sum, t) => sum + (parseFloat(t.drAmount) || 0) - (parseFloat(t.crAmount) || 0), 0);
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">{loan.name}</td>
                    <td className={cn("px-4 py-3 text-sm font-bold text-right border-r border-slate-200 dark:border-slate-700", balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setActiveLoan(loan)} className="px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded shadow-sm transition-colors">
                          <Eye size={14} /> View Ledger
                        </button>
                        <button onClick={() => handleDeleteLoan(loan.id)} className="p-1 px-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Delete Loan">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm text-muted-foreground">No loans found. Create one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddLoan && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Loan</h2>
              <button onClick={() => setShowAddLoan(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={handleAddLoan} className="space-y-4">
                <Input label="Person or Entity Name" value={loanName} onChange={(e) => setLoanName(e.target.value)} required placeholder="e.g. John Doe" />
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddLoan(false)} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">Save</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Calculation Component ---
function CalculationPage() {
  const [isExport, setIsExport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [addFormData, setAddFormData] = useState({ bdTk: '', rate: '', payment: '', lastDue: '' });
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('demo_calculation_rows');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved calculation rows");
      }
    }
    return [{ id: Date.now(), bdTk: '', rate: '', payment: '', lastDue: '' }];
  });

  useEffect(() => {
    localStorage.setItem('demo_calculation_rows', JSON.stringify(rows));
  }, [rows]);

  const submitRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRowId) {
      setRows(rows.map(r => r.id === editingRowId ? {
        ...r,
        bdTk: addFormData.bdTk,
        rate: addFormData.rate,
        payment: addFormData.payment,
        lastDue: addFormData.lastDue
      } : r));
    } else {
      setRows([...rows, {
        id: Date.now(),
        bdTk: addFormData.bdTk,
        rate: addFormData.rate,
        payment: addFormData.payment,
        lastDue: addFormData.lastDue
      }]);
    }
    setShowAddModal(false);
    setEditingRowId(null);
    setAddFormData({ bdTk: '', rate: '', payment: '', lastDue: '' });
  };

  const handleEditRowClick = (r: any) => {
    setEditingRowId(r.id);
    setAddFormData({
      bdTk: r.bdTk,
      rate: r.rate,
      payment: r.payment,
      lastDue: r.lastDue
    });
    setShowAddModal(true);
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const clearAll = () => {
    setRows([{ id: Date.now(), bdTk: '', rate: '', payment: '', lastDue: '' }]);
  };

  let runningBalance = 0;
  const calculatedRows = rows.map((r, index) => {
    const bdTk = parseFloat(r.bdTk) || 0;
    const rate = parseFloat(r.rate) || 0;
    const payment = parseFloat(r.payment) || 0;
    
    // Last Due logic: User enters it manually to override, or else inherits from runningBalance
    const parsedLastDue = parseFloat(r.lastDue);
    const lastDue = !isNaN(parsedLastDue) ? parsedLastDue : (index === 0 ? 0 : runningBalance);
    
    // BD TK / Rate = RM
    const rm = rate > 0 ? (bdTk / rate) : 0;
    
    // RM + Last Due - Payment = Balance
    const balance = rm + lastDue - payment;
    runningBalance = balance;
    
    return {
      ...r,
      sl: index + 1,
      lastDue,
      rm,
      balance
    };
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(`Juel Money Transfer Apps: Calculation Report`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = calculatedRows.map(r => [
      r.sl,
      r.bdTk || '-',
      r.rate || '-',
      r.rm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      r.payment || '-',
      r.lastDue || '-',
      r.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['SL', 'BD TK', 'Rate', 'RM', 'Payment', 'Last Due', 'Balance']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save('calculation_report.pdf');
  };

  const exportToExcel = () => {
    const tableData = calculatedRows.map(r => ({
      'SL': r.sl,
      'BD TK': r.bdTk,
      'Rate': r.rate,
      'RM': r.rm.toFixed(2),
      'Payment': r.payment,
      'Last Due': r.lastDue,
      'Balance': r.balance.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calculations');
    XLSX.writeFile(wb, 'calculation_report.xlsx');
  };

  const exportToJPG = async () => {
    setIsExport(true);
    await new Promise(r => setTimeout(r, 100));

    const element = document.getElementById('calculation-content');
    if (element) {
      try {
        const width = element.scrollWidth;
        const height = element.scrollHeight;
        const dataUrl = await toJpeg(element, {
          backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          pixelRatio: 2,
          width,
          height,
          style: { overflow: 'visible', height: height + 'px', width: width + 'px' }
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'calculation_report.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExport(false);
      }
    } else {
      setIsExport(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Calculator</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Custom RM and Balance calculations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToPDF}><FileText size={16}/> Export PDF</Button>
          <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToExcel}><FileText size={16}/> Export Excel</Button>
          <Button variant="outline" className="text-xs py-1.5 h-10 gap-2" onClick={exportToJPG}><FileText size={16}/> Export JPG</Button>
        </div>
      </div>

      <Card id="calculation-content" className={cn("p-6", isExport ? "rounded-none border-0 shadow-none m-0 max-w-4xl" : "")}>
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">CALCULATION REPORT</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Juel Money Transfer Apps</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generated On</p>
            <p className="text-sm font-mono text-slate-900 dark:text-white">{new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className={cn(isExport ? "" : "overflow-x-auto")}>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 w-12 text-center">SL</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">BD TK</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 w-24">Rate</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">RM</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Payment</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700">Last Due</th>
                <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 text-right">Balance</th>
                {!isExport && <th className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculatedRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 text-center">{r.sl}</td>
                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                    <div className="text-xs px-2 py-1 text-slate-900 dark:text-white">{r.bdTk || '-'}</div>
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                    <div className="text-xs px-2 py-1 text-slate-900 dark:text-white">{r.rate || '-'}</div>
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 text-right bg-slate-50/50 dark:bg-slate-800/50">
                    {r.rm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                    <div className="text-xs px-2 py-1 text-slate-900 dark:text-white">{r.payment || '-'}</div>
                  </td>
                  <td className="px-1 py-1 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 relative">
                    <div className="text-xs px-2 py-1 text-slate-900 dark:text-white text-right font-medium">{r.lastDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</div>
                  </td>
                  <td className={cn("px-3 py-2 border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-right bg-slate-50/50 dark:bg-slate-800/50", r.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {r.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {!isExport && (
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEditRowClick(r)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 rounded-md transition-colors flex justify-center">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => removeRow(r.id)} disabled={rows.length === 1} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 rounded-md transition-colors disabled:opacity-30 flex justify-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isExport && (
          <div className="mt-4 flex justify-between items-center">
            <Button onClick={clearAll} variant="outline" className="text-xs py-1.5 h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/30 dark:hover:bg-red-900/20"><Trash2 size={14}/> Clear All</Button>
            <Button onClick={() => setShowAddModal(true)} variant="outline" className="text-xs py-1.5 h-8 gap-1"><Plus size={14}/> Add Row</Button>
          </div>
        )}
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 overflow-y-auto">
          <div className="max-w-xl mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingRowId ? 'Edit Calculation Row' : 'Add Calculation Row'}</h2>
              <button onClick={() => { setShowAddModal(false); setEditingRowId(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><Plus className="rotate-45 w-6 h-6 text-slate-600 dark:text-slate-400" /></button>
            </div>
            <Card className="p-6">
              <form onSubmit={submitRow} className="space-y-4">
                <Input label="BD TK" type="number" step="any" value={addFormData.bdTk} onChange={(e) => setAddFormData({...addFormData, bdTk: e.target.value})} placeholder="0.00" />
                <Input label="Rate" type="number" step="any" value={addFormData.rate} onChange={(e) => setAddFormData({...addFormData, rate: e.target.value})} placeholder="0.00" />
                <Input label="Payment" type="number" step="any" value={addFormData.payment} onChange={(e) => setAddFormData({...addFormData, payment: e.target.value})} placeholder="0.00" />
                <Input label="Last Due" type="number" step="any" value={addFormData.lastDue} onChange={(e) => setAddFormData({...addFormData, lastDue: e.target.value})} placeholder="0.00" helpText="Overrides the running balance for this row if provided." />
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <Button variant="outline" className="flex-1" onClick={() => { setShowAddModal(false); setEditingRowId(null); }} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1">{editingRowId ? 'Update Row' : 'Add Row'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Reports Component ---
function Reports({ token, stats, initialFilters }: { token: string; stats: any; initialFilters?: any }) {
  const { myAgents, bdAgents } = useAppStore();
  const [reportType, setReportType] = useState('summary');
  const [filterMYAgent, setFilterMYAgent] = useState('');
  const [filterBDAgent, setFilterBDAgent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (initialFilters) {
      setReportType(initialFilters.type || 'summary');
      setFilterMYAgent(initialFilters.my_agent_id || '');
      setFilterBDAgent(initialFilters.bd_agent_id || '');
    } else {
      setReportType('summary');
      setFilterMYAgent('');
      setFilterBDAgent('');
    }
  }, [initialFilters]);

  useEffect(() => {
    setCurrentPage(1);
    handleReload();
  }, [reportType, filterMYAgent, filterBDAgent, startDate, endDate, stats]);

  const handleReload = async () => {
    setLoading(true);
    setIsReloading(true);
    try {
      const params = {
        type: reportType,
        my_agent_id: filterMYAgent === 'all' ? '' : filterMYAgent,
        bd_agent_id: filterBDAgent === 'all' ? '' : filterBDAgent,
        start_date: startDate,
        end_date: endDate
      };
      setReportData(store.getReports(params));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsReloading(false), 600);
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    
    const agentName = filterMYAgent ? myAgents.find(a => a.id.toString() === filterMYAgent.toString())?.name : 
                    filterBDAgent ? bdAgents.find(a => a.id.toString() === filterBDAgent.toString())?.name : 
                    (filterMYAgent === '' && filterBDAgent === '') ? 'All Agents' : 
                    (filterMYAgent === '' ? 'All MY Agents' : 'All BD Agents');

    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(`Juel Money Transfer Apps Report: ${reportType.replace('_', ' ').toUpperCase()}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Sender Name: ${agentName}`, 14, 34);
    doc.text(`Period: ${startDate ? formatDate(startDate) : 'Beginning'} — ${endDate ? formatDate(endDate) : 'Present'}`, 14, 40);
    
    if (reportType === 'summary') {
      if (!reportData.summary) return;
      const { summary } = reportData;
      const data = [
        ['Total Orders', summary.order_count],
        ['Order Volume (RM)', formatCurrency(summary.total_myr_orders)],
        ['Total Conversion (RM)', formatCurrency(summary.total_myr_converted)],
        ['Total Expenses (RM)', formatCurrency(summary.total_expenses)],
        ['Bank Charges (RM)', formatCurrency(summary.total_charges)],
        ['Avg Rate', summary.avg_rate?.toFixed(2)]
      ];
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
      });
    } else {
      if (!reportData.data || !reportData.columns) return;
      const { data, columns } = reportData;
      
      const columnTotals = columns.map((col: string, index: number) => {
        if (index === 0) return 'TOTAL';
        if (reportType === 'ledger' && col === 'Rate') return '';
        if (reportType === 'ledger' && col === 'Balance') {
          if (data.length === 0) return '';
          const lastRow = data[data.length - 1];
          const balance = Object.values(lastRow)[index];
          return typeof balance === 'number' ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        }
        
        let sum = 0;
        let hasNumeric = false;
        data.forEach((row: any) => {
          const val = Object.values(row)[index];
          if (typeof val === 'number') {
            sum += val;
            hasNumeric = true;
          }
        });
        return hasNumeric ? sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
      });

      const bodyData = data.map((row: any) => Object.values(row).map((val: any) => 
        typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val
      ));

      autoTable(doc, {
        startY: 50,
        head: [columns],
        body: bodyData,
        foot: [columnTotals],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        didParseCell: (data) => {
          if (data.section === 'foot') {
            data.cell.styles.fillColor = [15, 23, 42];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
    }
    doc.save(`remitflow_${reportType}_report.pdf`);
  };

  const exportToJPG = async () => {
    const element = document.getElementById('report-content-export') || document.getElementById('report-content');
    if (element) {
      try {
        // Ensure the element is visible for capture if it was hidden
        const isHidden = element.parentElement?.classList.contains('hidden');
        if (isHidden) {
          element.parentElement?.classList.remove('hidden');
          element.parentElement?.style.setProperty('position', 'absolute');
          element.parentElement?.style.setProperty('left', '-9999px');
          element.parentElement?.style.setProperty('display', 'block');
        }

        // Get the full dimensions
        const width = element.scrollWidth;
        const height = element.scrollHeight;

        const dataUrl = await toJpeg(element, {
          backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
          pixelRatio: 2,
          width: width,
          height: height,
          style: {
            overflow: 'visible',
            height: height + 'px',
            width: width + 'px'
          }
        });

        // Restore hidden state
        if (isHidden) {
          element.parentElement?.classList.add('hidden');
          element.parentElement?.style.removeProperty('position');
          element.parentElement?.style.removeProperty('left');
          element.parentElement?.style.removeProperty('display');
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `remitflow_${reportType}_report.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export JPG. Please try again.');
      }
    }
  };

  const exportToExcel = () => {
    console.log('Exporting to Excel...', reportData);
    if (!reportData) return;
    let ws;
    if (reportType === 'summary') {
      if (!reportData.summary) return;
      const { summary } = reportData;
      const data = [{
        'Total Orders': summary.order_count,
        'Order Volume (RM)': summary.total_myr_orders.toFixed(2),
        'Total Conversion (RM)': summary.total_myr_converted.toFixed(2),
        'Total Expenses (RM)': summary.total_expenses.toFixed(2),
        'Bank Charges (RM)': summary.total_charges.toFixed(2),
        'Avg Rate': summary.avg_rate?.toFixed(2)
      }];
      ws = XLSX.utils.json_to_sheet(data);
    } else {
      if (!reportData.data || !reportData.columns) return;
      const { data, columns } = reportData;
      
      const columnTotals = columns.map((col: string, index: number) => {
        if (index === 0) return 'TOTAL';
        if (reportType === 'ledger' && col === 'Rate') return '';
        if (reportType === 'ledger' && col === 'Balance') {
          if (data.length === 0) return '';
          const lastRow = data[data.length - 1];
          const balance = Object.values(lastRow)[index];
          return typeof balance === 'number' ? balance.toFixed(2) : '';
        }

        let sum = 0;
        let hasNumeric = false;
        data.forEach((row: any) => {
          const val = Object.values(row)[index];
          if (typeof val === 'number') {
            sum += val;
            hasNumeric = true;
          }
        });
        return hasNumeric ? sum.toFixed(2) : '';
      });

      const exportData = data.map((row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach((key, i) => {
          const val = Object.values(row)[i];
          newRow[columns[i]] = typeof val === 'number' ? val.toFixed(2) : val;
        });
        return newRow;
      });

      if (data.length > 0) {
        const totalRow: any = {};
        columns.forEach((col: string, i: number) => {
          totalRow[col] = columnTotals[i];
        });
        exportData.push(totalRow);
      }

      ws = XLSX.utils.json_to_sheet(exportData);

      // Apply styling to the total row in Excel
      if (data.length > 0) {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const lastRowIndex = range.e.r;
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "0F172A" }, patternType: "solid" },
              alignment: { vertical: "center", horizontal: "left" }
            };
          }
        }
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    // Use robust download method for better compatibility
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `remitflow_${reportType}_report.xlsx`);
    console.log('Download triggered');
  };

  const renderSummary = () => {
    if (!reportData || !reportData.summary) return null;
    const { summary } = reportData;
    const breakdown = summary.profitBreakdown;
    const grossProfit = breakdown?.grossProfit || 0;
    const netProfit = breakdown?.netProfit || 0;

    return (
      <div id="report-content" className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl">
        <Card className="p-4 flex flex-col justify-between border-emerald-100 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-900/30">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-md"><Wallet className="text-indigo-600 dark:text-indigo-400" size={18} /></div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-full">Profit</span>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Net Profit Breakdown</h3>
          <div className="mt-2 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total BDT Order:</span>
              <span className="font-mono text-slate-900 dark:text-white">{(breakdown?.totalBdtOrder || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total RM Order:</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(breakdown?.totalRmOrder || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Ave. RM Convert Rate:</span>
              <span className="font-mono text-slate-900 dark:text-white">{breakdown?.avgConvertRate?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Converted RM:</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(breakdown?.totalConvertedRm || 0)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-600 dark:text-slate-300">Gross Profit:</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(breakdown?.grossProfit || 0)}</span>
            </div>
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>(-) Bank Charge:</span>
              <span className="font-mono">{formatCurrency(breakdown?.bankCharges || 0)}</span>
            </div>
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>(-) Expense:</span>
              <span className="font-mono">{formatCurrency(breakdown?.expenses || 0)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
            <div className="flex justify-between font-bold text-xs">
              <span className="text-slate-900 dark:text-white underline decoration-double underline-offset-2">Net Profit:</span>
              <span className={cn("font-mono", (breakdown?.netProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {formatCurrency(breakdown?.netProfit || 0)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Volume Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Order Volume</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(summary.total_myr_orders || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Total Conversion</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(summary.total_myr_converted || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Avg. Conversion Rate</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {summary.total_myr_converted > 0 
                  ? (summary.total_bdt_converted / summary.total_myr_converted).toFixed(2) 
                  : '0.00'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Quick Stats</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Total Orders</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{summary.order_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Bank Charges</span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.total_charges || 0)}</span>
            </div>
          </div>
        </Card>

        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        </div>
      </div>
    );
  };

  const renderTableReport = (isExport = false) => {
    if (!reportData || !reportData.data) return null;
    const { data, columns } = reportData;

    const columnTotals = columns.map((col: string, index: number) => {
      if (index === 0) return 'TOTAL';
      if ((reportType === 'ledger' || reportType === 'collection') && col === 'Rate') return '';
      if ((reportType === 'ledger' || reportType === 'collection') && col === 'Balance') {
        if (data.length === 0) return '';
        const lastRow = data[data.length - 1];
        const balance = Object.values(lastRow)[index];
        return typeof balance === 'number' ? balance : '';
      }
      
      let sum = 0;
      let hasNumeric = false;
      
      data.forEach((row: any) => {
        const rowValues = Object.values(row);
        const val = rowValues[index];
        if (typeof val === 'number') {
          sum += val;
          hasNumeric = true;
        }
      });
      
      // Fix floating point precision for the sum
      return hasNumeric ? Number(sum.toFixed(2)) : '';
    });

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const currentData = isExport ? data : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const agentName = filterMYAgent ? myAgents.find(a => a.id.toString() === filterMYAgent.toString())?.name : 
                    filterBDAgent ? bdAgents.find(a => a.id.toString() === filterBDAgent.toString())?.name : 
                    (filterMYAgent === '' && filterBDAgent === '') ? 'All Agents' : 
                    (filterMYAgent === '' ? 'All MY Agents' : 'All BD Agents');

    return (
      <div id={isExport ? "report-content-export" : "report-content"} className={cn("space-y-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800", isExport && "w-fit min-w-full")}>
        <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {reportType.replace('_', ' ').toUpperCase()} REPORT
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Juel Money Transfer Apps
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Financial Management System
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generated On</p>
              <p className="text-sm font-mono text-slate-900 dark:text-white">{new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sender Name</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{agentName}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Period</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                {startDate ? formatDate(startDate) : 'Beginning'} — {endDate ? formatDate(endDate) : 'Present'}
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-none bg-transparent">
          <div className={cn(isExport ? "" : "overflow-x-auto")}>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {columns.map((col: string) => (
                    <th key={col} className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700 last:border-r-0">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentData.length > 0 ? currentData.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {Object.values(row).map((val: any, j: number) => {
                      const colName = columns[j];
                      return (
                        <td key={j} className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 last:border-r-0 whitespace-nowrap">
                          {typeof val === 'number' ? (
                            <span className={cn(
                              reportType === 'daily_financial' && j === 6 ? (val >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold") : "",
                              (reportType === 'ledger' || reportType === 'collection') && colName === 'Debit' ? "text-red-600 dark:text-red-400 font-medium" : "",
                              (reportType === 'ledger' || reportType === 'collection') && colName === 'Credit' ? "text-emerald-600 dark:text-emerald-400 font-medium" : "",
                              (reportType === 'ledger' || reportType === 'collection') && colName === 'Withdraw' ? "text-red-600 dark:text-red-400 font-medium" : "",
                              (reportType === 'ledger' || reportType === 'collection') && colName.includes('Collection') ? "text-emerald-600 dark:text-emerald-400 font-medium" : "",
                              (reportType === 'ledger' || reportType === 'collection') && colName === 'Balance' ? "font-bold text-slate-900 dark:text-white" : ""
                            )}>
                              {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            colName.toLowerCase().includes('date') ? formatDate(val as string) : val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 text-xs italic">No data found for this report period.</td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot className="bg-slate-900 dark:bg-slate-950 text-white font-bold">
                  <tr>
                    {columnTotals.map((total: any, i: number) => (
                      <td key={i} className="px-3 py-3 text-xs border-r border-slate-800 last:border-r-0">
                        {typeof total === 'number' ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : total}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {!isExport && totalPages > 1 && (
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} entries
            </div>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Financial Reports</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Detailed insights into your business performance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReload} className="text-xs py-1.5 h-10">
            <RefreshCw size={16} className={cn(isReloading && "animate-spin")} />
          </Button>
          <Button variant="outline" className="text-xs py-1.5 h-10" onClick={exportToPDF}>Export PDF (.pdf)</Button>
          <Button variant="outline" className="text-xs py-1.5 h-10" onClick={exportToExcel}>Export Excel (.xlsx)</Button>
          <Button variant="outline" className="text-xs py-1.5 h-10" onClick={exportToJPG}>Export JPG (.jpg)</Button>
        </div>
      </div>

      <Card className="p-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <Select 
            label="Report Type" 
            value={reportType}
            onChange={e => setReportType(e.target.value)}
            options={[
              {value: 'summary', label: 'Profit Summary'},
              {value: 'daily_financial', label: 'Daily Financial Report'},
              {value: 'orders', label: 'Order Report'},
              {value: 'payments', label: 'Payment Report'},
              {value: 'expenses', label: 'Expense Report'},
              {value: 'conversions', label: 'Conversion Report'},
              {value: 'outstanding', label: 'Outstanding Report'},
              {value: 'collection', label: 'Collection Report'},
              {value: 'ledger', label: 'Agent Ledger'}
            ]} 
          />
          <SearchableSelect 
            label="MY Agent" 
            value={filterMYAgent}
            onChange={val => setFilterMYAgent(val)}
            options={[{value: '', label: 'Blank'}, {value: 'all', label: 'All MY Agents'}, ...myAgents.map(a => ({value: a.id, label: a.name}))]} 
          />
          <SearchableSelect 
            label="BD Agent" 
            value={filterBDAgent}
            onChange={val => setFilterBDAgent(val)}
            options={[{value: '', label: 'Blank'}, {value: 'all', label: 'All BD Agents'}, ...bdAgents.map(a => ({value: a.id, label: a.name}))]} 
          />
          <Input 
            label="Start Date" 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <Input 
            label="End Date" 
            type="date" 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">Generating report...</div>
      ) : (
        <>
          <div className="mt-6">
            {reportType === 'summary' ? renderSummary() : renderTableReport()}
          </div>
          
          {/* Hidden full report for export */}
          <div className="hidden">
            {reportType !== 'summary' && renderTableReport(true)}
          </div>
        </>
      )}
    </div>
  );
}
